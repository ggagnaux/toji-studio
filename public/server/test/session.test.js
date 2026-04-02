import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  createAdminSession,
  expireAdminSessionForTests,
  getAdminSession,
  getAdminSessionCookieOptions,
  getAdminSessionFromRequest,
  parseCookies,
  serializeCookie,
  setAdminSessionCookie
} from "../src/session.js";
import { assertCookieIncludes, createMockReq, createMockRes, restoreEnv } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
});

test("parseCookies parses multiple cookies and decodes encoded values", () => {
  const req = createMockReq({
    headers: {
      cookie: "first=one; second=hello%20world; bad=%E0%A4%A"
    }
  });

  assert.deepEqual(parseCookies(req), {
    first: "one",
    second: "hello world",
    bad: "%E0%A4%A"
  });
});

test("getAdminSessionCookieOptions enables secure cookies for secure requests and configured ttl", () => {
  process.env.ADMIN_SESSION_TTL_HOURS = "2";
  const options = getAdminSessionCookieOptions(createMockReq({
    headers: { "x-forwarded-proto": "https" }
  }));

  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "Strict");
  assert.equal(options.path, "/");
  assert.equal(options.secure, true);
  assert.equal(options.maxAge, 7200);
});

test("createAdminSession stores metadata and can be loaded from request cookies", () => {
  const session = createAdminSession({ ip: "127.0.0.1", userAgent: "test-agent" });
  const req = createMockReq({
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(session.id)}`
    }
  });

  const fromStore = getAdminSession(session.id);
  const fromRequest = getAdminSessionFromRequest(req);

  assert.ok(fromStore);
  assert.equal(fromStore.id, session.id);
  assert.equal(fromStore.metadata.userAgent, "test-agent");
  assert.ok(Date.parse(fromStore.createdAt));
  assert.ok(Date.parse(fromStore.expiresAt));
  assert.equal(fromRequest?.id, session.id);
});

test("getAdminSession returns null for expired sessions", () => {
  const session = createAdminSession();
  expireAdminSessionForTests(session.id, new Date(Date.now() - 1000).toISOString());

  const req = createMockReq({
    headers: {
      cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(session.id)}`
    }
  });

  assert.equal(getAdminSession(session.id), null);
  assert.equal(getAdminSessionFromRequest(req), null);
});

test("set and clear admin session cookies append expected headers", () => {
  const session = createAdminSession();
  const req = createMockReq();
  const res = createMockRes();

  setAdminSessionCookie(res, session, req);
  const setCookie = res.appended[0]?.[1] || serializeCookie(ADMIN_SESSION_COOKIE, session.id, getAdminSessionCookieOptions(req));
  assertCookieIncludes(setCookie, ["Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=43200"]);

  clearAdminSessionCookie(res, req);
  const clearCookie = res.appended[1]?.[1] || "";
  assertCookieIncludes(clearCookie, ["Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0", "Expires="]);
});
