import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ORIGINAL_ENV = { ...process.env };

export function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
}

export function createMockReq({
  headers = {},
  secure = false,
  method = "GET",
  url = "/api/test",
  originalUrl = url,
  ip = "127.0.0.1"
} = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), value])
  );
  return {
    headers: normalizedHeaders,
    secure,
    method,
    url,
    originalUrl,
    ip,
    get(name) {
      return normalizedHeaders[String(name || "").toLowerCase()] || "";
    }
  };
}

export function createMockRes() {
  const headers = [];
  return {
    appended: headers,
    statusCode: 200,
    body: undefined,
    append(name, value) {
      headers.push([name, value]);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

export async function withMockedFetch(implementation, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = implementation;
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export function createJsonResponse(json, { ok = true, status = 200, statusText = "OK", headers } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: headers || new Headers(),
    async json() {
      return json;
    },
    async text() {
      return typeof json === "string" ? json : JSON.stringify(json);
    }
  };
}

export function assertCookieIncludes(cookieHeader, expectedParts) {
  for (const part of expectedParts) {
    assert.match(cookieHeader, new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

export async function createTempEnvFile(contents = "") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-test-env-"));
  const filePath = path.join(dir, ".env");
  await fs.writeFile(filePath, contents, "utf8");
  return {
    dir,
    filePath,
    async cleanup() {
      await fs.rm(dir, { recursive: true, force: true });
    }
  };
}

export async function startTestServer(createApp) {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address.");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    app,
    server,
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  };
}
