import test from "node:test";
import assert from "node:assert/strict";

import {
  applyThumbSelectAllToggleState,
  buildArtworkEditHref,
  rowSortValue,
  sortArtworksForRows
} from "../../admin/js/dashboard-utils.js";

test("buildArtworkEditHref encodes artwork ids for admin edit links", () => {
  assert.equal(buildArtworkEditHref("art work/1"), "edit.html?id=art%20work%2F1");
});

test("applyThumbSelectAllToggleState updates label and disabled state from visible selection", () => {
  const toggleEl = { textContent: "", disabled: false };

  const empty = applyThumbSelectAllToggleState(toggleEl, [], new Set());
  assert.equal(empty.label, "Select all thumbs");
  assert.equal(empty.disabled, true);
  assert.equal(toggleEl.textContent, "Select all thumbs");
  assert.equal(toggleEl.disabled, true);

  const partial = applyThumbSelectAllToggleState(toggleEl, [{ id: "a" }, { id: "b" }], new Set(["a"]));
  assert.equal(partial.label, "Select all thumbs");
  assert.equal(partial.allVisibleSelected, false);
  assert.equal(toggleEl.disabled, false);

  const full = applyThumbSelectAllToggleState(toggleEl, [{ id: "a" }, { id: "b" }], new Set(["a", "b"]));
  assert.equal(full.label, "Clear all thumbs");
  assert.equal(full.allVisibleSelected, true);
  assert.equal(toggleEl.textContent, "Clear all thumbs");
});

test("rowSortValue normalizes text, status, tags, series, and year values", () => {
  const artwork = {
    title: "Sunrise",
    status: "published",
    tags: ["Portrait", "Concept Art"],
    series: "Dreams",
    year: "2024"
  };

  assert.equal(rowSortValue(artwork, "title"), "sunrise");
  assert.equal(rowSortValue(artwork, "status"), 1);
  assert.equal(rowSortValue(artwork, "tags"), "concept art portrait");
  assert.equal(rowSortValue(artwork, "series"), "dreams");
  assert.equal(rowSortValue(artwork, "year"), 2024);
});

test("sortArtworksForRows sorts by the requested field and keeps fallback order for ties", () => {
  const artworks = [
    { id: "b", title: "Beta", status: "draft", tags: ["zeta"], series: "Moon", year: "2023" },
    { id: "c", title: "alpha", status: "published", tags: ["beta"], series: "Sun", year: "2024" },
    { id: "a", title: "Alpha", status: "published", tags: ["alpha"], series: "Sun", year: "2022" }
  ];

  const byTitle = sortArtworksForRows(artworks, {
    sortBy: "title",
    sortDir: "asc",
    fallbackItems: artworks
  });
  assert.deepEqual(byTitle.map((artwork) => artwork.id), ["c", "a", "b"]);

  const byYearDesc = sortArtworksForRows(artworks, {
    sortBy: "year",
    sortDir: "desc",
    fallbackItems: artworks
  });
  assert.deepEqual(byYearDesc.map((artwork) => artwork.id), ["c", "b", "a"]);

  const byStatus = sortArtworksForRows(artworks, {
    sortBy: "status",
    sortDir: "asc",
    fallbackItems: artworks
  });
  assert.deepEqual(byStatus.map((artwork) => artwork.id), ["b", "c", "a"]);
});
