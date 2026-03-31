import test from "node:test";
import assert from "node:assert/strict";

import { initLoginPage } from "../../admin/js/login-page-controller.js";

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatch(type, event = {}) {
      const handler = listeners.get(type);
      if (!handler) return undefined;
      return handler(event);
    }
  };
}

function createWindowRef(search = "", origin = "https://toji.test") {
  const redirects = [];
  return {
    redirects,
    location: {
      search,
      origin,
      replace(nextHref) {
        redirects.push(nextHref);
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
      return values.get(key) ?? null;
    }
  };
}

test("initLoginPage redirects immediately when an active session is detected", async () => {
  const form = createEventTarget();
  const passwordEl = { value: "" };
  const statusEl = { textContent: "", className: "", classList: { add() {} } };
  const windowRef = createWindowRef("?next=%2Fadmin%2Fupload.html");

  const page = initLoginPage({
    form,
    passwordEl,
    statusEl,
    windowRef,
    apiBase: "https://toji.test",
    checkExistingSession: async () => true
  });

  const isAuthenticated = await page.sessionCheckPromise;
  assert.equal(isAuthenticated, true);
  assert.deepEqual(windowRef.redirects, ["/admin/upload.html"]);
});

test("initLoginPage wires submit handling through the provided login function", async () => {
  const form = createEventTarget();
  const passwordEl = { value: "secret" };
  const statusEl = { textContent: "", className: "", classList: { add() {} } };
  const windowRef = createWindowRef("?next=%2Fadmin%2Findex.html%23grid");
  const sessionStorageRef = createSessionStorage();
  let prevented = 0;
  let submitArgs = null;

  const page = initLoginPage({
    form,
    passwordEl,
    statusEl,
    windowRef,
    sessionStorageRef,
    apiBase: "https://toji.test",
    checkExistingSession: async () => false,
    submitLogin: async (args) => {
      submitArgs = args;
      args.onRedirect(args.redirectTarget);
      return { ok: true };
    }
  });

  await page.sessionCheckPromise;
  await form.dispatch("submit", {
    preventDefault() {
      prevented += 1;
    }
  });

  assert.equal(prevented, 1);
  assert.equal(submitArgs.password, "secret");
  assert.equal(submitArgs.redirectTarget, "/admin/index.html#grid");
  assert.equal(submitArgs.sessionStorageRef, sessionStorageRef);
  assert.deepEqual(windowRef.redirects, ["/admin/index.html#grid"]);
});

test("initLoginPage dispose removes the submit listener", async () => {
  const form = createEventTarget();
  let called = 0;

  const page = initLoginPage({
    form,
    passwordEl: { value: "secret" },
    statusEl: { textContent: "", className: "", classList: { add() {} } },
    windowRef: createWindowRef(),
    checkExistingSession: async () => false,
    submitLogin: async () => {
      called += 1;
      return { ok: true };
    }
  });

  await page.sessionCheckPromise;
  page.dispose();
  await form.dispatch("submit", { preventDefault() {} });
  assert.equal(called, 0);
});
