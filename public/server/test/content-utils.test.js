import test from "node:test";
import assert from "node:assert/strict";

import {
  qs,
  slugifySeries,
  resolveArtworkSeriesEntries,
  getCompactSeriesDisplay,
  artworkMatchesSeriesMembership,
  sortBySortOrderAndDate,
  sortGallery,
  sortFeaturedByDate,
  sortFeaturedBySeriesAndDate
} from "../../assets/js/content-utils.js";

const ORIGINAL_LOCATION = globalThis.location;

test("featured groups stay alphabetical even when another series has newer images", () => {
  const items = [
    { id: "a-old", seriesSlugs: ["a"], year: "2020" },
    { id: "b-new", seriesSlugs: ["b"], title: "20290301" },
    { id: "none-new", seriesSlugs: [], title: "20270101" },
    { id: "a-new", seriesSlugs: ["a"], originalPath: "image20260101.png" },
    { id: "b-old", seriesSlugs: ["b"], description: "Made 20240202" },
    { id: "none-old", year: "2019" }
  ];
  assert.deepEqual(sortFeaturedBySeriesAndDate(items).map(item => item.id),
    ["a-new", "a-old", "b-new", "b-old", "none-new", "none-old"]);
  assert.equal(items[0].id, "a-old");
});

test("featured groups sort by series display name before artwork dates", () => {
  const state = { seriesMeta: {
    z: { slug: "z", name: "Alpha" },
    a: { slug: "a", name: "Zebra" }
  } };
  const items = [
    { id: "zebra", seriesSlugs: ["a"], year: "2026" },
    { id: "alpha", seriesSlugs: ["z"], year: "2020" }
  ];
  assert.deepEqual(sortFeaturedBySeriesAndDate(items, state).map(item => item.id), ["alpha", "zebra"]);
});

test("featured grouping uses primary membership once and supports legacy and unassigned artworks", () => {
  const items = [
    { id: "multi", seriesSlugs: ["night-forms", "other"], series: "Other", year: "2026" },
    { id: "other", seriesSlugs: ["other"], year: "2025" },
    { id: "legacy", series: "Night Forms", year: "2024" },
    { id: "unassigned", seriesSlugs: [], series: "Night Forms", year: "2030" },
    { id: "undated", seriesSlugs: ["night-forms"] }
  ];
  const sorted = sortFeaturedBySeriesAndDate(items);
  assert.deepEqual(sorted.map(item => item.id), ["multi", "legacy", "undated", "other", "unassigned"]);
  assert.equal(new Set(sorted.map(item => item.id)).size, items.length);
  assert.deepEqual(sortFeaturedBySeriesAndDate([]), []);
});

test("featured dates follow path, title, description, year precedence newest first", () => {
  const items = [
    { id: "path", originalPath: "/originals/prefix20240115extra.png", title: "20261231", year: "2027" },
    { id: "title", title: "Artwork20250202-final", description: "20260101", year: "2028" },
    { id: "description", description: "Created on 20250304 with extra text", year: "2029" },
    { id: "year", year: "2026" },
    { id: "unknown", publishedAt: "2030-01-01", sortOrder: 999 }
  ];
  assert.deepEqual(sortFeaturedByDate(items).map(item => item.id), ["year", "description", "title", "path", "unknown"]);
  assert.equal(items[0].id, "path");
});

test("featured date extraction skips invalid dates and uses the first valid match", () => {
  const items = [
    { id: "invalid", originalPath: "20230229-20241301-20240431", title: "20230101" },
    { id: "leap", originalPath: "bad20230229-good20240229-later20260101" },
    { id: "year", description: "no date here", year: 2024 },
    { id: "missing", year: "unknown" },
    { id: "century", title: "19000229", year: "2000" },
    { id: "leapCentury", title: "20000229" }
  ];
  assert.deepEqual(sortFeaturedByDate(items).map(item => item.id), ["leap", "year", "invalid", "leapCentury", "century", "missing"]);
});

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

test("resolveArtworkSeriesEntries returns no entries for unassigned artwork", () => {
  const entries = resolveArtworkSeriesEntries({
    series: "",
    seriesSlugs: []
  }, {
    seriesMeta: {
      "night-forms": { slug: "night-forms", name: "Night Forms" }
    }
  });

  assert.deepEqual(entries, []);
});

test("resolveArtworkSeriesEntries ignores stale legacy series when explicit memberships are empty", () => {
  const entries = resolveArtworkSeriesEntries({
    series: "Night Forms",
    seriesSlugs: []
  }, {
    seriesMeta: {
      "night-forms": { slug: "night-forms", name: "Night Forms" }
    }
  });

  assert.deepEqual(entries, []);
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
