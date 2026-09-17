import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer, createAuthenticatedHeaders } from "./helpers.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=";

async function authHeaders(server) {
  return createAuthenticatedHeaders(server.baseUrl, { json: false });
}

function createImageBlob() {
  return new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], { type: "image/png" });
}

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

test.afterEach(() => {
  restoreEnv();
});

test("JSON upload matches filenames, merges atomic tags, reports unmatched records and cleans failed images", async () => {
  process.env.TOJI_STORAGE_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "toji-json-upload-"));
  process.env.ADMIN_PASSWORD = "secret-pass";
  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);
  try {
    const form = new FormData();
    form.append("files", createImageBlob(), "JSON Artwork.png");
    form.append("files", new Blob(["broken image"]), "Broken JSON.png");
    form.append("tags", "series|orbs");
    form.append("metadata", new Blob([JSON.stringify([
      { imageFilename: "json artwork.PNG", title: "Imported title", description: "Imported description", hierarchicalSubjects: ["series|Orbs", "darktable|format|jpg", "series|Orbs"] },
      { imageFilename: "Broken JSON.png", title: "Must not persist", hierarchicalSubjects: ["failed|tag"] },
      { imageFilename: "Missing.png" }
    ])]), "metadata.json");
    const response = await fetch(`${server.baseUrl}/api/admin/upload`, { method: "POST", headers: await authHeaders(server), body: form });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.created.length, 1);
    assert.equal(body.metadataApplied, 1);
    assert.equal(body.created[0].title, "Imported title");
    assert.equal(body.created[0].description, "Imported description");
    assert.deepEqual(body.created[0].tags, ["darktable|format|jpg", "series|orbs"]);
    assert.equal(body.failed[0].filename, "Broken JSON.png");
    assert.match(body.warnings.join(" "), /Missing.png/);
    const { db } = await import("../src/db.js");
    assert.equal(db.prepare("SELECT id FROM artworks WHERE title='Must not persist'").get(), undefined);
    const retry = new FormData();
    retry.append("files", createImageBlob(), "Broken JSON.png");
    const retried = await fetch(`${server.baseUrl}/api/admin/upload`, { method: "POST", headers: await authHeaders(server), body: retry });
    assert.equal((await retried.json()).created.length, 1);

    const invalid = new FormData();
    invalid.append("files", createImageBlob(), "Rejected JSON.png");
    invalid.append("metadata", new Blob(["{"]), "invalid.json");
    const rejected = await fetch(`${server.baseUrl}/api/admin/upload`, { method: "POST", headers: await authHeaders(server), body: invalid });
    assert.equal(rejected.status, 400);
    assert.match((await rejected.json()).error, /Invalid JSON/);
    assert.equal(db.prepare("SELECT id FROM artworks WHERE title='Rejected JSON'").get(), undefined);
  } finally {
    await server.close();
  }
});

test("POST /api/admin/upload applies batch metadata to created artworks", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-upload-storage-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    const form = new FormData();
    form.append("tags", "portrait, concept art, portrait");
    form.append("series", "  Test   Series ");
    form.append("year", " 2026 ");
    form.append("status", "published");
    form.append("files", createImageBlob(), "First Upload!!.png");
    form.append("files", createImageBlob(), "Second Upload!!.png");

    const res = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: form
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.skipped.length, 0);
    assert.equal(body.created.length, 2);
    assert.deepEqual(body.created.map((item) => item.title).sort(), ["First Upload", "Second Upload"]);
    assert.deepEqual(body.created.map((item) => item.alt).sort(), ["First Upload", "Second Upload"]);

    for (const item of body.created) {
      assert.equal(item.series, "Test Series");
      assert.equal(item.year, "2026");
      assert.equal(item.status, "published");
      assert.deepEqual(item.tags, ["concept art", "portrait"]);
      assert.ok(item.publishedAt);
      assert.ok(item.thumb);
      assert.ok(item.image);
      assert.equal(item.width, 1);
      assert.equal(item.height, 1);
    }
  } finally {
    await server.close();
  }
});

test("POST /api/admin/upload skips duplicate filenames and reports the existing artwork id", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-upload-storage-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    const firstForm = new FormData();
    firstForm.append("files", createImageBlob(), "Duplicate Name!!.png");

    const firstRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: firstForm
    });
    const firstBody = await firstRes.json();
    assert.equal(firstRes.status, 200);
    assert.equal(firstBody.created.length, 1);
    const createdId = firstBody.created[0].id;
    assert.equal(firstBody.created[0].title, "Duplicate Name");
    assert.equal(firstBody.created[0].alt, "Duplicate Name");
    assert.equal(firstBody.created[0].series, "");
    assert.deepEqual(firstBody.created[0].seriesSlugs, []);

    const secondForm = new FormData();
    secondForm.append("files", createImageBlob(), "Duplicate Name!!.png");

    const secondRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: secondForm
    });
    const secondBody = await secondRes.json();

    assert.equal(secondRes.status, 200);
    assert.equal(secondBody.created.length, 0);
    assert.equal(secondBody.skipped.length, 1);
    assert.equal(secondBody.skipped[0].filename, "Duplicate_Name_.png");
    assert.equal(secondBody.skipped[0].reason, "duplicate_filename");
    assert.equal(secondBody.skipped[0].existingId, createdId);
  } finally {
    await server.close();
  }
});
