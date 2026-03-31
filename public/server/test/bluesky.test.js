import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBlueskyPostUrl,
  normalizeServiceUrl,
  publishArtworkToBluesky
} from "../src/services/social/bluesky.js";
import { createJsonResponse, restoreEnv, withMockedFetch } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
});

test("normalizeServiceUrl trims and removes trailing slashes", () => {
  assert.equal(normalizeServiceUrl(" https://bsky.social/// "), "https://bsky.social");
  assert.equal(normalizeServiceUrl(""), "https://bsky.social");
});

test("buildBlueskyPostUrl builds the expected public URL", () => {
  assert.equal(
    buildBlueskyPostUrl("artist.bsky.social", "at://did:plc:123/app.bsky.feed.post/3kxyz"),
    "https://bsky.app/profile/artist.bsky.social/post/3kxyz"
  );
  assert.equal(buildBlueskyPostUrl("", "at://did/app.bsky.feed.post/123"), "");
  assert.equal(buildBlueskyPostUrl("artist.bsky.social", "bad-uri"), "");
});

test("publishArtworkToBluesky surfaces session creation errors", async () => {
  await withMockedFetch(async () => createJsonResponse({ error: "Bad credentials" }, {
    ok: false,
    status: 401,
    statusText: "Unauthorized"
  }), async () => {
    await assert.rejects(
      publishArtworkToBluesky({
        identifier: "artist.bsky.social",
        appPassword: "wrong",
        text: "Hello"
      }),
      /Bad credentials/
    );
  });
});

test("publishArtworkToBluesky returns post metadata after successful publish", async () => {
  const imageBuffer = Buffer.from("image-bytes");
  const fetchCalls = [];
  await withMockedFetch(async (url, options = {}) => {
    fetchCalls.push([url, options]);
    if (String(url).endsWith("/xrpc/com.atproto.server.createSession")) {
      return createJsonResponse({
        accessJwt: "jwt-123",
        did: "did:plc:abc",
        handle: "artist.bsky.social"
      });
    }
    if (String(url).endsWith("/xrpc/com.atproto.repo.uploadBlob")) {
      return createJsonResponse({
        blob: { $type: "blob", ref: { $link: "bafk" } }
      });
    }
    if (String(url).endsWith("/xrpc/com.atproto.repo.createRecord")) {
      return createJsonResponse({
        uri: "at://did:plc:abc/app.bsky.feed.post/3kxyz",
        cid: "bafy-post"
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }, async () => {
    const result = await publishArtworkToBluesky({
      identifier: "artist.bsky.social",
      appPassword: "app-password",
      text: "New artwork drop",
      imageBuffer,
      imageMimeType: "image/png",
      altText: "Artwork alt",
      aspectRatio: { width: 4, height: 5 }
    });

    assert.equal(result.did, "did:plc:abc");
    assert.equal(result.handle, "artist.bsky.social");
    assert.equal(result.postUrl, "https://bsky.app/profile/artist.bsky.social/post/3kxyz");
    assert.equal(result.externalPostId, "profile/artist.bsky.social/post/3kxyz");
    assert.deepEqual(result.record.embed.images[0].aspectRatio, { width: 4, height: 5 });
    assert.equal(fetchCalls.length, 3);
  });
});
