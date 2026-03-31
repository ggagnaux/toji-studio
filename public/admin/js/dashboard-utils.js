export function buildArtworkEditHref(artworkId = "") {
  return `edit.html?id=${encodeURIComponent(artworkId || "")}`;
}

export function applyThumbSelectAllToggleState(toggleEl, visibleItems = [], selectedIds = new Set()) {
  if (!toggleEl) return { label: "", disabled: true, allVisibleSelected: false };
  const visible = Array.isArray(visibleItems) ? visibleItems : [];
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  const visibleCount = visible.length;
  const selectedVisibleCount = visible.filter((item) => selectedSet.has(item?.id)).length;
  const allVisibleSelected = visibleCount > 0 && selectedVisibleCount === visibleCount;
  const label = allVisibleSelected ? "Clear all thumbs" : "Select all thumbs";
  toggleEl.textContent = label;
  toggleEl.disabled = visibleCount === 0;
  return { label, disabled: toggleEl.disabled, allVisibleSelected };
}

export function rowSortValue(artwork, key) {
  if (key === "title") return String(artwork?.title || "").toLowerCase();
  if (key === "status") {
    const order = { draft: 0, published: 1, hidden: 2 };
    return order[String(artwork?.status || "").toLowerCase()] ?? 99;
  }
  if (key === "tags") return (artwork?.tags || []).map((tag) => String(tag || "").toLowerCase()).sort().join(" ");
  if (key === "series") return String(artwork?.series || "").toLowerCase();
  if (key === "year") {
    const value = Number(String(artwork?.year || "").trim());
    return Number.isFinite(value) ? value : -Infinity;
  }
  return "";
}

export function sortArtworksForRows(items, {
  sortBy = "none",
  sortDir = "asc",
  fallbackItems = []
} = {}) {
  const list = Array.isArray(items) ? items.slice() : [];
  if (sortBy === "none") return list;

  const fallback = Array.isArray(fallbackItems) && fallbackItems.length ? fallbackItems : list;
  const fallbackIndex = new Map(fallback.map((artwork, index) => [artwork.id, index]));
  const dir = sortDir === "desc" ? -1 : 1;

  return list.sort((a, b) => {
    const av = rowSortValue(a, sortBy);
    const bv = rowSortValue(b, sortBy);

    if (typeof av === "number" && typeof bv === "number") {
      if (av !== bv) return (av - bv) * dir;
    } else {
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return cmp * dir;
    }

    return (fallbackIndex.get(a?.id) ?? 0) - (fallbackIndex.get(b?.id) ?? 0);
  });
}
