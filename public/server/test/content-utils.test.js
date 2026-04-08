import test from "node:test";
import assert from "node:assert/strict";

import {
  qs,
  slugifySeries,
  resolveArtworkSeriesEntries,
  getCompactSeriesDisplay,
  artworkMatchesSeriesMembership,
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

test("resolveArtworkSeriesEntries prefers seriesSlugs and keeps the legacy series as primary fallback", () => {
  const state = {
    seriesMeta: {
      "night-forms": { slug: "night-forms", name: "Night Forms" },
      "signal-bloom": { slug: "signal-bloom", name: "Signal Bloom" }
    }
  };

  const entries = resolveArtworkSeriesEntries({
    series: "Night Forms",
    seriesSlugs: ["night-forms", "signal-bloom"]
  }, state);

  assert.deepEqual(entries, [
    { slug: "night-forms", name: "Night Forms" },
    { slug: "signal-bloom", name: "Signal Bloom" }
  ]);
});

test("getCompactSeriesDisplay summarizes extra linked series for tight UI contexts", () => {
  const display = getCompactSeriesDisplay({
    series: "Night Forms",
    seriesSlugs: ["night-forms", "signal-bloom", "afterglow-study"]
  });

  assert.equal(display.primary?.name, "Night Forms");
  assert.equal(display.extraCount, 2);
  assert.equal(display.compactLabel, "Night Forms +2 more");
});

test("artworkMatchesSeriesMembership supports explicit memberships and legacy series fallback", () => {
  const state = {
    seriesMeta: {
      "night-forms": { slug: "night-forms", name: "Night Forms" },
      "signal-bloom": { slug: "signal-bloom", name: "Signal Bloom" }
    }
  };

  assert.equal(
    artworkMatchesSeriesMembership({ seriesSlugs: ["signal-bloom"] }, { slug: "signal-bloom", name: "Signal Bloom" }, state),
    true
  );
  assert.equal(
    artworkMatchesSeriesMembership({ series: "Night Forms" }, { slug: "night-forms", name: "Night Forms" }, state),
    true
  );
  assert.equal(
    artworkMatchesSeriesMembership({ seriesSlugs: [] }, { slug: "night-forms", name: "Night Forms" }, state),
    false
  );
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
