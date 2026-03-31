import test from "node:test";
import assert from "node:assert/strict";

import {
  initUploadFilterControllers,
  parseUploadTags,
  requireUploadAdminSession,
  syncUploadStatusPills,
  syncUploadTagFilterPills,
  toggleUploadTagFilter
} from "../../admin/js/upload-controller.js";

function createButton(attrs = {}) {
  const listeners = new Map();
  const classes = new Set();
  const state = { ...attrs };
  return {
    disabled: false,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    click() {
      return listeners.get("click")?.();
    },
    getAttribute(name) {
      return state[name] || "";
    },
    setAttribute(name, value) {
      state[name] = String(value);
    },
    classList: {
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      has(name) {
        return classes.has(name);
      }
    }
  };
}

test("parseUploadTags normalizes and deduplicates tag input", () => {
  assert.deepEqual(parseUploadTags(" Portrait, concept art ; #Portrait "), ["portrait", "concept art"]);
  assert.deepEqual(parseUploadTags(["Sky", " sky ", "LIGHT"]), ["sky", "light"]);
});

test("requireUploadAdminSession redirects unauthenticated users to login", () => {
  const windowRef = { location: { pathname: "/admin/upload.html", search: "?q=1", hash: "#top", href: "" } };
  assert.throws(() => requireUploadAdminSession({ getAdminToken: () => "", windowRef }), /Please sign in/);
  assert.equal(windowRef.location.href, "login.html?next=%2Fadmin%2Fupload.html%3Fq%3D1%23top");
  assert.equal(requireUploadAdminSession({ getAdminToken: () => "token", windowRef }), true);
});

test("upload filter helpers sync pill state and toggle filters", () => {
  const statusSelect = { value: "published" };
  const draftBtn = createButton({ "data-status-pill": "draft" });
  const publishedBtn = createButton({ "data-status-pill": "published" });
  syncUploadStatusPills(statusSelect, [draftBtn, publishedBtn]);
  assert.equal(draftBtn.classList.has("active"), false);
  assert.equal(publishedBtn.classList.has("active"), true);

  const selected = new Set(["a"]);
  const aBtn = createButton({ "data-tag-filter": "a" });
  const zBtn = createButton({ "data-tag-filter": "z" });
  syncUploadTagFilterPills([aBtn, zBtn], selected);
  assert.equal(aBtn.classList.has("is-active"), true);
  assert.equal(zBtn.classList.has("is-active"), false);
  assert.equal(toggleUploadTagFilter(selected, "a"), false);
  assert.equal(toggleUploadTagFilter(selected, "z"), true);
  assert.deepEqual(Array.from(selected).sort(), ["z"]);
});

test("initUploadFilterControllers wires status and tag pill clicks", () => {
  const statusSelect = { value: "draft" };
  const draftBtn = createButton({ "data-status-pill": "draft" });
  const publishedBtn = createButton({ "data-status-pill": "published" });
  const aBtn = createButton({ "data-tag-filter": "a" });
  const bBtn = createButton({ "data-tag-filter": "b" });
  const selectedTagFilters = new Set();
  let statusChanged = "";
  let tagCalls = 0;

  const controller = initUploadFilterControllers({
    statusSelect,
    statusPills: [draftBtn, publishedBtn],
    tagFilterPills: [aBtn, bBtn],
    selectedTagFilters,
    onStatusChange(value) {
      statusChanged = value;
    },
    onTagFilterChange() {
      tagCalls += 1;
    }
  });

  publishedBtn.click();
  assert.equal(statusSelect.value, "published");
  assert.equal(statusChanged, "published");
  assert.equal(publishedBtn.classList.has("active"), true);

  aBtn.click();
  assert.deepEqual(Array.from(selectedTagFilters), ["a"]);
  assert.equal(tagCalls, 1);
  assert.equal(aBtn.classList.has("is-active"), true);

  controller.dispose();
  bBtn.click();
  assert.deepEqual(Array.from(selectedTagFilters), ["a"]);
});
