import test from "node:test";
import assert from "node:assert/strict";

import {
  qs,
  slugifySeries,
  sortBySortOrderAndDate,
  sortGallery
} from "../../assets/js/content-utils.js";

const ORIGINAL_LOCATION = globalThis.location;

test.afterEach(() => {
  if (typeof ORIGINAL_LOCATION === "undefined") {
    delete globalThis.location;
  } else {
    globalThis.location = ORIGINAL_LOCATION;
  }
});

test("qs reads values from location.search", () => {
  globalThis.location = { search: "?series=night-works&tag=portrait&empty=" };

  assert.equal(qs("series"), "night-works");
  assert.equal(qs("tag"), "portrait");
  assert.equal(qs("missing"), null);
  assert.equal(qs("empty"), "");
});

test("slugifySeries normalizes text into a stable slug", () => {
  assert.equal(slugifySeries("  Night Works  "), "night-works");
  assert.equal(slugifySeries("Sci-Fi & Fantasy"), "sci-fi-fantasy");
  assert.equal(slugifySeries("---Already---Sluggy---"), "already-sluggy");
  assert.ok(slugifySeries("a".repeat(120)).length <= 80);
});

test("sortBySortOrderAndDate sorts by descending sortOrder then newest date", () => {
  const items = [
    { id: "a", sortOrder: 10, publishedAt: "2026-03-20T00:00:00.000Z" },
    { id: "b", sortOrder: 20, publishedAt: "2026-03-19T00:00:00.000Z" },
    { id: "c", sortOrder: 10, createdAt: "2026-03-21T00:00:00.000Z" }
  ];

  const result = sortBySortOrderAndDate(items).map((item) => item.id);
  assert.deepEqual(result, ["b", "c", "a"]);
});

test("sortGallery prioritizes featured items before sortOrder and date", () => {
  const items = [
    { id: "a", featured: false, sortOrder: 50, publishedAt: "2026-03-22T00:00:00.000Z" },
    { id: "b", featured: true, sortOrder: 10, publishedAt: "2026-03-18T00:00:00.000Z" },
    { id: "c", featured: true, sortOrder: 10, publishedAt: "2026-03-25T00:00:00.000Z" },
    { id: "d", featured: false, sortOrder: 60, publishedAt: "2026-03-17T00:00:00.000Z" }
  ];

  const result = sortGallery(items).map((item) => item.id);
  assert.deepEqual(result, ["c", "b", "d", "a"]);
});
