import test from "node:test";
import assert from "node:assert/strict";

import {
  categoryOptions,
  cleanSlug,
  cleanText,
  getPlatformFormMeta,
  normalizePlatformIconLocation,
  parseTagsInput,
  resolvePlatformIconSrc
} from "../../admin/js/social-platform-utils.js";

test("social platform utils normalize text and slugs", () => {
  assert.equal(cleanText("  Bluesky  "), "Bluesky");
  assert.equal(cleanSlug(" Linked In / Page "), "linked-in-page");
});

test("social platform utils normalize icon paths for local and public preview usage", () => {
  assert.equal(normalizePlatformIconLocation("assets/icons/bluesky.svg"), "/assets/icons/bluesky.svg");
  assert.equal(normalizePlatformIconLocation("/public/assets/icons/bluesky.svg"), "/assets/icons/bluesky.svg");
  assert.equal(resolvePlatformIconSrc("/assets/icons/bluesky.svg", "/public/admin/SocialMediaManager.html"), "/public/assets/icons/bluesky.svg");
  assert.equal(resolvePlatformIconSrc("https://cdn.example/icon.svg", "/admin/SocialMediaManager.html"), "https://cdn.example/icon.svg");
});

test("social platform utils parse default hashtags input", () => {
  assert.deepEqual(parseTagsInput(" art, Illustration; #Art\nprocess "), ["art", "illustration", "process"]);
});

test("social platform utils expose expected categories and platform form metadata", () => {
  assert.ok(categoryOptions.includes("social"));
  assert.ok(categoryOptions.includes("video"));

  const blueskyMeta = getPlatformFormMeta({ id: "bluesky" });
  assert.equal(blueskyMeta.postingModeDefault, "manual");
  assert.match(blueskyMeta.clientSecretLabel, /App password/i);

  const linkedinMeta = getPlatformFormMeta({ id: "linkedin" });
  assert.equal(linkedinMeta.postingModeDefault, "manual");
  assert.match(linkedinMeta.accountIdPlaceholder, /organization/i);

  const genericMeta = getPlatformFormMeta({ id: "mastodon" });
  assert.equal(genericMeta.postingModeDefault, "api");
  assert.equal(genericMeta.handleLabel, "Account handle");
});
