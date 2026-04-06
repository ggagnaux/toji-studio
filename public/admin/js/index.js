import {
  loadStateAutoSync, saveState, el, statusChip,
  setYearFooter, ensureBaseStyles,
  sortArtworksManualFirst, ensureSeriesMeta,
  showToast, confirmToast,
  getAdminToken,
    patchArtworkToBackend,
    deleteArtworkFromBackend
  } from "../admin.js";
import { applyThumbSelectAllToggleState, buildArtworkEditHref, sortArtworksForRows } from "./dashboard-utils.js";
import { initThumbSelectAllController } from "./dashboard-selection-controller.js";

  ensureBaseStyles();
  setYearFooter();

  // Auto-sync on load (token permitting)
  const state = await loadStateAutoSync();
  ensureSeriesMeta(state);
  saveState(state);

  let tab = "all";
  let q = "";
  const DASHBOARD_VIEW_KEY = "toji_dashboard_view_mode_v1";
  const ROW_SORT_BY_KEY = "toji_dashboard_row_sort_by_v1";
  const ROW_SORT_DIR_KEY = "toji_dashboard_row_sort_dir_v1";
  let viewMode = localStorage.getItem(DASHBOARD_VIEW_KEY) || "rows";
  let rowSortBy = localStorage.getItem(ROW_SORT_BY_KEY) || "none";
  let rowSortDir = localStorage.getItem(ROW_SORT_DIR_KEY) || "asc";
  if (!["none", "title", "status", "tags", "series", "year"].includes(rowSortBy)) rowSortBy = "none";
  if (!["asc", "desc"].includes(rowSortDir)) rowSortDir = "asc";

  const chips = Array.from(document.querySelectorAll("[data-tab]"));
  const qInput = document.getElementById("q");
  const rows = document.getElementById("rows");
  const rowTable = document.getElementById("rowTable");
  const rowTableShell = document.getElementById("rowTableShell");
  const thumbGrid = document.getElementById("thumbGrid");
  const thumbGridShell = document.getElementById("thumbGridShell");
  const viewModeButtons = Array.from(document.querySelectorAll("[data-view-mode]"));
  const thumbSelectAllToggle = document.getElementById("thumbSelectAllToggle");
  const sortHeaderButtons = Array.from(document.querySelectorAll("[data-sort-header]"));
  // Bulk selection
  const selected = new Set();
  let openRowActionMenuId = "";

  const selectAll = document.getElementById("selectAll");
  const bulkBar = document.getElementById("bulkBar");
  const bulkCount = document.getElementById("bulkCount");
  const bulkAction = document.getElementById("bulkAction");
  const bulkApplyBtn = document.getElementById("bulkApply");

  // Bulk tag editor
  const bulkTagBox = document.getElementById("bulkTagBox");
  const bulkTagMode = document.getElementById("bulkTagMode");
  const bulkTagInput = document.getElementById("bulkTagInput");
  const bulkTagPick = document.getElementById("bulkTagPick");
  const bulkTagApplyBtn = document.getElementById("bulkTagApply");

  // Bulk series assignment
  const bulkSeriesBox = document.getElementById("bulkSeriesBox");
  const bulkSeriesPick = document.getElementById("bulkSeriesPick");
  const bulkSeriesInput = document.getElementById("bulkSeriesInput");
  const bulkSeriesApplyBtn = document.getElementById("bulkSeriesApply");
  const bulkSeriesClearBtn = document.getElementById("bulkSeriesClear");
  const REQUIRED_METADATA_RULES = Object.freeze([
    Object.freeze({
      key: "title",
      label: "Title",
      test: (artwork) => {
        const value = String(artwork?.title || "").trim();
        return !!value && !/^untitled\b/i.test(value);
      }
    }),
    Object.freeze({
      key: "description",
      label: "Description",
      test: (artwork) => !!String(artwork?.description || "").trim()
    }),
    Object.freeze({
      key: "alt",
      label: "Alt text",
      test: (artwork) => !!String(artwork?.alt || "").trim()
    }),
    Object.freeze({
      key: "tags",
      label: "Tags",
      test: (artwork) => Array.isArray(artwork?.tags) && artwork.tags.some((tag) => String(tag || "").trim())
    }),
    Object.freeze({
      key: "series",
      label: "Series",
      test: (artwork) => !!String(artwork?.series || "").trim()
    })
  ]);

  function getArtworkMetadataAudit(artwork){
    const missing = REQUIRED_METADATA_RULES
      .filter((rule) => !rule.test(artwork))
      .map((rule) => rule.label);
    const completed = REQUIRED_METADATA_RULES.length - missing.length;
    return {
      completed,
      total: REQUIRED_METADATA_RULES.length,
      missing,
      isComplete: missing.length === 0
    };
  }

  function summarizeMissingFields(missing){
    if (!missing.length) return "Ready to publish";
    const preview = missing.slice(0, 2).join(", ");
    if (missing.length <= 2) return `Missing: ${preview}`;
    return `Missing: ${preview} +${missing.length - 2}`;
  }


  const counts = () => {
    const pub = state.artworks.filter(a => a.status === "published").length;
    const draft = state.artworks.filter(a => a.status === "draft").length;
    const hidden = state.artworks.filter(a => a.status === "hidden").length;

    document.getElementById("kPub").textContent = pub;
    document.getElementById("kDraft").textContent = draft;
    document.getElementById("kHidden").textContent = hidden;
  };

  function matches(a){
    const tabOk =
      tab === "all" ||
      (tab === "featured" ? !!a.featured : a.status === tab);

    const text = `${a.title} ${(a.tags||[]).join(" ")} ${a.series||""}`.toLowerCase();
    const qOk = !q || text.includes(q);
    return tabOk && qOk;
  }

  function sortForRows(items){
    if (rowSortBy === "none") return sortArtworksManualFirst(items);

    const fallback = sortArtworksManualFirst(items);
    return sortArtworksForRows(items, {
      sortBy: rowSortBy,
      sortDir: rowSortDir,
      fallbackItems: fallback
    });
  }

  function visibleItems(){
    const filtered = state.artworks.filter(matches);
    if (viewMode === "rows") return sortForRows(filtered);
    return sortArtworksManualFirst(filtered);
  }

  function refreshThumbSelectAllToggle(){
    applyThumbSelectAllToggleState(thumbSelectAllToggle, visibleItems(), selected);
  }

  function updateRowSortHeaders(){
    sortHeaderButtons.forEach((btn) => {
      const key = btn.getAttribute("data-sort-header") || "";
      const active = key === rowSortBy && rowSortBy !== "none";
      const th = btn.closest("th");
      const icon = btn.querySelector(".admin-sort-icon");
      btn.classList.toggle("is-active", active);
      if (icon) icon.textContent = active ? (rowSortDir === "asc" ? "\u2191" : "\u2193") : "";
      if (th) th.setAttribute("aria-sort", active ? (rowSortDir === "asc" ? "ascending" : "descending") : "none");
    });
  }

  function updateBulkUI(){
    const visible = visibleItems();
    const visibleSelected = visible.filter(a => selected.has(a.id)).length;

    bulkCount.textContent = String(selected.size);
    const hasSelection = selected.size > 0;
    if (bulkBar) {
      bulkBar.style.display = "inline-flex";
      bulkBar.classList.toggle("is-disabled", !hasSelection);
    }
    if (bulkAction) {
      bulkAction.disabled = !hasSelection;
      if (!hasSelection && bulkAction.value) bulkAction.value = "";
    }
    if (bulkApplyBtn) bulkApplyBtn.disabled = !hasSelection;
    if (!hasSelection) {
      setTagBoxVisible(false);
      setSeriesBoxVisible(false);
    }

    if (selectAll) {
      const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length;
      const noneVisibleSelected = visibleSelected === 0;
      const isIndeterminate = !allVisibleSelected && !noneVisibleSelected;
      selectAll.classList.toggle("is-selected", allVisibleSelected);
      selectAll.classList.toggle("is-indeterminate", isIndeterminate);
      selectAll.setAttribute("aria-pressed", allVisibleSelected ? "true" : "false");
      selectAll.setAttribute(
        "aria-label",
        allVisibleSelected ? "Clear all visible selections" : "Select all visible"
      );
      selectAll.textContent = allVisibleSelected ? "\u2713" : (isIndeterminate ? "\u2212" : "\u25cb");
    }

    if (thumbGrid){
      thumbGrid.querySelectorAll(".admin-thumb-card").forEach((card) => {
        const id = card.getAttribute("data-artwork-id");
        card.classList.toggle("selected", !!id && selected.has(id));
      });
    }

    rows.querySelectorAll("tr[data-artwork-id]").forEach((row) => {
      const id = row.getAttribute("data-artwork-id");
      row.classList.toggle("selected-row", !!id && selected.has(id));
    });

    updateRowSortHeaders();
    refreshThumbSelectAllToggle();
  }

  selectAll?.addEventListener("click", () => {
    const visible = visibleItems();
    const allVisibleSelected = visible.length > 0 && visible.every(a => selected.has(a.id));
    if (allVisibleSelected) visible.forEach(a => selected.delete(a.id));
    else visible.forEach(a => selected.add(a.id));
    updateBulkUI();
    render();
  });

  initThumbSelectAllController({
    button: thumbSelectAllToggle,
    getVisibleItems: visibleItems,
    selected,
    onAfterToggle() {
      updateBulkUI();
      render();
    }
  });

  // -------- Bulk tag helpers --------
  function normTag(t){
    return String(t || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/^[#]+/, "");
  }


  function parseTags(raw){
    return Array.from(new Set(
      String(raw || "")
        .split(/[,;\n]+/g)
        .map(normTag)
        .filter(Boolean)
    )).sort((a,b)=>a.localeCompare(b));
  }


  function allKnownTags(){
    const set = new Set();

    (state.tags || []).forEach(t => {
      const nt = normTag(t);
      if (nt) set.add(nt);
    });

    (state.artworks || []).forEach(a => (a.tags || []).forEach(t => {
      const nt = normTag(t);
      if (nt) set.add(nt);
    }));

    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  function refreshTagPick(){
    if (!bulkTagPick) return;
    const tags = allKnownTags();

    bulkTagPick.innerHTML = "";
    bulkTagPick.appendChild(new Option("Pick existing tag…", ""));

    for (const t of tags){
      bulkTagPick.appendChild(new Option(t, t));
    }
  }

  function setTagBoxVisible(on){
    if (!bulkTagBox) return;
    bulkTagBox.style.display = on ? "inline-flex" : "none";
    if (on){
      refreshTagPick();
      bulkTagInput?.focus();
    }
  }

  bulkAction?.addEventListener("change", () => {
    const v = bulkAction.value;
    setTagBoxVisible(v === "tags");
    setSeriesBoxVisible(v === "series");
  });

  bulkTagPick?.addEventListener("change", () => {
    const v = bulkTagPick.value;
    if (!v) return;

    const cur = bulkTagInput.value.trim();
    bulkTagInput.value = cur ? `${cur}, ${v}` : v;

    bulkTagPick.value = "";
    bulkTagInput.focus();
  });


  bulkTagApplyBtn?.addEventListener("click", async () => {
    if (!selected.size) {
      showToast("Select at least one item first.", { tone: "warn" });
      return;
    }

    const mode = bulkTagMode?.value || "add";
    const tags = parseTags(bulkTagInput?.value || "");

    if (!tags.length) {
      showToast("Enter one or more tags (comma-separated).", { tone: "warn" });
      return;
    }

    const label = mode === "remove" ? "Remove tag(s)" : "Add tag(s)";
    const ok = await confirmToast(
      `${label} [${tags.join(", ")}] for ${selected.size} selected item(s)?`,
      { confirmLabel: "Apply", cancelLabel: "Cancel", tone: "warn" }
    );
    if (!ok) return;

    const patches = [];

    for (const id of selected){
      const a = state.artworks.find(x => x.id === id);
      if (!a) continue;

      const cur = Array.isArray(a.tags) ? a.tags.map(normTag).filter(Boolean) : [];
      const set = new Set(cur);

      if (mode === "add") {
        tags.forEach(t => set.add(t));
      } else {
        tags.forEach(t => set.delete(t));
      }

      const nextTags = Array.from(set).sort((x,y)=>x.localeCompare(y));

      const changed = cur.length !== nextTags.length || cur.some((t,i)=>t !== nextTags[i]);
      if (changed){
        patches.push({ id, patch: { tags: nextTags } });
      }
    }

    if (!patches.length) {
      showToast("Nothing to change for the selected items.", { tone: "info" });
      return;
    }

    await writeThroughBatch(patches);

    // Keep global tag pool current (only adds matter)
    if (mode === "add"){
      state.tags = Array.from(new Set([...(state.tags || []), ...tags])).sort((a,b)=>a.localeCompare(b));
      saveState(state);
    }

    bulkTagInput.value = "";
    refreshTagPick();
    render();
  });



  function normSeries(s){
    return String(s || "").trim().replace(/\s+/g, " ");
  }

  function allKnownSeries(){
    const set = new Set();
    (state.series || []).forEach(s => { const ns = normSeries(s); if (ns) set.add(ns); });
    (state.artworks || []).forEach(a => { const ns = normSeries(a.series); if (ns) set.add(ns); });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  function refreshSeriesPick(){
    if (!bulkSeriesPick) return;
    const list = allKnownSeries();
    bulkSeriesPick.innerHTML = "";
    bulkSeriesPick.appendChild(new Option("Pick series…", ""));
    for (const s of list){
      bulkSeriesPick.appendChild(new Option(s, s));
    }
  }

  function setSeriesBoxVisible(on){
    if (!bulkSeriesBox) return;
    bulkSeriesBox.style.display = on ? "inline-flex" : "none";
    if (on){
      refreshSeriesPick();
      bulkSeriesInput?.focus();
    }
  }

  bulkSeriesPick?.addEventListener("change", () => {
    const v = bulkSeriesPick.value;
    if (!v) return;
    bulkSeriesInput.value = v;
    bulkSeriesPick.value = "";
    bulkSeriesInput.focus();
  });


  async function applySeriesToSelection(seriesValue){
    if (!selected.size) {
      showToast("Select at least one item first.", { tone: "warn" });
      return;
    }

    const series = normSeries(seriesValue);
    const label = series ? `Assign series "${series}"` : "Clear series";
    const ok = await confirmToast(
      `${label} for ${selected.size} selected item(s)?`,
      { confirmLabel: "Apply", cancelLabel: "Cancel", tone: "warn" }
    );
    if (!ok) return;

    const patches = [];
    for (const id of selected){
      const a = state.artworks.find(x => x.id === id);
      if (!a) continue;

      const cur = normSeries(a.series);
      const next = series;

      if (cur !== next){
        patches.push({ id, patch: { series: next } });
      }
    }

    if (!patches.length) {
      showToast("Nothing to change for the selected items.", { tone: "info" });
      return;
    }

    await writeThroughBatch(patches);

    // Keep series list fresh locally
    if (series){
      state.series = Array.from(new Set([...(state.series || []), series])).sort((a,b)=>a.localeCompare(b));
      saveState(state);
    }

    bulkSeriesInput.value = "";
    refreshSeriesPick();
    render();
  }

  bulkSeriesApplyBtn?.addEventListener("click", () => {
    applySeriesToSelection(bulkSeriesInput?.value || "");
  });

  bulkSeriesClearBtn?.addEventListener("click", () => {
    applySeriesToSelection("");
  });





  // -------- Backend write-through helpers --------
  function findById(id){ return state.artworks.find(x => x.id === id); }

  function localTouch(a){
    if (!a) return;
    a.updatedAt = new Date().toISOString();
    saveState(state);
  }

  async function writeThrough(id, patch){
    const a = findById(id);
    if (a) Object.assign(a, patch);

    if (a && patch.status === "published" && !a.publishedAt) {
      a.publishedAt = new Date().toISOString();
    }

    if (a) localTouch(a);

    if (!getAdminToken()) return;

    try {
      const updated = await patchArtworkToBackend(id, patch);
      const target = findById(id);
      if (target) Object.assign(target, updated);
      localTouch(target || a);
    } catch (e) {
      console.warn("Dashboard write-through failed; local cache kept.", e);
    }
  }

  async function writeThroughBatch(patches){
    // Local first
    for (const { id, patch } of patches){
      const a = findById(id);
      if (a) Object.assign(a, patch);
      if (a && patch.status === "published" && !a.publishedAt) a.publishedAt = new Date().toISOString();
      if (a) a.updatedAt = new Date().toISOString();
    }
    saveState(state);

    if (!getAdminToken()) return;

    const jobs = patches.map(({ id, patch }) =>
      patchArtworkToBackend(id, patch)
        .then(updated => ({ ok:true, id, updated }))
        .catch(err => ({ ok:false, id, err }))
    );

    const results = await Promise.all(jobs);

    for (const r of results){
      if (!r.ok) continue;
      const a = findById(r.id);
      if (a) Object.assign(a, r.updated);
    }
    saveState(state);

    const fails = results.filter(r => !r.ok);
    if (fails.length) console.warn("Some bulk updates failed; local cache kept for those.", fails);
  }


  async function bulkDeleteSelected(){
    // Local-first removal (fast UI)
    const ids = Array.from(selected);

    // Remove from local state immediately
    const idSet = new Set(ids);
    state.artworks = state.artworks.filter(a => !idSet.has(a.id));
    saveState(state);
    render();

    // No token? stop here (local cache removed)
    if (!getAdminToken()) {
      showToast("Deleted locally, but no active admin session was available, so the backend was not updated.", { tone: "warn", duration: 3200 });
      return;
    }

    // Backend deletes
    const jobs = ids.map(id =>
      deleteArtworkFromBackend(id)
        .then(() => ({ ok:true, id }))
        .catch(err => ({ ok:false, id, err }))
    );

    const results = await Promise.all(jobs);
    const fails = results.filter(r => !r.ok);

    if (fails.length) {
      console.warn("Some deletes failed:", fails);

      showToast(
        `Some deletes failed on the backend (${fails.length}/${ids.length}).\n\n` +
        `Those items may reappear after refresh/sync. Check console for details.`
      , { tone: "error", duration: 4200 });
    }
  }








  // -------- Bulk actions menu (non-tag actions) --------
  function buildBulkPatches(action){
    const patches = [];

    for (const id of selected) {
      const a = state.artworks.find(x => x.id === id);
      if (!a) continue;

      if (action === "publish") {
        if (a.status !== "published") patches.push({ id, patch: { status: "published" } });
      } else if (action === "draft") {
        if (a.status !== "draft") patches.push({ id, patch: { status: "draft" } });
      } else if (action === "hidden") {
        if (a.status !== "hidden") patches.push({ id, patch: { status: "hidden" } });
      } else if (action === "feature") {
        if (!a.featured) patches.push({ id, patch: { featured: true } });
      } else if (action === "unfeature") {
        if (a.featured) patches.push({ id, patch: { featured: false } });
      }
    }

    return patches;
  }

  bulkApplyBtn?.addEventListener("click", async () => {
    const action = bulkAction?.value || "";
    if (!action) return;

    if (action === "clear") {
      selected.clear();
      bulkAction.value = "";
      setTagBoxVisible(false);
      updateBulkUI();
      render();
      return;
    }

    if (action === "tags") {
      setTagBoxVisible(true);
      return;
    }

    if (action === "series") {
      setSeriesBoxVisible(true);
      return;
    }



    if (action === "delete") {
      if (!selected.size) {
        showToast("Select at least one item first.", { tone: "warn" });
        bulkAction.value = "";
        return;
      }

      const ok = await confirmToast(
        `Delete ${selected.size} selected item(s)?\n\n` +
        `This will remove the artworks and their files on the server.\n` +
        `This cannot be undone.`,
        { confirmLabel: "Delete", cancelLabel: "Cancel", tone: "warn" }
      );
      if (!ok) return;

      await bulkDeleteSelected();

      // reset UI
      selected.clear();
      bulkAction.value = "";
      setTagBoxVisible(false);
      setSeriesBoxVisible(false);
      updateBulkUI();
      render();
      return;
    }



    if (!selected.size) {
      showToast("Select at least one item first.", { tone: "warn" });
      bulkAction.value = "";
      return;
    }

    const labels = {
      publish: "Publish",
      draft: "Set Draft",
      hidden: "Hide",
      feature: "Feature",
      unfeature: "Unfeature",
      delete: "Delete"
    };

    const ok = await confirmToast(
      `${labels[action] || "Apply"} ${selected.size} selected item(s)?`,
      { confirmLabel: "Apply", cancelLabel: "Cancel", tone: "warn" }
    );
    if (!ok) return;

    const patches = buildBulkPatches(action);

    if (!patches.length) {
      showToast("Nothing to change for the selected items.", { tone: "info" });
      bulkAction.value = "";
      setTagBoxVisible(false);
      return;
    }

    await writeThroughBatch(patches);

    selected.clear();
    bulkAction.value = "";
    setTagBoxVisible(false);
    setSeriesBoxVisible(false);
    updateBulkUI();
    render();
  });

  bulkAction?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") bulkApplyBtn?.click();
  });

  // -------- Row actions --------
  function setStatus(id, next){
    writeThrough(id, { status: next });
    render();
  }

  function toggleFeatured(id){
    const a = findById(id);
    if (!a) return;
    writeThrough(id, { featured: !a.featured });
    render();
  }

  function getArtworkPublicUrl(artwork){
    return new URL(`../artwork.html?id=${encodeURIComponent(artwork?.id || "")}`, window.location.href).href;
  }

  async function copyTextToClipboard(text, successMessage){
    try {
      await navigator.clipboard.writeText(String(text || ""));
      showToast(successMessage || "Copied to clipboard.", { tone: "success" });
    } catch (error) {
      showToast(`Copy failed: ${error?.message || error}`, { tone: "error", duration: 4200 });
    }
  }

  function createDuplicateArtworkId(sourceId){
    const base = String(sourceId || "artwork").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "artwork";
    const unique = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return `${base}-copy-${unique}`;
  }

  function createDuplicateArtworkTitle(sourceTitle){
    const base = String(sourceTitle || "Untitled").trim() || "Untitled";
    const existingTitles = new Set((state.artworks || []).map((artwork) => String(artwork?.title || "").trim().toLowerCase()));
    if (!existingTitles.has(`${base} (copy)`.toLowerCase())) return `${base} (Copy)`;
    let n = 2;
    while (existingTitles.has(`${base} (copy ${n})`.toLowerCase())) n += 1;
    return `${base} (Copy ${n})`;
  }

  function duplicateArtwork(id){
    const artwork = findById(id);
    if (!artwork) return;

    const now = new Date().toISOString();
    const copy = {
      ...JSON.parse(JSON.stringify(artwork)),
      id: createDuplicateArtworkId(artwork.id),
      title: createDuplicateArtworkTitle(artwork.title),
      status: "draft",
      featured: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };

    state.artworks.unshift(copy);
    saveState(state);
    openRowActionMenuId = "";
    showToast("Duplicate created locally in Studio state.", { tone: "success" });
    render();
  }

  function toggleRowActionMenu(id){
    openRowActionMenuId = openRowActionMenuId === id ? "" : id;
    render();
  }

  function closeRowActionMenu(){
    if (!openRowActionMenuId) return;
    openRowActionMenuId = "";
    render();
  }

  async function deleteArtwork(id){
    const a = findById(id);
    if (!a) return;

    const label = a.title ? `"${a.title}"` : id;
    const ok = await confirmToast(
      `Delete ${label}?\n\nThis will remove the artwork and its files on the server.`,
      { confirmLabel: "Delete", cancelLabel: "Cancel", tone: "warn" }
    );
    if (!ok) return;

    // Local-first removal (snappy)
    const idx = state.artworks.findIndex(x => x.id === id);
    if (idx >= 0) state.artworks.splice(idx, 1);
    selected?.delete?.(id);
    saveState(state);
    render();

    // Backend write-through
    if (!getAdminToken()) return;

    try {
      await deleteArtworkFromBackend(id);
    } catch (e) {
      console.warn("Delete failed on backend; local cache already removed.", e);
      showToast(`Delete failed on backend: ${e?.message || e}. Refresh may bring the item back.`, { tone: "error", duration: 4200 });
    }
  }

  document.addEventListener("click", (event) => {
    if (!openRowActionMenuId) return;
    if (event.target.closest(".admin-artwork-actions")) return;
    closeRowActionMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !openRowActionMenuId) return;
    event.preventDefault();
    closeRowActionMenu();
  });

  function render(){
    counts();
    rows.innerHTML = "";
    if (thumbGrid) thumbGrid.innerHTML = "";

    const items = visibleItems();

    for (const a of items){
      const title = String(a.title || "Untitled");
      const audit = getArtworkMetadataAudit(a);
      const isSelected = selected.has(a.id);
      const primaryStatus = a.status === "published" ? "draft" : "published";
      const primaryStatusLabel = a.status === "published" ? "Move to Draft" : "Publish";
      const hideStatusLabel = a.status === "hidden" ? "Move to Draft" : "Hide";
      const metadataParts = [`ID ${a.id}`];
      if (Array.isArray(a.tags) && a.tags.length) metadataParts.push(`${a.tags.length} tag${a.tags.length === 1 ? "" : "s"}`);
      const menuOpen = openRowActionMenuId === a.id;

      const tr = el("tr", {
        "data-artwork-id": a.id,
        class: `admin-artwork-row${isSelected ? " selected-row" : ""}`,
      },
        el("td", {},
          el("button", {
            type: "button",
            class: `admin-row-select${isSelected ? " is-selected" : ""}`,
            "aria-label": `${isSelected ? "Deselect" : "Select"} ${title}`,
            "aria-pressed": isSelected ? "true" : "false",
            onclick: (e) => {
              e.stopPropagation();
              if (selected.has(a.id)) selected.delete(a.id);
              else selected.add(a.id);
              render();
            }
          }, isSelected ? "\u2713" : "\u25cb")
        ),
        el("td", {},
          el("div", { class:"admin-artwork-summary" },
            el("a", {
              class: "admin-artwork-thumb",
              href: buildArtworkEditHref(a.id),
              title: title,
              "aria-label": `Edit ${title}`
            },
              el("img", { src: a.thumb || a.image, alt: title, loading:"lazy" })
            ),
            el("div", { class:"admin-artwork-copy" },
              el("div", { class:"admin-artwork-title-row" },
                el("a", { class:"admin-artwork-link", href: buildArtworkEditHref(a.id) }, title),
                a.featured ? el("span", { class:"admin-artwork-featured" }, "Featured") : null
              ),
              el("div", { class:"admin-artwork-meta" }, metadataParts.join(" | ")),
              el("div", { class:"admin-artwork-completeness" },
                el("span", {
                  class:`admin-completeness-pill${audit.isComplete ? " is-complete" : " is-incomplete"}`,
                  title: audit.isComplete ? "All required metadata fields are present." : `Missing: ${audit.missing.join(", ")}`
                }, `${audit.completed}/${audit.total} ready`),
                el("span", {
                  class:"admin-completeness-note",
                  title: audit.isComplete ? "Ready to publish" : `Missing: ${audit.missing.join(", ")}`
                }, summarizeMissingFields(audit.missing))
              )
            )
          )
        ),
        el("td", { class:"admin-artwork-status", "data-label":"Status" },
          el("div", { class:"admin-artwork-status-stack" },
            statusChip(a.status),
            el("span", {
              class:`admin-completeness-pill admin-completeness-pill--compact${audit.isComplete ? " is-complete" : " is-incomplete"}`,
              title: audit.isComplete ? "All required metadata fields are present." : `Missing: ${audit.missing.join(", ")}`
            }, audit.isComplete ? "Complete" : `${audit.missing.length} missing`)
          )
        ),
        el("td", { class:"admin-artwork-series", "data-label":"Series" }, a.series || "-"),
        el("td", { class:"admin-artwork-year", "data-label":"Year" }, a.year || "-"),
        el("td", { class:"admin-artwork-actions", "data-label":"Actions" },
          el("div", { class:"admin-artwork-action-row" },
            el("a", { class:"admin-artwork-action-link", href: buildArtworkEditHref(a.id) }, "Edit"),
            el("button", {
              class:"admin-artwork-action-button",
              type:"button",
              onclick:()=>setStatus(a.id, primaryStatus)
            }, primaryStatusLabel),
            el("button", {
              class:"admin-artwork-overflow-trigger",
              type:"button",
              "aria-label": `More actions for ${title}`,
              "aria-haspopup":"menu",
              "aria-expanded": menuOpen ? "true" : "false",
              onclick:(event)=>{
                event.stopPropagation();
                toggleRowActionMenu(a.id);
              }
            }, "\u22ef")
          ),
          el("div", {
            class:"admin-artwork-overflow-menu",
            role:"menu",
            hidden: menuOpen ? null : "",
            "aria-label": `More actions for ${title}`
          },
            el("button", { type:"button", role:"menuitem", onclick:()=>{ openRowActionMenuId = ""; toggleFeatured(a.id); } }, a.featured ? "Unfeature" : "Feature"),
            el("button", { type:"button", role:"menuitem", onclick:()=>{ openRowActionMenuId = ""; setStatus(a.id, a.status === "hidden" ? "draft" : "hidden"); } }, hideStatusLabel),
            el("button", { type:"button", role:"menuitem", onclick:()=>duplicateArtwork(a.id) }, "Duplicate"),
            el("button", { type:"button", role:"menuitem", onclick:()=>{ openRowActionMenuId = ""; copyTextToClipboard(getArtworkPublicUrl(a), "Public link copied."); render(); } }, "Copy link"),
            el("button", {
              type:"button",
              role:"menuitem",
              onclick:()=>{
                openRowActionMenuId = "";
                window.open(getArtworkPublicUrl(a), "_blank", "noopener,noreferrer");
                render();
              }
            }, "View public page"),
            el("button", { class:"danger", type:"button", role:"menuitem", onclick:()=>{ openRowActionMenuId = ""; deleteArtwork(a.id); render(); } }, "Delete")
          )
        )
      );

      rows.appendChild(tr);

      if (thumbGrid){
        const card = el("article", {
          class: `admin-thumb-card${selected.has(a.id) ? " selected" : ""}`,
          "data-artwork-id": a.id
        },
          el("label", { class: "admin-thumb-select" },
            el("input", {
              type: "checkbox",
              checked: selected.has(a.id) ? "" : null,
              "aria-label": `Select ${a.title || a.id}`,
              onchange: (e) => {
                if (e.target.checked) selected.add(a.id);
                else selected.delete(a.id);
                updateBulkUI();
                render();
              }
            })
          ),
          el("a", {
            class: "admin-thumb-media",
            href: buildArtworkEditHref(a.id),
            title: a.title || "Untitled"
          },
            el("img", { src: a.thumb || a.image, alt: a.title || "Artwork thumbnail", loading: "lazy" })
          )
          ,
          el("div", { class:"admin-thumb-meta" },
            el("div", { class:"admin-thumb-title", title }, title),
            el("div", { class:"admin-thumb-completeness" },
              el("span", {
                class:`admin-completeness-pill admin-completeness-pill--compact${audit.isComplete ? " is-complete" : " is-incomplete"}`,
                title: audit.isComplete ? "All required metadata fields are present." : `Missing: ${audit.missing.join(", ")}`
              }, audit.isComplete ? "Complete" : `${audit.missing.length} missing`),
              el("span", {
                class:"admin-thumb-note",
                title: audit.isComplete ? "Ready to publish" : `Missing: ${audit.missing.join(", ")}`
              }, summarizeMissingFields(audit.missing))
            )
          )
        );

        thumbGrid.appendChild(card);
      }
    }

    if (!items.length){
      rows.appendChild(
        el("tr", {},
          el("td", { colspan:"6" },
            el("div", { class:"sub", style:"padding:14px" }, "No items match your filter.")
          )
        )
      );
    }

    if (thumbGrid && !items.length){
      thumbGrid.appendChild(
        el("div", { class:"sub", style:"padding:14px" }, "No items match your filter.")
      );
    }

    // Keep tag editor visibility sane if selection goes to 0
    if (!selected.size){
      setTagBoxVisible(false);
      setSeriesBoxVisible(false);
      if (bulkAction) bulkAction.value = "";
    }

    updateBulkUI();
    applyViewModeUI();
  }

  function applyViewModeUI(){
    const thumbs = viewMode === "thumbs";
    if (rowTableShell) rowTableShell.style.display = thumbs ? "none" : "";
    else if (rowTable) rowTable.style.display = thumbs ? "none" : "";
    if (thumbGridShell) thumbGridShell.style.display = thumbs ? "" : "none";
    if (thumbGrid) thumbGrid.style.display = thumbs ? "grid" : "none";
    if (thumbSelectAllToggle) thumbSelectAllToggle.style.display = thumbs ? "inline-flex" : "none";
    sortHeaderButtons.forEach((btn) => {
      btn.disabled = thumbs;
    });

    viewModeButtons.forEach((btn) => {
      const active = btn.getAttribute("data-view-mode") === viewMode;
      btn.classList.toggle("active", active);
    });

    refreshThumbSelectAllToggle();
  }

  viewModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-view-mode");
      if (!next || next === viewMode) return;
      viewMode = next;
      localStorage.setItem(DASHBOARD_VIEW_KEY, viewMode);
      applyViewModeUI();
    });
  });

  sortHeaderButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-sort-header") || "none";
      if (viewMode !== "rows" || key === "none") return;
      if (rowSortBy === key) rowSortDir = rowSortDir === "asc" ? "\u2191" : "\u2193";
      else {
        rowSortBy = key;
        rowSortDir = key === "year" ? "desc" : "asc";
      }
      localStorage.setItem(ROW_SORT_BY_KEY, rowSortBy);
      localStorage.setItem(ROW_SORT_DIR_KEY, rowSortDir);
      render();
    });
  });






  chips.forEach(c => c.addEventListener("click", () => {
    chips.forEach(x => x.classList.remove("active"));
    c.classList.add("active");
    tab = c.getAttribute("data-tab");
    render();
  }));

  qInput.addEventListener("input", (e) => {
    q = e.target.value.trim().toLowerCase();
    render();
  });

  render();














