function normalizeSeriesSlugs(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Treat non-JSON strings as legacy values; callers fall back to artwork.series.
    }
  }

  return [];
}

function hasSeriesAssignment(artwork) {
  const seriesSlugs = normalizeSeriesSlugs(artwork?.seriesSlugs);
  if (seriesSlugs.length > 0) return true;
  return !!String(artwork?.series || "").trim();
}

export const REQUIRED_PUBLISH_METADATA_RULES = Object.freeze([
  {
    key: "title",
    label: "Title",
    test(artwork) {
      const value = String(artwork?.title || "").trim();
      return !!value && !/^untitled\b/i.test(value);
    }
  },
  {
    key: "description",
    label: "Description",
    test(artwork) {
      return !!String(artwork?.description || "").trim();
    }
  },
  {
    key: "alt",
    label: "Alt text",
    test(artwork) {
      return !!String(artwork?.alt || "").trim();
    }
  },
  {
    key: "tags",
    label: "Tags",
    test(artwork) {
      const tags = Array.isArray(artwork?.tags)
        ? artwork.tags
        : String(artwork?.tags || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
      return tags.length > 0;
    }
  },
  {
    key: "series",
    label: "Series assignment",
    test(artwork) {
      return hasSeriesAssignment(artwork);
    }
  }
]);

export function getArtworkPublishReadiness(artwork) {
  const checks = REQUIRED_PUBLISH_METADATA_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    complete: !!rule.test(artwork)
  }));
  const missing = checks.filter((item) => !item.complete).map((item) => item.label);
  return {
    checks,
    missing,
    completed: checks.length - missing.length,
    total: checks.length,
    isComplete: missing.length === 0
  };
}

export function summarizeReadinessMissing(missing, options = {}) {
  const list = Array.isArray(missing) ? missing : [];
  const limit = Math.max(1, Number(options.limit) || 3);
  if (!list.length) return options.completeLabel || "Ready to publish";
  if (list.length <= limit) return `Missing: ${list.join(", ")}`;
  return `Missing: ${list.slice(0, limit).join(", ")} +${list.length - limit}`;
}
