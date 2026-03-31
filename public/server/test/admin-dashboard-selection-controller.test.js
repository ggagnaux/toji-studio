import test from "node:test";
import assert from "node:assert/strict";

import { initThumbSelectAllController } from "../../admin/js/dashboard-selection-controller.js";

function createButton() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    click() {
      const handler = listeners.get("click");
      return handler ? handler() : undefined;
    }
  };
}

test("initThumbSelectAllController selects all visible items and notifies callbacks", () => {
  const button = createButton();
  const selected = new Set(["a"]);
  const calls = [];

  initThumbSelectAllController({
    button,
    getVisibleItems() {
      return [{ id: "a" }, { id: "b" }];
    },
    selected,
    onAfterToggle(payload) {
      calls.push(payload);
    }
  });

  const result = button.click();
  assert.deepEqual(Array.from(selected).sort(), ["a", "b"]);
  assert.deepEqual(result, { changed: true, visibleCount: 2, allVisibleSelected: true });
  assert.deepEqual(calls, [{ changed: true, visibleCount: 2, allVisibleSelected: true }]);
});

test("initThumbSelectAllController clears visible selection and supports disposal", () => {
  const button = createButton();
  const selected = new Set(["a", "b"]);

  const controller = initThumbSelectAllController({
    button,
    getVisibleItems() {
      return [{ id: "a" }, { id: "b" }];
    },
    selected
  });

  const result = button.click();
  assert.deepEqual(Array.from(selected), []);
  assert.deepEqual(result, { changed: true, visibleCount: 2, allVisibleSelected: false });

  controller.dispose();
  assert.equal(button.click(), undefined);
});

test("initThumbSelectAllController is a no-op when nothing is visible", () => {
  const button = createButton();
  const selected = new Set(["a"]);

  initThumbSelectAllController({
    button,
    getVisibleItems() {
      return [];
    },
    selected
  });

  const result = button.click();
  assert.deepEqual(Array.from(selected), ["a"]);
  assert.deepEqual(result, { changed: false, visibleCount: 0, allVisibleSelected: false });
});
