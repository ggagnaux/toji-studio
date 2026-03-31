import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/server.js";
import { resetAdminSessionsForTests } from "../src/session.js";
import { createTempEnvFile, restoreEnv, startTestServer } from "./helpers.js";

async function readJson(res) {
  return res.json();
}

test.afterEach(() => {
  restoreEnv();
  resetAdminSessionsForTests();
});

test("GET /api/admin/session/me returns unauthenticated state without credentials", async () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  const server = await startTestServer(createApp);
  try {
    const res = await fetch(`${server.baseUrl}/api/admin/session/me`);
    const body = await readJson(res);

    assert.equal(res.status, 401);
    assert.deepEqual(body, { ok: true, authenticated: false });
  } finally {
    await server.close();
  }
});

test("POST /api/admin/session/login succeeds and sets a session cookie", async () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  const server = await startTestServer(createApp);
  try {
    const res = await fetch(`${server.baseUrl}/api/admin/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret-pass" })
    });
    const body = await readJson(res);
    const setCookie = res.headers.get("set-cookie") || "";

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.authenticated, true);
    assert.ok(body.session?.createdAt);
    assert.ok(body.session?.expiresAt);
    assert.match(setCookie, /toji_admin_session=/i);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
  } finally {
    await server.close();
  }
});

test("POST /api/admin/session/login fails with invalid password and clears the cookie", async () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  const server = await startTestServer(createApp);
  try {
    const res = await fetch(`${server.baseUrl}/api/admin/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-pass" })
    });
    const body = await readJson(res);
    const setCookie = res.headers.get("set-cookie") || "";

    assert.equal(res.status, 401);
    assert.deepEqual(body, { error: "Invalid password." });
    assert.match(setCookie, /Max-Age=0/i);
  } finally {
    await server.close();
  }
});

test("POST /api/admin/session/password rejects unauthorized requests", async () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  const tempEnv = await createTempEnvFile("ADMIN_PASSWORD=secret-pass\n");
  process.env.TOJI_ENV_FILE = tempEnv.filePath;
  const server = await startTestServer(createApp);
  try {
    const res = await fetch(`${server.baseUrl}/api/admin/session/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "secret-pass", newPassword: "new-secret" })
    });
    const body = await readJson(res);

    assert.equal(res.status, 401);
    assert.deepEqual(body, { error: "Unauthorized" });
  } finally {
    await server.close();
    await tempEnv.cleanup();
  }
});

test("GET protected admin route rejects unauthenticated access and allows legacy token access", async () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  process.env.ADMIN_TOKEN = "legacy-token";
  const server = await startTestServer(createApp);
  try {
    const unauthorized = await fetch(`${server.baseUrl}/api/admin/settings/contact`);
    const unauthorizedBody = await readJson(unauthorized);
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(unauthorizedBody, { error: "Unauthorized" });

    const authorized = await fetch(`${server.baseUrl}/api/admin/settings/contact`, {
      headers: {
        Authorization: "Bearer legacy-token"
      }
    });
    const authorizedBody = await readJson(authorized);
    assert.equal(authorized.status, 200);
    assert.equal(typeof authorizedBody, "object");
  } finally {
    await server.close();
  }
});
