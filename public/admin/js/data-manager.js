import {
  ensureBaseStyles,
  setYearFooter,
  API_BASE,
  getAdminToken,
  apiFetch,
  confirmToast,
  showToast,
  el
} from "../admin.js";

ensureBaseStyles();
setYearFooter();
ensureDataManagerStyles();

const exportTabBtn = document.getElementById("dataTabExport");
const importTabBtn = document.getElementById("dataTabImport");
const maintenanceTabBtn = document.getElementById("dataTabMaintenance");
const exportPanel = document.getElementById("dataPanelExport");
const importPanel = document.getElementById("dataPanelImport");
const maintenancePanel = document.getElementById("dataPanelMaintenance");
const exportTableList = document.getElementById("exportTableList");
const exportDatabaseStatus = document.getElementById("exportDatabaseStatus");
const exportSelectionSummary = document.getElementById("exportSelectionSummary");
const exportSelectAllBtn = document.getElementById("exportSelectAllBtn");
const exportClearAllBtn = document.getElementById("exportClearAllBtn");
const exportSelectedBtn = document.getElementById("exportSelectedBtn");
const importBundleInput = document.getElementById("importBundleInput");
const importBundleName = document.getElementById("importBundleName");
const importDatabaseStatus = document.getElementById("importDatabaseStatus");
const importPreviewSummary = document.getElementById("importPreviewSummary");
const importPreviewList = document.getElementById("importPreviewList");
const importCommitBtn = document.getElementById("importCommitBtn");
const cleanupBtn = document.getElementById("cleanupBtn");
const cleanupStatus = document.getElementById("cleanupStatus");

const state = {
  tables: [],
  exportSelection: new Set(),
  importBundle: null,
  importPreview: null,
  importSelection: new Set(),
  activeTab: "export"
};

function ensureDataManagerStyles() {
  if (document.getElementById("data-manager-styles")) return;
  const style = document.createElement("style");
  style.id = "data-manager-styles";
  style.textContent = [
    ".data-manager-list{display:grid;gap:10px;}",
    ".data-manager-table{display:grid;gap:8px;padding:12px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb, var(--panel) 86%, transparent);}",
    ".data-manager-table__head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;}",
    ".data-manager-table__check{display:flex;align-items:flex-start;gap:10px;cursor:pointer;}",
    ".data-manager-table__check input{width:auto;min-width:0;margin-top:2px;flex:0 0 auto;}",
    ".data-manager-pills{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}",
    ".data-manager-pill{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:999px;border:1px solid var(--line);font-size:12px;line-height:1.35;color:var(--muted);background:color-mix(in srgb, var(--panel) 82%, transparent);}",
    ".data-manager-pill.is-safe{border-color:color-mix(in srgb, #2ea97d 60%, var(--line));color:#2ea97d;background:color-mix(in srgb, #2ea97d 14%, var(--panel));}",
    ".data-manager-pill.is-export-only{border-color:color-mix(in srgb, #d18b2e 60%, var(--line));color:#d18b2e;background:color-mix(in srgb, #d18b2e 14%, var(--panel));}",
    ".data-manager-pill.is-error{border-color:color-mix(in srgb, #d15353 60%, var(--line));color:#d15353;background:color-mix(in srgb, #d15353 14%, var(--panel));}",
    ".data-manager-messages{display:grid;gap:6px;}",
    ".data-manager-message{padding:8px 10px;border-radius:10px;border:1px solid var(--line);font-size:13px;line-height:1.45;}",
    ".data-manager-message--warn{border-color:color-mix(in srgb, #d18b2e 60%, var(--line));background:color-mix(in srgb, #d18b2e 12%, var(--panel));}",
    ".data-manager-message--error{border-color:color-mix(in srgb, #d15353 60%, var(--line));background:color-mix(in srgb, #d15353 12%, var(--panel));}",
    "#importBundleInput{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;margin:-1px;padding:0;}",
    ".data-manager-filepick{display:inline-flex;align-items:center;gap:10px;max-width:min(100%, 520px);padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb, var(--panel) 86%, transparent);cursor:pointer;}",
    ".data-manager-filepick:hover{border-color:var(--accent-border);background:color-mix(in srgb, var(--accent) 8%, var(--panel));}",
    ".data-manager-filepick:focus-within{outline:2px solid color-mix(in srgb, var(--accent) 55%, transparent);outline-offset:2px;}",
    ".data-manager-filepick .btn{pointer-events:none;}",
    ".data-manager-filepick__name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
  ].join("");
  document.head.appendChild(style);
}

