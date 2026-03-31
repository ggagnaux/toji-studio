import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_FEATURES_ENABLED_KEY,
  initEditTabController,
  isAiFeaturesEnabled,
  setEditTabState,
  syncAiButtons
} from "../../admin/js/edit-controller.js";

function createStorage(value) {
  return {
    getItem(key) {
      if (key !== AI_FEATURES_ENABLED_KEY) return null;
      return value;
    }
  };
}

function createClassList() {
  const classes = new Set();
  return {
    toggle(name, active) {
      if (active) classes.add(name);
      else classes.delete(name);
    },
    add(...names) {
      names.forEach((name) => classes.add(name));
    },
    remove(...names) {
      names.forEach((name) => classes.delete(name));
    },
    has(name) {
      return classes.has(name);
    }
  };
}

function createButton() {
  const attrs = new Map();
  const listeners = new Map();
  return {
    disabled: false,
    title: "",
    classList: createClassList(),
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    click() {
      return listeners.get("click")?.();
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    getAttribute(name) {
      return attrs.get(name) || "";
    },
    removeAttribute(name) {
      attrs.delete(name);
    }
  };
}

function createPane() {
  const attrs = new Map();
  return {
    classList: createClassList(),
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    }
  };
}

test("isAiFeaturesEnabled respects persisted disabling values", () => {
  assert.equal(isAiFeaturesEnabled(createStorage(null)), true);
  assert.equal(isAiFeaturesEnabled(createStorage("1")), true);
  assert.equal(isAiFeaturesEnabled(createStorage("off")), false);
  assert.equal(isAiFeaturesEnabled(createStorage("false")), false);
});

test("syncAiButtons updates disabled, title, tooltip, and aria state", () => {
  const descriptionButton = createButton();
  const tagsButton = createButton();

  const enabled = syncAiButtons({
    storageRef: createStorage("off"),
    descriptionButton,
    tagsButton,
    generatingDescription: false,
    generatingTags: true
  });

  assert.equal(enabled, false);
  assert.equal(descriptionButton.disabled, true);
  assert.equal(tagsButton.disabled, true);
  assert.match(descriptionButton.title, /Enable AI features/i);
  assert.equal(descriptionButton.getAttribute("data-tooltip") !== "", true);
  assert.equal(tagsButton.getAttribute("aria-disabled"), "true");

  syncAiButtons({
    storageRef: createStorage(null),
    descriptionButton,
    tagsButton,
    generatingDescription: false,
    generatingTags: false
  });
  assert.equal(descriptionButton.disabled, false);
  assert.equal(tagsButton.disabled, false);
  assert.equal(descriptionButton.getAttribute("data-tooltip"), "");
});

test("setEditTabState toggles active classes and hidden panes", () => {
  const buttons = { details: createButton(), tags: createButton(), social: createButton() };
  const panes = { details: createPane(), tags: createPane(), social: createPane() };
  const tabContent = { classList: createClassList() };

  setEditTabState("social", { buttons, panes, tabContent });
  assert.equal(buttons.social.classList.has("is-active"), true);
  assert.equal(buttons.details.classList.has("is-active"), false);
  assert.equal(panes.social.hasAttribute("hidden"), false);
  assert.equal(panes.details.hasAttribute("hidden"), true);
  assert.equal(tabContent.classList.has("tab-active-social"), true);
});

test("initEditTabController wires tab clicks and supports disposal", () => {
  const buttons = { details: createButton(), tags: createButton(), social: createButton() };
  const panes = { details: createPane(), tags: createPane(), social: createPane() };
  const tabContent = { classList: createClassList() };

  const controller = initEditTabController({ buttons, panes, tabContent, initialTab: "details" });
  assert.equal(controller.getCurrentTab(), "details");

  buttons.tags.click();
  assert.equal(controller.getCurrentTab(), "tags");
  assert.equal(tabContent.classList.has("tab-active-tags"), true);

  controller.dispose();
  buttons.social.click();
  assert.equal(controller.getCurrentTab(), "tags");
});
