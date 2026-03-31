import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer } from "./helpers.js";

function authHeaders(json = true) {
  const headers = {
    Authorization: "Bearer legacy-token"
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

async function withIsolatedServer(fn) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-admin-routes-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_TOKEN = "legacy-token";
  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);
  try {
    await fn(server);
  } finally {
    await server.close();
  }
}

test.afterEach(() => {
  restoreEnv();
});

test("admin settings routes persist image variant and contact settings", async () => {
  await withIsolatedServer(async (server) => {
    const imagePut = await fetch(`${server.baseUrl}/api/admin/settings/image-variants`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        thumbMaxWidth: 640,
        thumbQuality: 75,
        webMaxWidth: 2048,
        webQuality: 88
      })
    });
    const imageBody = await imagePut.json();
    assert.equal(imagePut.status, 200);
    assert.deepEqual(imageBody, {
      thumbMaxWidth: 640,
      thumbQuality: 75,
      webMaxWidth: 2048,
      webQuality: 88
    });

    const imageGet = await fetch(`${server.baseUrl}/api/admin/settings/image-variants`, {
      headers: authHeaders(false)
    });
    const imageGetBody = await imageGet.json();
    assert.deepEqual(imageGetBody, imageBody);

    const contactPut = await fetch(`${server.baseUrl}/api/admin/settings/contact`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ contactEmail: "studio@example.com" })
    });
    const contactBody = await contactPut.json();
    assert.equal(contactPut.status, 200);
    assert.deepEqual(contactBody, { contactEmail: "studio@example.com" });

    const contactGet = await fetch(`${server.baseUrl}/api/admin/settings/contact`, {
      headers: authHeaders(false)
    });
    const contactGetBody = await contactGet.json();
    assert.deepEqual(contactGetBody, { contactEmail: "studio@example.com" });
  });
});

test("external links routes support create, update, replace, and delete flows", async () => {
  await withIsolatedServer(async (server) => {
    const createRes = await fetch(`${server.baseUrl}/api/admin/external-links`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        label: "Portfolio",
        url: "https://example.com/portfolio",
        category: "portfolio",
        enabled: true
      })
    });
    const created = await createRes.json();
    assert.equal(createRes.status, 201);
    assert.equal(created.label, "Portfolio");
    assert.equal(created.url, "https://example.com/portfolio");
    assert.equal(created.category, "portfolio");
    assert.equal(created.enabled, true);
    assert.ok(created.id);

    const patchRes = await fetch(`${server.baseUrl}/api/admin/external-links/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        label: "Main Portfolio",
        enabled: false,
        sortOrder: 5
      })
    });
    const patched = await patchRes.json();
    assert.equal(patchRes.status, 200);
    assert.equal(patched.label, "Main Portfolio");
    assert.equal(patched.enabled, false);
    assert.equal(patched.sortOrder, 5);

    const replaceRes = await fetch(`${server.baseUrl}/api/admin/external-links`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        links: [
          { label: "Shop", url: "https://example.com/shop", category: "shop", enabled: true },
          { label: "Contact", url: "mailto:hello@example.com", category: "other", enabled: true }
        ]
      })
    });
    const replaced = await replaceRes.json();
    assert.equal(replaceRes.status, 200);
    assert.equal(replaced.length, 2);
    assert.deepEqual(replaced.map((row) => row.label), ["Shop", "Contact"]);
    assert.deepEqual(replaced.map((row) => row.sortOrder), [0, 1]);

    const deleteRes = await fetch(`${server.baseUrl}/api/admin/external-links/${replaced[0].id}`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const deleted = await deleteRes.json();
    assert.equal(deleteRes.status, 200);
    assert.deepEqual(deleted, { ok: true, id: replaced[0].id });

    const listRes = await fetch(`${server.baseUrl}/api/admin/external-links`, {
      headers: authHeaders(false)
    });
    const listed = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].label, "Contact");
    assert.equal(listed[0].sortOrder, 0);
  });
});

test("external links routes reject invalid payloads", async () => {
  await withIsolatedServer(async (server) => {
    const invalidCreate = await fetch(`${server.baseUrl}/api/admin/external-links`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        label: "Broken",
        url: "ftp://example.com"
      })
    });
    const invalidCreateBody = await invalidCreate.json();
    assert.equal(invalidCreate.status, 400);
    assert.match(invalidCreateBody.error, /must start with https:\/\//);

    const invalidReplace = await fetch(`${server.baseUrl}/api/admin/external-links`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ links: { nope: true } })
    });
    const invalidReplaceBody = await invalidReplace.json();
    assert.equal(invalidReplace.status, 400);
    assert.match(invalidReplaceBody.error, /must be an array of links/i);
  });
});

test("series routes support create, update, list, and delete flows", async () => {
  await withIsolatedServer(async (server) => {
    const createRes = await fetch(`${server.baseUrl}/api/admin/series/Night Works`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        name: "Night Works",
        description: "Moody evening pieces",
        sortOrder: 12,
        isPublic: false,
        coverArtworkId: "art-123"
      })
    });
    const created = await createRes.json();
    assert.equal(createRes.status, 200);
    assert.equal(created.slug, "night-works");
    assert.equal(created.name, "Night Works");
    assert.equal(created.description, "Moody evening pieces");
    assert.equal(created.sortOrder, 12);
    assert.equal(created.isPublic, false);
    assert.equal(created.coverArtworkId, "art-123");

    const updateRes = await fetch(`${server.baseUrl}/api/admin/series/night-works`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        description: "Updated description",
        isPublic: true,
        coverArtworkId: ""
      })
    });
    const updated = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updated.description, "Updated description");
    assert.equal(updated.isPublic, true);
    assert.equal(updated.coverArtworkId, null);

    const listRes = await fetch(`${server.baseUrl}/api/admin/series`, {
      headers: authHeaders(false)
    });
    const listed = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].slug, "night-works");

    const deleteRes = await fetch(`${server.baseUrl}/api/admin/series/night-works`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const deleted = await deleteRes.json();
    assert.equal(deleteRes.status, 200);
    assert.deepEqual(deleted, { ok: true, deleted: "night-works" });
  });
});

test("series routes reject bad slugs and missing records", async () => {
  await withIsolatedServer(async (server) => {
    const badSlugRes = await fetch(`${server.baseUrl}/api/admin/series/!!!`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Bad" })
    });
    const badSlugBody = await badSlugRes.json();
    assert.equal(badSlugRes.status, 400);
    assert.deepEqual(badSlugBody, { error: "Bad slug" });

    const missingDelete = await fetch(`${server.baseUrl}/api/admin/series/missing-series`, {
      method: "DELETE",
      headers: authHeaders(false)
    });
    const missingDeleteBody = await missingDelete.json();
    assert.equal(missingDelete.status, 404);
    assert.deepEqual(missingDeleteBody, { error: "Not found" });
  });
});
