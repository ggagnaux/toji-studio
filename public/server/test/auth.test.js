import test from "node:test";
import assert from "node:assert/strict";

import {
  createAdminSession,
  ADMIN_SESSION_COOKIE
} from "../src/session.js";
import {
  getAdminRequestAuthState,
  getExpectedAdminPassword,
  requireAdmin
} from "../src/auth.js";
import { createMockReq, createMockRes, restoreEnv } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
});

test("expected password comes only from ADMIN_PASSWORD", () => {
  process.env.ADMIN_PASSWORD = "secret-pass";
  delete process.env.ADMIN_TOKEN;

  assert.equal(getExpectedAdminPassword(), "secret-pass");
});

test("getAdminRequestAuthState accepts a valid admin session", () => {
  const session = createAdminSession({ ip: "127.0.0.1" });
  const req = createMockReq({
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(session.id)}`
    }
  });

  const auth = getAdminRequestAuthState(req);
  assert.equal(auth.ok, true);
  assert.equal(auth.method, "session");
  assert.equal(auth.session?.id, session.id);
});

test("getAdminRequestAuthState rejects requests without a valid session", () => {
  const req = createMockReq();
  const auth = getAdminRequestAuthState(req);
  assert.deepEqual(auth, {
    ok: false,
    method: "none",
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
