import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer } from "./helpers.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=";

function authHeaders(json = true) {
  const headers = {
    Authorization: "Bearer legacy-token"
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function createImageBlob() {
  return new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], { type: "image/png" });
}

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

async function withIsolatedServer(fn) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-artwork-routes-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_TOKEN = "legacy-token";
  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);
  try {
    await fn(server, storageDir);
  } finally {
    await server.close();
  }
}

async function createArtwork(server, filename = "Artwork.png") {
  const form = new FormData();
  form.append("files", createImageBlob(), filename);
  const res = await fetch(`${server.baseUrl}/api/admin/upload`, {
    method: "POST",
    headers: authHeaders(false),
    body: form
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.created.length, 1);
  return body.created[0];
}

test.afterEach(() => {
  restoreEnv();
});

test("artwork routes support patching metadata and deleting artwork files", async () => {
  await withIsolatedServer(async (server, storageDir) => {
    const created = await createArtwork(server, "Patch Me!!.png");

    const patchRes = await fetch(`${server.baseUrl}/api/admin/artworks/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        title: "Updated Title",
        description: "Updated description",
        status: "published",
        featured: true,
        sortOrder: 25,
        tags: ["portrait", "concept art"]
      })
    });
    const patched = await patchRes.json();
    assert.equal(patchRes.status, 200);
    assert.equal(patched.title, "Updated Title");
    assert.equal(patched.description, "Updated description");
    assert.equal(patched.status, "published");
    assert.equal(patched.featured, true);
    assert.equal(patched.sortOrder, 25);
    assert.deepEqual(patched.tags, ["portrait", "concept art"]);
    assert.ok(patched.publishedAt);

    const variantFilename = path.basename(String(patched.image || patched.thumb || ""));
    const variantPath = path.join(storageDir, "variants", variantFilename);
    const originalFilename = `${created.id}__Patch_Me_.png`;
    const originalPath = path.join(storageDir, "originals", originalFilename);
    await fs.access(variantPath);
    await fs.access(originalPath);

    const deleteRes = await fetch(`${server.baseUrl}/api/admin/artworks/${created.id}`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const deleted = await deleteRes.json();
    assert.equal(deleteRes.status, 200);
    assert.equal(deleted.ok, true);
    assert.equal(deleted.deleted.artworkId, created.id);
    assert.ok(deleted.deleted.variantCount >= 2);
    assert.equal(deleted.deleted.originalDeleted, true);

    await assert.rejects(fs.access(variantPath));
    await assert.rejects(fs.access(originalPath));

    const missingDelete = await fetch(`${server.baseUrl}/api/admin/artworks/${created.id}`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const missingBody = await missingDelete.json();
    assert.equal(missingDelete.status, 404);
    assert.deepEqual(missingBody, { error: "Not found" });
  });
});

test("social post routes support list, upsert, delete, and publish validation failures", async () => {
  await withIsolatedServer(async (server) => {
    const artwork = await createArtwork(server, "Social Post.png");

    const listRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts`, {
      headers: authHeaders(false)
    });
    const listed = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listed.artwork.id, artwork.id);
    assert.ok(Array.isArray(listed.posts));
    assert.ok(listed.posts.some((post) => post.platformId === "bluesky"));

    const upsertRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/bluesky`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        status: "queued",
        caption: "Launch caption",
        postUrl: "https://example.com/post",
        externalPostId: "ext-123",
        payload: { draft: true },
        errorMessage: "",
        postedAt: ""
      })
    });
    const upserted = await upsertRes.json();
    assert.equal(upsertRes.status, 200);
    assert.equal(upserted.platformName, "Bluesky");
    assert.equal(upserted.status, "queued");
    assert.equal(upserted.caption, "Launch caption");
    assert.equal(upserted.postUrl, "https://example.com/post");
    assert.equal(upserted.externalPostId, "ext-123");
    assert.deepEqual(upserted.payload, { draft: true });

    const publishUnsupported = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/instagram/publish`, {
      method: "POST",
      headers: authHeaders(false)
    });
    const publishUnsupportedBody = await publishUnsupported.json();
    assert.equal(publishUnsupported.status, 400);
    assert.match(publishUnsupportedBody.error, /Direct publish is currently supported only/);

    const disablePlatformRes = await fetch(`${server.baseUrl}/api/admin/social/platforms/bluesky`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ enabled: false })
    });
    assert.equal(disablePlatformRes.status, 200);

    const publishDisabled = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/bluesky/publish`, {
      method: "POST",
      headers: authHeaders(false)
    });
    const publishDisabledBody = await publishDisabled.json();
    assert.equal(publishDisabled.status, 400);
    assert.deepEqual(publishDisabledBody, { error: "Platform is disabled." });

    const deleteRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/bluesky`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const deleted = await deleteRes.json();
    assert.equal(deleteRes.status, 200);
    assert.deepEqual(deleted, { ok: true, artworkId: artwork.id, platformId: "bluesky" });

    const deleteMissing = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/bluesky`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const deleteMissingBody = await deleteMissing.json();
    assert.equal(deleteMissing.status, 404);
    assert.deepEqual(deleteMissingBody, { error: "Social post not found." });
  });
});

test("social post routes return not-found errors for missing artwork or platform", async () => {
  await withIsolatedServer(async (server) => {
    const missingArtworkRes = await fetch(`${server.baseUrl}/api/admin/artworks/missing/social-posts`, {
      headers: authHeaders(false)
    });
    const missingArtworkBody = await missingArtworkRes.json();
    assert.equal(missingArtworkRes.status, 404);
    assert.deepEqual(missingArtworkBody, { error: "Artwork not found." });

    const artwork = await createArtwork(server, "Platform Missing.png");
    const missingPlatformRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts/missing-platform`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: "draft" })
    });
    const missingPlatformBody = await missingPlatformRes.json();
    assert.equal(missingPlatformRes.status, 404);
    assert.deepEqual(missingPlatformBody, { error: "Platform not found." });
  });
});
