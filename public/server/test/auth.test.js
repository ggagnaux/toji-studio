import test from "node:test";
import assert from "node:assert/strict";

import {
  createAdminSession,
  ADMIN_SESSION_COOKIE,
  resetAdminSessionsForTests
} from "../src/session.js";
import {
  getAdminRequestAuthState,
  getExpectedAdminPassword,
  getExpectedAdminToken,
  hasValidLegacyAdminToken,
  requireAdmin
} from "../src/auth.js";
import { createMockReq, createMockRes, restoreEnv } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
  resetAdminSessionsForTests();
});

test("expected password falls back to admin token", () => {
  process.env.ADMIN_TOKEN = "fallback-token";
  delete process.env.ADMIN_PASSWORD;

  assert.equal(getExpectedAdminToken(), "fallback-token");
  assert.equal(getExpectedAdminPassword(), "fallback-token");
});

test("hasValidLegacyAdminToken accepts matching bearer token", () => {
  process.env.ADMIN_TOKEN = "secret-token";
  const req = createMockReq({
    headers: {
      authorization: "Bearer secret-token"
    }
  });

  assert.equal(hasValidLegacyAdminToken(req), true);
});

test("getAdminRequestAuthState prefers session auth over bearer token", () => {
  process.env.ADMIN_TOKEN = "secret-token";
  const session = createAdminSession({ ip: "127.0.0.1" });
  const req = createMockReq({
    headers: {
      authorization: "Bearer secret-token",
      cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(session.id)}`
    }
  });

  const auth = getAdminRequestAuthState(req);
  assert.equal(auth.ok, true);
  assert.equal(auth.method, "session");
  assert.equal(auth.session?.id, session.id);
});

test("getAdminRequestAuthState falls back to token auth when no session exists", () => {
  process.env.ADMIN_TOKEN = "secret-token";
  const req = createMockReq({
    headers: {
      authorization: "Bearer secret-token"
    }
  });

  const auth = getAdminRequestAuthState(req);
  assert.deepEqual(auth, {
    ok: true,
    method: "token",
    session: null
  });
});

test("requireAdmin rejects unauthorized requests", () => {
  const req = createMockReq();
  const res = createMockRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Unauthorized" });
});
