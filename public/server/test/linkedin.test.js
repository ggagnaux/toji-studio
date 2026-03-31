import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLinkedInPostUrl,
  normalizeApiBaseUrl,
  normalizeApiVersion,
  normalizeOwnerUrn,
  publishArtworkToLinkedIn
} from "../src/services/social/linkedin.js";
import { createJsonResponse, restoreEnv, withMockedFetch } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
});

test("normalize LinkedIn helpers return expected defaults", () => {
  assert.equal(normalizeApiBaseUrl(" https://api.linkedin.com/// "), "https://api.linkedin.com");
  assert.equal(normalizeApiBaseUrl(""), "https://api.linkedin.com");
  assert.equal(normalizeApiVersion(""), "202601");
  assert.equal(normalizeApiVersion("202501"), "202501");
  assert.equal(normalizeOwnerUrn("123456"), "urn:li:organization:123456");
  assert.equal(normalizeOwnerUrn("urn:li:person:42"), "urn:li:person:42");
});

test("buildLinkedInPostUrl encodes the URN", () => {
  assert.equal(
    buildLinkedInPostUrl("urn:li:share:123"),
    "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123/"
  );
  assert.equal(buildLinkedInPostUrl(""), "");
});

test("publishArtworkToLinkedIn rejects missing owner", async () => {
  await assert.rejects(
    publishArtworkToLinkedIn({
      accessToken: "token",
      commentary: "Post body"
    }),
    /owner URN\/account id is required/
  );
});

test("publishArtworkToLinkedIn surfaces initialization errors", async () => {
  await withMockedFetch(async () => createJsonResponse({ message: "Init failed" }, {
    ok: false,
    status: 400,
    statusText: "Bad Request"
  }), async () => {
    await assert.rejects(
      publishArtworkToLinkedIn({
        accessToken: "token",
        commentary: "Post body",
        owner: "123456"
      }),
      /Init failed/
    );
  });
});

test("publishArtworkToLinkedIn returns publish metadata after success", async () => {
  const fetchCalls = [];
  await withMockedFetch(async (url, options = {}) => {
    fetchCalls.push([url, options]);
    if (String(url).includes("/rest/images?action=initializeUpload")) {
      return createJsonResponse({
        value: {
          uploadUrl: "https://uploads.linkedin.test/image",
          image: "urn:li:image:C4D00AAA"
        }
      });
    }
    if (String(url) === "https://uploads.linkedin.test/image") {
      return {
        ok: true,
        status: 201,
        statusText: "Created",
        async text() {
          return "";
        }
      };
    }
    if (String(url).includes("/rest/images/")) {
      return createJsonResponse({ status: "AVAILABLE" });
    }
    if (String(url).includes("/rest/posts")) {
      return createJsonResponse({}, {
        headers: new Headers([["x-restli-id", "urn:li:share:12345"]])
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }, async () => {
    const result = await publishArtworkToLinkedIn({
      accessToken: "token",
      commentary: "Post body",
      owner: "123456",
      title: "Artwork title",
      altText: "Artwork alt",
      imageBuffer: Buffer.from("image"),
      imageMimeType: "image/png"
    });

    assert.equal(result.owner, "urn:li:organization:123456");
    assert.equal(result.imageUrn, "urn:li:image:C4D00AAA");
    assert.equal(result.postUrn, "urn:li:share:12345");
    assert.equal(result.postUrl, "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A12345/");
    assert.equal(result.apiVersion, "202601");
    assert.equal(result.payload.content.media.id, "urn:li:image:C4D00AAA");
    assert.equal(fetchCalls.length, 4);
  });
});
