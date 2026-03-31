import test from "node:test";
import assert from "node:assert/strict";

import {
  checkExistingAdminSession,
  setLoginStatus,
  submitLoginForm
} from "../../admin/js/login-controller.js";

function createStatusElement() {
  const classes = new Set();
  return {
    textContent: "",
    className: "",
    classList: {
      add(...tokens) {
        tokens.forEach((token) => classes.add(token));
      },
      has(token) {
        return classes.has(token);
      }
    }
  };
}

function createSessionStorage() {
  const values = new Map();
  return {
    setItem(key, value) {
      values.set(key, String(value));
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    }
  };
}

test("setLoginStatus resets classes and applies visible error/info states", () => {
  const statusEl = createStatusElement();
  setLoginStatus(statusEl, "Bad password", "error");
  assert.equal(statusEl.textContent, "Bad password");
  assert.equal(statusEl.className, "login-status");
  assert.equal(statusEl.classList.has("is-visible"), true);
  assert.equal(statusEl.classList.has("is-error"), true);

  const infoEl = createStatusElement();
  setLoginStatus(infoEl, "Signing in...", "info");
  assert.equal(infoEl.classList.has("is-info"), true);
});

test("submitLoginForm rejects missing passwords without making a request", async () => {
  const statusEl = createStatusElement();
  let called = false;
  const result = await submitLoginForm({
    password: "",
    statusEl,
    fetchImpl: async () => {
      called = true;
      throw new Error("should not fetch");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing-password");
  assert.equal(called, false);
  assert.equal(statusEl.textContent, "Password is required.");
  assert.equal(statusEl.classList.has("is-error"), true);
});

test("submitLoginForm stores session state and redirects after success", async () => {
  const statusEl = createStatusElement();
  const sessionStorageRef = createSessionStorage();
  let sessionMarked = false;
  let redirectedTo = "";

  const result = await submitLoginForm({
    password: "secret",
    statusEl,
    apiBase: "https://toji.test",
    redirectTarget: "/admin/index.html",
    sessionStorageRef,
    setAdminSessionAuthenticated(value) {
      sessionMarked = value;
    },
    onRedirect(nextHref) {
      redirectedTo = nextHref;
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://toji.test/api/admin/session/login");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(String(options.body)), { password: "secret" });
      return {
        ok: true,
        async json() {
          return { ok: true };
        }
      };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(sessionMarked, true);
  assert.equal(sessionStorageRef.getItem("toji_admin_just_logged_in_v1"), "1");
  assert.equal(redirectedTo, "/admin/index.html");
  assert.equal(statusEl.textContent, "Signing in...");
});

test("submitLoginForm clears session and surfaces backend errors", async () => {
  const statusEl = createStatusElement();
  let cleared = 0;

  const result = await submitLoginForm({
    password: "bad-secret",
    statusEl,
    clearAdminSession() {
      cleared += 1;
    },
    fetchImpl: async () => ({
      ok: false,
      async json() {
        return { error: "Invalid password." };
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "request-failed");
  assert.equal(cleared, 1);
  assert.equal(statusEl.textContent, "Invalid password.");
  assert.equal(statusEl.classList.has("is-error"), true);
});

test("checkExistingAdminSession marks valid sessions and clears stale local state on failure", async () => {
  let sessionMarked = false;
  const valid = await checkExistingAdminSession({
    apiBase: "https://toji.test",
    setAdminSessionAuthenticated(value) {
      sessionMarked = value;
    },
    fetchImpl: async () => ({ ok: true })
  });
  assert.equal(valid, true);
  assert.equal(sessionMarked, true);

  let cleared = 0;
  const invalid = await checkExistingAdminSession({
    apiBase: "https://toji.test",
    isAdminSessionAuthenticated() {
      return true;
    },
    clearAdminSession() {
      cleared += 1;
    },
    fetchImpl: async () => ({ ok: false })
  });
  assert.equal(invalid, false);
  assert.equal(cleared, 1);
});
