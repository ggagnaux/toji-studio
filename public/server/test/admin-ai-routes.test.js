import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer, createAuthenticatedHeaders, withMockedFetch } from "./helpers.js";

const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=";

async function authHeaders(server, json = true) {
  return createAuthenticatedHeaders(server.baseUrl, { json });
}

function createImageBlob() {
  return new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], { type: "image/png" });
}

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

async function withIsolatedServer(fn) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-ai-routes-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";
  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);
  try {
    await fn(server);
  } finally {
    await server.close();
  }
}

async function createArtwork(server, filename = "Ai Artwork.png") {
  const form = new FormData();
  form.append("files", createImageBlob(), filename);
  const res = await fetch(`${server.baseUrl}/api/admin/upload`, {
    method: "POST",
    headers: await authHeaders(server, false),
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

test("AI routes reject requests when OPENAI_API_KEY is missing", async () => {
  await withIsolatedServer(async (server) => {
    delete process.env.OPENAI_API_KEY;
    const artwork = await createArtwork(server);

    const describeRes = await fetch(`${server.baseUrl}/api/admin/ai/describe-artwork`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: JSON.stringify({ artworkId: artwork.id, title: artwork.title })
    });
    const describeBody = await describeRes.json();
    assert.equal(describeRes.status, 500);
    assert.deepEqual(describeBody, { error: "OPENAI_API_KEY is not configured." });

    const tagsRes = await fetch(`${server.baseUrl}/api/admin/ai/generate-tags`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: JSON.stringify({ artworkId: artwork.id, title: artwork.title })
    });
    const tagsBody = await tagsRes.json();
    assert.equal(tagsRes.status, 500);
    assert.deepEqual(tagsBody, { error: "OPENAI_API_KEY is not configured." });
  });
});

test("AI describe route returns generated description via mocked OpenAI response", async () => {
  await withIsolatedServer(async (server) => {
    process.env.OPENAI_API_KEY = "test-key";
    const artwork = await createArtwork(server, "Describe Me.png");
    const realFetch = globalThis.fetch;

    await withMockedFetch(async (url, options) => {
      if (String(url).startsWith(server.baseUrl)) return realFetch(url, options);
      assert.equal(String(url), "https://api.openai.com/v1/responses");
      const payload = JSON.parse(String(options?.body || "{}"));
      assert.equal(payload.model, "gpt-4.1-mini");
      assert.ok(String(payload.input?.[0]?.content?.[0]?.text || "").includes("Describe visual composition"));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return {
            output_text: "A quiet portrait with warm contrast and a painterly finish."
          };
        }
      };
    }, async () => {
      const res = await fetch(`${server.baseUrl}/api/admin/ai/describe-artwork`, {
        method: "POST",
        headers: await authHeaders(server, ),
        body: JSON.stringify({
          artworkId: artwork.id,
          title: artwork.title,
          year: artwork.year,
          series: artwork.series,
          alt: "Portrait alt",
          tags: ["portrait", "warm"]
        })
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.deepEqual(body, {
        description: "A quiet portrait with warm contrast and a painterly finish."
      });
    });
  });
});

test("AI generate-tags route returns parsed tags and surfaces unusable responses", async () => {
  await withIsolatedServer(async (server) => {
    process.env.OPENAI_API_KEY = "test-key";
    const artwork = await createArtwork(server, "Tag Me.png");
    const realFetch = globalThis.fetch;
    let callCount = 0;

    await withMockedFetch(async (url, options) => {
      if (String(url).startsWith(server.baseUrl)) return realFetch(url, options);
      callCount += 1;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async json() {
            return {
              output: [
                {
                  content: [
                    { text: "portrait, cinematic light, #mood, portrait" }
                  ]
                }
              ]
            };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return {
            output_text: ""
          };
        }
      };
    }, async () => {
      const okRes = await fetch(`${server.baseUrl}/api/admin/ai/generate-tags`, {
        method: "POST",
        headers: await authHeaders(server, ),
        body: JSON.stringify({
          artworkId: artwork.id,
          title: artwork.title,
          description: "Moody portrait study",
          tags: ["existing"]
        })
      });
      const okBody = await okRes.json();
      assert.equal(okRes.status, 200);
      assert.deepEqual(okBody, {
        tags: ["portrait", "cinematic light", "mood"]
      });

      const badRes = await fetch(`${server.baseUrl}/api/admin/ai/generate-tags`, {
        method: "POST",
        headers: await authHeaders(server, ),
        body: JSON.stringify({
          artworkId: artwork.id,
          title: artwork.title,
          description: "Moody portrait study"
        })
      });
      const badBody = await badRes.json();
      assert.equal(badRes.status, 502);
      assert.deepEqual(badBody, { error: "OpenAI returned no usable tags." });
    });
  });
});

test("AI describe route surfaces upstream errors and missing-image failures", async () => {
  await withIsolatedServer(async (server) => {
    process.env.OPENAI_API_KEY = "test-key";
    const realFetch = globalThis.fetch;

    const missingImageRes = await fetch(`${server.baseUrl}/api/admin/ai/describe-artwork`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: JSON.stringify({ artworkId: "missing-artwork", title: "Missing" })
    });
    const missingImageBody = await missingImageRes.json();
    assert.equal(missingImageRes.status, 400);
    assert.deepEqual(missingImageBody, { error: "Unable to locate artwork image for AI description." });

    const artwork = await createArtwork(server, "Upstream Error.png");

    await withMockedFetch(async (url, options) => {
      if (String(url).startsWith(server.baseUrl)) return realFetch(url, options);
      return {
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        async json() {
          return {
            error: { message: "Rate limit hit" }
          };
        }
      };
    }, async () => {
      const res = await fetch(`${server.baseUrl}/api/admin/ai/describe-artwork`, {
        method: "POST",
        headers: await authHeaders(server, ),
        body: JSON.stringify({ artworkId: artwork.id, title: artwork.title })
      });
      const body = await res.json();
      assert.equal(res.status, 429);
      assert.deepEqual(body, { error: "Rate limit hit" });
    });
  });
});
