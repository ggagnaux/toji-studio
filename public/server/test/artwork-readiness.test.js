import test from "node:test";
import assert from "node:assert/strict";

import {
  getArtworkPublishReadiness,
  summarizeReadinessMissing
} from "../../admin/js/artwork-readiness.js";

test("publish readiness does not require a series assignment", () => {
  const audit = getArtworkPublishReadiness({
    title: "Signal Study",
    description: "A finished artwork description.",
    alt: "Abstract red and black digital artwork.",
    tags: ["abstract", "digital"],
    series: "",
    seriesSlugs: []
  });

  assert.equal(audit.isComplete, true);
  assert.equal(audit.completed, 4);
  assert.equal(audit.total, 4);
  assert.deepEqual(audit.missing, []);
  assert.equal(summarizeReadinessMissing(audit.missing), "Ready to publish");
});

test("publish readiness reports only the remaining required non-series metadata", () => {
  const audit = getArtworkPublishReadiness({
    title: "Untitled upload",
    description: "",
    alt: "",
    tags: [],
    series: "",
    seriesSlugs: []
  });

  assert.equal(audit.isComplete, false);
  assert.deepEqual(audit.missing, ["Title", "Description", "Alt text", "Tags"]);
});