function setInlineStatus(node, message, tone = "") {
  if (!node) return;
  node.textContent = message || "";
  node.style.color = tone === "error"
    ? "#d15353"
    : tone === "success"
      ? "var(--accent)"
      : tone === "warn"
        ? "#d18b2e"
        : "";
}

function updateImportFileName(file) {
  if (!importBundleName) return;
  importBundleName.textContent = file?.name || "No file selected";
}

function setActiveTab(tab) {
  state.activeTab = tab === "import" || tab === "maintenance" ? tab : "export";

  const showExport = state.activeTab === "export";
  const showImport = state.activeTab === "import";
  const showMaintenance = state.activeTab === "maintenance";
  exportPanel.hidden = !showExport;
  exportPanel.style.display = showExport ? "grid" : "none";
  importPanel.hidden = !showImport;
  importPanel.style.display = showImport ? "grid" : "none";
  maintenancePanel.hidden = !showMaintenance;
  maintenancePanel.style.display = showMaintenance ? "grid" : "none";

  exportTabBtn?.classList.toggle("is-active", showExport);
  importTabBtn?.classList.toggle("is-active", showImport);
  maintenanceTabBtn?.classList.toggle("is-active", showMaintenance);
  exportTabBtn?.setAttribute("aria-selected", showExport ? "true" : "false");
  importTabBtn?.setAttribute("aria-selected", showImport ? "true" : "false");
  maintenanceTabBtn?.setAttribute("aria-selected", showMaintenance ? "true" : "false");
}

function getSelectedExportTables() {
  return state.tables.map((table) => table.name).filter((name) => state.exportSelection.has(name));
}

function getSelectedImportTables() {
  return Array.from(state.importSelection);
}

function renderExportTables() {
  if (!exportTableList) return;
  exportTableList.innerHTML = "";
  const host = el("div", { class: "data-manager-list" });

  if (!state.tables.length) {
    host.appendChild(el("div", { class: "sub" }, "Loading tables..."));
    exportTableList.appendChild(host);
    return;
  }

  state.tables.forEach((table) => {
    const checkbox = el("input", {
      type: "checkbox",
      checked: state.exportSelection.has(table.name) ? "" : null,
      "aria-label": "Select " + table.label + " for export"
    });
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.exportSelection.add(table.name);
      else state.exportSelection.delete(table.name);
      renderExportTables();
    });

    const pills = el(
      "div",
      { class: "data-manager-pills" },
      el("span", { class: "data-manager-pill" }, String(table.rowCount) + " rows"),
      table.importSupported
        ? el("span", { class: "data-manager-pill is-safe" }, "Import-safe v1")
        : el("span", { class: "data-manager-pill is-export-only" }, "Export-only v1")
    );

    host.appendChild(
      el(
        "div",
        { class: "data-manager-table" },
        el(
          "div",
          { class: "data-manager-table__head" },
          el(
            "label",
            { class: "data-manager-table__check" },
            checkbox,
            el(
              "div",
              {},
              el("strong", {}, table.label),
              el("div", { class: "sub", style: "margin-top:4px" }, table.name)
            )
          ),
          pills
        ),
        el("div", { class: "sub" }, table.importNotes || "")
      )
    );
  });

  exportTableList.appendChild(host);
  exportSelectionSummary.textContent = getSelectedExportTables().length + " of " + state.tables.length + " table(s) selected";
}

