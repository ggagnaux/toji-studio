import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createJsonResponse,
  restoreEnv,
  startTestServer,
  withMockedFetch
} from "./helpers.js";

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
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-social-publish-routes-"));
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

async function configurePlatform(server, platformId, { config, auth, enabled = true }) {
  const res = await fetch(`${server.baseUrl}/api/admin/social/platforms/${platformId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ enabled, config, auth })
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  return body;
}

async function upsertSocialPost(server, artworkId, platformId, payload) {
  const res = await fetch(`${server.baseUrl}/api/admin/artworks/${artworkId}/social-posts/${platformId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  return body;
}

async function publishPost(server, artworkId, platformId) {
  const res = await fetch(`${server.baseUrl}/api/admin/artworks/${artworkId}/social-posts/${platformId}/publish`, {
    method: "POST",
    headers: authHeaders(false)
  });
  const body = await res.json();
  return { res, body };
}

async function withMockedExternalFetch(server, handler, fn) {
  const passthroughFetch = globalThis.fetch;
  await withMockedFetch(async (url, options = {}) => {
    const target = typeof url === "string" ? url : String(url);
    if (target.startsWith(server.baseUrl)) {
      return passthroughFetch(url, options);
    }
    return handler(target, options);
  }, fn);
}

test.afterEach(() => {
  restoreEnv();
});

test("direct Bluesky publish stores posted metadata on success", async () => {
  await withIsolatedServer(async (server) => {
    const artwork = await createArtwork(server, "Bluesky Publish.png");
    await configurePlatform(server, "bluesky", {
      config: {
        postingMode: "api",
        accountHandle: "artist.test",
        defaultCaptionSuffix: " | Studio release"
      },
      auth: {
        clientId: "artist.test",
        clientSecret: "app-password"
      }
    });
    await upsertSocialPost(server, artwork.id, "bluesky", {
      status: "queued",
      caption: "Fresh post"
    });

    const outboundCalls = [];
    await withMockedExternalFetch(server, async (target, options) => {
      outboundCalls.push({ target, options });
      if (target === "https://bsky.social/xrpc/com.atproto.server.createSession") {
        assert.equal(options.method, "POST");
        const body = JSON.parse(String(options.body || "{}"));
        assert.equal(body.identifier, "artist.test");
        assert.equal(body.password, "app-password");
        return createJsonResponse({
          accessJwt: "jwt-token",
          did: "did:plc:artist",
          handle: "artist.test"
        });
      }
      if (target === "https://bsky.social/xrpc/com.atproto.repo.uploadBlob") {
        assert.equal(options.method, "POST");
        return createJsonResponse({
          blob: {
            $type: "blob",
            ref: { $link: "blob-ref" },
            mimeType: "image/png",
            size: 68
          }
        });
      }
      if (target === "https://bsky.social/xrpc/com.atproto.repo.createRecord") {
        assert.equal(options.method, "POST");
        const body = JSON.parse(String(options.body || "{}"));
        assert.equal(body.collection, "app.bsky.feed.post");
        assert.equal(body.repo, "did:plc:artist");
        assert.equal(body.record.text, "Fresh post\n\n| Studio release");
        return createJsonResponse({
          uri: "at://did:plc:artist/app.bsky.feed.post/abc123",
          cid: "cid-123"
        });
      }
      throw new Error(`Unexpected fetch target: ${target}`);
    }, async () => {
      const { res, body } = await publishPost(server, artwork.id, "bluesky");
      assert.equal(res.status, 200);
      assert.equal(body.status, "posted");
      assert.equal(body.platformId, "bluesky");
      assert.equal(body.postUrl, "https://bsky.app/profile/artist.test/post/abc123");
      assert.equal(body.externalPostId, "profile/artist.test/post/abc123");
      assert.equal(body.errorMessage, "");
      assert.equal(body.payload.provider, "bluesky");
      assert.equal(body.payload.handle, "artist.test");
      assert.equal(body.payload.cid, "cid-123");
      assert.ok(body.postedAt);
    });

    assert.equal(outboundCalls.length, 3);
  });
});

test("direct Bluesky publish records provider failures", async () => {
  await withIsolatedServer(async (server) => {
    const artwork = await createArtwork(server, "Bluesky Failure.png");
    await configurePlatform(server, "bluesky", {
      config: {
        postingMode: "api",
        accountHandle: "artist.test"
      },
      auth: {
        clientId: "artist.test",
        clientSecret: "app-password"
      }
    });

    await withMockedExternalFetch(server, async (target) => {
      if (target === "https://bsky.social/xrpc/com.atproto.server.createSession") {
        return createJsonResponse({ error: "Invalid Bluesky credentials." }, { ok: false, status: 401, statusText: "Unauthorized" });
      }
      throw new Error(`Unexpected fetch target: ${target}`);
    }, async () => {
      const { res, body } = await publishPost(server, artwork.id, "bluesky");
      assert.equal(res.status, 502);
      assert.deepEqual(body, { error: "Invalid Bluesky credentials." });
    });

    const listRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts`, {
      headers: authHeaders(false)
    });
    const listed = await listRes.json();
    assert.equal(listRes.status, 200);
    const post = listed.posts.find((entry) => entry.platformId === "bluesky");
    assert.equal(post.status, "failed");
    assert.equal(post.errorMessage, "Invalid Bluesky credentials.");
    assert.equal(post.payload.provider, "bluesky");
    assert.ok(post.payload.attemptedAt);
  });
});

test("direct LinkedIn publish stores posted metadata on success", async () => {
  await withIsolatedServer(async (server) => {
    const artwork = await createArtwork(server, "LinkedIn Publish.png");
    await configurePlatform(server, "linkedin", {
      config: {
        postingMode: "api",
        accountId: "12345"
      },
      auth: {
        accessToken: "linkedin-token"
      }
    });
    await upsertSocialPost(server, artwork.id, "linkedin", {
      status: "queued",
      caption: "LinkedIn launch"
    });

    await withMockedExternalFetch(server, async (target, options) => {
      if (target === "https://api.linkedin.com/rest/images?action=initializeUpload") {
        assert.equal(options.method, "POST");
        const body = JSON.parse(String(options.body || "{}"));
        assert.equal(body.initializeUploadRequest.owner, "urn:li:organization:12345");
        return createJsonResponse({
          value: {
            uploadUrl: "https://uploads.linkedin.test/image",
            image: "urn:li:image:C4E10AQF"
          }
        });
      }
      if (target === "https://uploads.linkedin.test/image") {
        assert.equal(options.method, "PUT");
        return {
          ok: true,
          status: 201,
          statusText: "Created",
          headers: new Headers(),
          async json() {
            return {};
          },
          async text() {
            return "";
          }
        };
      }
      if (target === "https://api.linkedin.com/rest/images/urn%3Ali%3Aimage%3AC4E10AQF") {
        return createJsonResponse({ status: "AVAILABLE" });
      }
      if (target === "https://api.linkedin.com/rest/posts") {
        const headers = new Headers({ "x-restli-id": "urn:li:share:98765" });
        return createJsonResponse({}, { headers });
      }
      throw new Error(`Unexpected fetch target: ${target}`);
    }, async () => {
      const { res, body } = await publishPost(server, artwork.id, "linkedin");
      assert.equal(res.status, 200);
      assert.equal(body.status, "posted");
      assert.equal(body.platformId, "linkedin");
      assert.equal(body.postUrl, "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A98765/");
      assert.equal(body.externalPostId, "urn:li:share:98765");
      assert.equal(body.errorMessage, "");
      assert.equal(body.payload.provider, "linkedin");
      assert.equal(body.payload.owner, "urn:li:organization:12345");
      assert.equal(body.payload.imageUrn, "urn:li:image:C4E10AQF");
      assert.equal(body.payload.apiVersion, "202601");
      assert.ok(body.postedAt);
    });
  });
});

test("direct LinkedIn publish returns upstream errors and stores failure state", async () => {
  await withIsolatedServer(async (server) => {
    const artwork = await createArtwork(server, "LinkedIn Failure.png");
    await configurePlatform(server, "linkedin", {
      config: {
        postingMode: "api",
        accountId: "12345"
      },
      auth: {
        accessToken: "linkedin-token"
      }
    });

    await withMockedExternalFetch(server, async (target) => {
      if (target === "https://api.linkedin.com/rest/images?action=initializeUpload") {
        return createJsonResponse({ message: "LinkedIn initialize failed." }, { ok: false, status: 500, statusText: "Server Error" });
      }
      throw new Error(`Unexpected fetch target: ${target}`);
    }, async () => {
      const { res, body } = await publishPost(server, artwork.id, "linkedin");
      assert.equal(res.status, 502);
      assert.deepEqual(body, { error: "LinkedIn initialize failed." });
    });

    const listRes = await fetch(`${server.baseUrl}/api/admin/artworks/${artwork.id}/social-posts`, {
      headers: authHeaders(false)
    });
    const listed = await listRes.json();
    assert.equal(listRes.status, 200);
    const post = listed.posts.find((entry) => entry.platformId === "linkedin");
    assert.equal(post.status, "failed");
    assert.equal(post.errorMessage, "LinkedIn initialize failed.");
    assert.equal(post.payload.provider, "linkedin");
    assert.ok(post.payload.attemptedAt);
  });
});


