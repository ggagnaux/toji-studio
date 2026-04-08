import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

import { restoreEnv, startTestServer, createAuthenticatedHeaders } from "./helpers.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=";

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

async function authHeaders(server, json = true) {
  return createAuthenticatedHeaders(server.baseUrl, { json });
}

function createImageBlob() {
  return new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], { type: "image/png" });
}

test.afterEach(() => {
  restoreEnv();
});

test("multi-series routes accept writes, expose read payloads, and keep legacy series compatibility", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-multi-series-routes-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    for (const row of [
      { slug: "night-forms", name: "Night Forms" },
      { slug: "signal-bloom", name: "Signal Bloom" }
    ]) {
      const res = await fetch(`${server.baseUrl}/api/admin/series/${row.slug}`, {
        method: "PUT",
        headers: await authHeaders(server),
        body: JSON.stringify({ name: row.name, isPublic: true })
      });
      assert.equal(res.status, 200);
    }

    const uploadForm = new FormData();
    uploadForm.append("files", createImageBlob(), "Multi Series.png");
    uploadForm.append("seriesSlugs", JSON.stringify(["night-forms", "signal-bloom"]));
    uploadForm.append("status", "published");
    uploadForm.append("tags", "editorial, geometry");

    const uploadRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: await authHeaders(server, false),
      body: uploadForm
    });
    const uploadBody = await uploadRes.json();
    assert.equal(uploadRes.status, 200);
    assert.equal(uploadBody.created.length, 1);
    const created = uploadBody.created[0];
    assert.equal(created.series, "Night Forms");
    assert.deepEqual(created.seriesSlugs, ["night-forms", "signal-bloom"]);

    const adminListRes = await fetch(`${server.baseUrl}/api/admin/artworks`, {
      headers: await authHeaders(server, false)
    });
    const adminList = await adminListRes.json();
    const listed = adminList.find((row) => row.id === created.id);
    assert.deepEqual(listed.seriesSlugs, ["night-forms", "signal-bloom"]);

    const patchRes = await fetch(`${server.baseUrl}/api/admin/artworks/${created.id}`, {
      method: "PATCH",
      headers: await authHeaders(server),
      body: JSON.stringify({ seriesSlugs: ["signal-bloom"] })
    });
    const patched = await patchRes.json();
    assert.equal(patchRes.status, 200);
    assert.equal(patched.series, "Signal Bloom");
    assert.deepEqual(patched.seriesSlugs, ["signal-bloom"]);

    const publicArtworkRes = await fetch(`${server.baseUrl}/api/public/artworks/${created.id}`);
    const publicArtwork = await publicArtworkRes.json();
    assert.equal(publicArtworkRes.status, 200);
    assert.equal(publicArtwork.series, "Signal Bloom");
    assert.deepEqual(publicArtwork.seriesSlugs, ["signal-bloom"]);

    const publicSeriesRes = await fetch(`${server.baseUrl}/api/public/series`);
    const publicSeries = await publicSeriesRes.json();
    const counts = Object.fromEntries(publicSeries.map((row) => [row.slug, row.publishedCount]));
    assert.equal(counts["signal-bloom"], 1);
    assert.equal(counts["night-forms"], 0);
  } finally {
    await server.close();
  }
});

test("multi-series writes reject unknown series slugs", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-multi-series-validation-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    const createSeriesRes = await fetch(`${server.baseUrl}/api/admin/series/night-forms`, {
      method: "PUT",
      headers: await authHeaders(server),
      body: JSON.stringify({ name: "Night Forms", isPublic: true })
    });
    assert.equal(createSeriesRes.status, 200);

    const uploadForm = new FormData();
    uploadForm.append("files", createImageBlob(), "Validation.png");
    const uploadRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: await authHeaders(server, false),
      body: uploadForm
    });
    const uploadBody = await uploadRes.json();
    const artworkId = uploadBody.created[0].id;

    const patchRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artworkId}`, {
      method: "PATCH",
      headers: await authHeaders(server),
      body: JSON.stringify({ seriesSlugs: ["missing-series"] })
    });
    const patchBody = await patchRes.json();
    assert.equal(patchRes.status, 400);
    assert.match(String(patchBody.error || ""), /unknown series slug/i);
  } finally {
    await server.close();
  }
});