function renderImportPreview() {
  if (!importPreviewList) return;
  importPreviewList.innerHTML = "";
  const preview = state.importPreview;

  if (!preview) {
    importCommitBtn.disabled = true;
    importPreviewList.appendChild(el("div", { class: "sub" }, "No import preview yet."));
    return;
  }

  importPreviewSummary.textContent = [
    preview.tables.length + " table(s) detected",
    preview.summary.importableTableCount + " importable in v1",
    preview.exportedAt ? "Exported " + preview.exportedAt : ""
  ].filter(Boolean).join(" - ");

  const host = el("div", { class: "data-manager-list" });
  preview.tables.forEach((table) => {
    const selectable = table.importSupported && !table.issues.length;
    const checkbox = el("input", {
      type: "checkbox",
      checked: selectable && state.importSelection.has(table.name) ? "" : null,
      disabled: selectable ? null : "",
      "aria-label": "Select " + table.label + " for import"
    });
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.importSelection.add(table.name);
      else state.importSelection.delete(table.name);
      renderImportPreview();
    });

    const messages = el("div", { class: "data-manager-messages" });
    table.warnings.forEach((warning) => {
      messages.appendChild(el("div", { class: "data-manager-message data-manager-message--warn" }, warning));
    });
    table.issues.forEach((issue) => {
      messages.appendChild(el("div", { class: "data-manager-message data-manager-message--error" }, issue));
    });

    host.appendChild(
      el(
        "div",
        { class: "data-manager-table" },
        el(
          "div",
          { class: "data-manager-table__head" },
          el(
            "label",
            { class: "data-manager-table__check" },
            checkbox,
            el(
              "div",
              {},
              el("strong", {}, table.label),
              el("div", { class: "sub", style: "margin-top:4px" }, table.name + " - " + table.rowCount + " row(s)")
            )
          ),
          el(
            "div",
            { class: "data-manager-pills" },
            table.importSupported && !table.issues.length
              ? el("span", { class: "data-manager-pill is-safe" }, "Ready to import")
              : table.importSupported
                ? el("span", { class: "data-manager-pill is-error" }, "Fix issues first")
                : el("span", { class: "data-manager-pill is-export-only" }, "Export-only v1")
          )
        ),
        messages.children.length ? messages : el("div", { class: "sub" }, table.importNotes || "")
      )
    );
  });

  importPreviewList.appendChild(host);
  importCommitBtn.disabled = getSelectedImportTables().length === 0;
}

async function loadTableMetadata() {
  setInlineStatus(exportDatabaseStatus, "Loading table metadata...");
  try {
    const response = await apiFetch("/api/admin/data/tables", { method: "GET" });
    state.tables = Array.isArray(response?.tables) ? response.tables : [];
    if (!state.exportSelection.size) state.tables.forEach((table) => state.exportSelection.add(table.name));
    renderExportTables();
    setInlineStatus(exportDatabaseStatus, "");
  } catch (error) {
    setInlineStatus(exportDatabaseStatus, "Failed to load table metadata: " + (error?.message || error), "error");
    renderExportTables();
  }
}

async function exportSelectedTables() {
  const tables = getSelectedExportTables();
  if (!tables.length) {
    setInlineStatus(exportDatabaseStatus, "Select at least one table to export.", "warn");
    return;
  }
  const token = getAdminToken();
  if (!token) {
    setInlineStatus(exportDatabaseStatus, "Sign in to the admin first.", "error");
    return;
  }

  setInlineStatus(exportDatabaseStatus, "Preparing export...");
  try {
    const res = await fetch(API_BASE + "/api/admin/data/export", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tables, mode: "bundle" })
    });

    if (!res.ok) {
      let message = res.status + " " + res.statusText;
      try {
        const payload = await res.json();
        if (payload?.error) message = payload.error;
      } catch {}
      throw new Error(message);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="?([^\"]+)"?/i);
    const filename = filenameMatch?.[1] || "toji-database-export.json";
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    setInlineStatus(exportDatabaseStatus, "Downloaded " + filename + ".", "success");
    showToast("Exported " + tables.length + " table(s).", { tone: "success", duration: 6000 });
  } catch (error) {
    setInlineStatus(exportDatabaseStatus, "Export failed: " + (error?.message || error), "error");
  }
}

