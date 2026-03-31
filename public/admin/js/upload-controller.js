import { buildAdminLoginRedirect } from "./session-utils.js";

export function parseUploadTags(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[,;\n]+/g)
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);

  return Array.from(new Set(source.map((entry) => String(entry || "").trim().replace(/^#+/, "").toLowerCase()).filter(Boolean)));
}

export function requireUploadAdminSession({
  getAdminToken,
  windowRef = globalThis.window
} = {}) {
  if (getAdminToken?.()) return true;
  const location = windowRef?.location || {};
  const nextHref = buildAdminLoginRedirect(location.pathname, location.search, location.hash);
  if ("href" in location) location.href = nextHref;
  throw new Error("Please sign in to continue.");
}

export function syncUploadStatusPills(statusSelect, statusPills = []) {
  const current = String(statusSelect?.value || "draft").toLowerCase();
  statusPills.forEach((btn) => {
    const value = String(btn?.getAttribute?.("data-status-pill") || "").toLowerCase();
    const active = value === current;
    btn?.classList?.toggle?.("active", active);
    btn?.setAttribute?.("aria-pressed", active ? "true" : "false");
  });
  if (statusSelect && !statusSelect.value) statusSelect.value = "draft";
  return current || "draft";
}

export function toggleUploadTagFilter(selectedTagFilters, rawValue) {
  const value = String(rawValue || "").toLowerCase();
  if (!value) return false;
  if (selectedTagFilters.has(value)) {
    selectedTagFilters.delete(value);
    return false;
  }
  selectedTagFilters.add(value);
  return true;
}

export function syncUploadTagFilterPills(tagFilterPills = [], selectedTagFilters = new Set()) {
  tagFilterPills.forEach((btn) => {
    const value = String(btn?.getAttribute?.("data-tag-filter") || "").toLowerCase();
    const active = selectedTagFilters.has(value);
    btn?.classList?.toggle?.("is-active", active);
    btn?.setAttribute?.("aria-pressed", active ? "true" : "false");
  });
}

export function initUploadFilterControllers({
  statusSelect,
  statusPills = [],
  tagFilterPills = [],
  selectedTagFilters = new Set(),
  onTagFilterChange,
  onStatusChange
} = {}) {
  const statusHandlers = statusPills.map((btn) => {
    const handler = () => {
      const value = String(btn?.getAttribute?.("data-status-pill") || "").toLowerCase();
      if (!value || !statusSelect) return;
      statusSelect.value = value;
      syncUploadStatusPills(statusSelect, statusPills);
      onStatusChange?.(value);
    };
    btn?.addEventListener?.("click", handler);
    return { btn, handler };
  });

  const tagHandlers = tagFilterPills.map((btn) => {
    const handler = () => {
      const value = String(btn?.getAttribute?.("data-tag-filter") || "").toLowerCase();
      if (!value) return;
      toggleUploadTagFilter(selectedTagFilters, value);
      syncUploadTagFilterPills(tagFilterPills, selectedTagFilters);
      onTagFilterChange?.(selectedTagFilters);
    };
    btn?.addEventListener?.("click", handler);
    return { btn, handler };
  });

  syncUploadStatusPills(statusSelect, statusPills);
  syncUploadTagFilterPills(tagFilterPills, selectedTagFilters);

  return {
    dispose() {
      statusHandlers.forEach(({ btn, handler }) => btn?.removeEventListener?.("click", handler));
      tagHandlers.forEach(({ btn, handler }) => btn?.removeEventListener?.("click", handler));
    }
  };
}

