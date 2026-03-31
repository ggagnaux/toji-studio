import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer } from "./helpers.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=";

function authHeaders() {
  return {
    Authorization: "Bearer legacy-token"
  };
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

test("POST /api/admin/upload applies batch metadata to created artworks", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-upload-storage-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_TOKEN = "legacy-token";

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
      headers: authHeaders(),
      body: form
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.skipped.length, 0);
    assert.equal(body.created.length, 2);

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
  process.env.ADMIN_TOKEN = "legacy-token";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    const firstForm = new FormData();
    firstForm.append("files", createImageBlob(), "Duplicate Name!!.png");

    const firstRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: firstForm
    });
    const firstBody = await firstRes.json();
    assert.equal(firstRes.status, 200);
    assert.equal(firstBody.created.length, 1);
    const createdId = firstBody.created[0].id;

    const secondForm = new FormData();
    secondForm.append("files", createImageBlob(), "Duplicate Name!!.png");

    const secondRes = await fetch(`${server.baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: authHeaders(),
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