async function previewImportFile(file) {
  updateImportFileName(file || null);
  if (!file) return;

  setInlineStatus(importDatabaseStatus, "Reading import file...");
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.importBundle = parsed;
    const preview = await apiFetch("/api/admin/data/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundle: parsed })
    });
    state.importPreview = preview;
    state.importSelection = new Set(preview.importableTableNames || []);
    renderImportPreview();
    setActiveTab("import");
    setInlineStatus(importDatabaseStatus, "Preview ready for " + file.name + ".", "success");
  } catch (error) {
    state.importBundle = null;
    state.importPreview = null;
    state.importSelection = new Set();
    renderImportPreview();
    setInlineStatus(importDatabaseStatus, "Import preview failed: " + (error?.message || error), "error");
  }
}

function buildImportSummary(result) {
  const parts = [result.totals.inserted + " inserted", result.totals.updated + " updated"];
  if (result.totals.skipped) parts.push(result.totals.skipped + " skipped");
  return parts.join(" - ");
}

async function commitImport() {
  const tables = getSelectedImportTables();
  if (!state.importBundle || !state.importPreview) {
    setInlineStatus(importDatabaseStatus, "Choose and preview an export file first.", "warn");
    return;
  }
  if (!tables.length) {
    setInlineStatus(importDatabaseStatus, "Select at least one safe table to import.", "warn");
    return;
  }

  const ok = await confirmToast(
    "Import the selected safe tables into the current database?\n\nThis uses upsert mode and will update existing rows with matching keys.",
    { confirmLabel: "Import", cancelLabel: "Cancel", tone: "warn" }
  );
  if (!ok) return;

  setInlineStatus(importDatabaseStatus, "Importing selected tables...");
  try {
    const result = await apiFetch("/api/admin/data/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundle: state.importBundle, tables, mode: "upsert" })
    });
    setInlineStatus(importDatabaseStatus, "Import complete: " + buildImportSummary(result) + ".", "success");
    showToast("Import complete for " + tables.length + " table(s).", { tone: "success", duration: 7000 });
    await loadTableMetadata();
  } catch (error) {
    setInlineStatus(importDatabaseStatus, "Import failed: " + (error?.message || error), "error");
  }
}

function setCleanupStatus(message, tone = "") {
  setInlineStatus(cleanupStatus, message, tone);
}

async function runCleanup() {
  const ok = await confirmToast(
    "Cleanup orphan files (variants/originals) and broken variant rows?",
    { confirmLabel: "Run cleanup", cancelLabel: "Cancel", tone: "warn" }
  );
  if (!ok) return;

  if (!getAdminToken()) {
    setCleanupStatus("Sign in to the admin first.", "warn");
    showToast("Sign in to the admin first.", { tone: "warn" });
    return;
  }

  setCleanupStatus("Cleaning...", "info");

  try {
    const res = await fetch(`${API_BASE}/api/admin/cleanup`, {
      method: "POST",
      credentials: "include"
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `${res.status} ${res.statusText}`);
    const message = `Done. Deleted variants: ${payload.deletedVariantFiles}, originals: ${payload.deletedOriginalFiles}, broken rows: ${payload.deletedBrokenVariantRows}.`;
    setCleanupStatus(message, "success");
    showToast(message, { tone: "success", duration: 7000 });
  } catch (error) {
    const message = `Cleanup failed: ${error?.message || error}`;
    setCleanupStatus(message, "error");
    showToast(message, { tone: "error", duration: 7000 });
  }
}

exportTabBtn?.addEventListener("click", () => {
  setActiveTab("export");
});

importTabBtn?.addEventListener("click", () => {
  setActiveTab("import");
});

maintenanceTabBtn?.addEventListener("click", () => {
  setActiveTab("maintenance");
});

exportSelectAllBtn?.addEventListener("click", () => {
  state.tables.forEach((table) => state.exportSelection.add(table.name));
  renderExportTables();
});

exportClearAllBtn?.addEventListener("click", () => {
  state.exportSelection.clear();
  renderExportTables();
});

exportSelectedBtn?.addEventListener("click", () => {
  void exportSelectedTables();
});

importBundleInput?.addEventListener("change", () => {
  void previewImportFile(importBundleInput.files?.[0] || null);
});

importCommitBtn?.addEventListener("click", () => {
  void commitImport();
});

cleanupBtn?.addEventListener("click", () => {
  void runCleanup();
});

updateImportFileName(importBundleInput?.files?.[0] || null);
setActiveTab("export");
renderExportTables();
renderImportPreview();
void loadTableMetadata();
