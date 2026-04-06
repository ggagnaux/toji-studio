import {
  ensureBaseStyles,
  setYearFooter,
  el,
  loadStateAutoSync,
  saveState,
  getAdminToken,
  apiFetch,
  showToast,
  API_BASE
} from "../admin.js";
import {
  initUploadFilterControllers,
  parseUploadTags,
  requireUploadAdminSession
} from "./upload-controller.js";
import { bindFloatingField, syncFloatingFieldState } from "../../assets/js/floating-fields.js";
import { getArtworkPublishReadiness, summarizeReadinessMissing } from "./artwork-readiness.js";

ensureBaseStyles();
setYearFooter();

(async function(){
  const state = await loadStateAutoSync();

  const fileInput = document.getElementById("files");
  const filePickerShell = fileInput?.closest(".file-picker-shell");
  const statusEl = document.getElementById("status");
  const list = document.getElementById("list");
  const statusSelect = document.getElementById("statusSelect");
  const statusPills = Array.from(document.querySelectorAll("[data-status-pill]"));
  const tagFilterPills = Array.from(document.querySelectorAll("[data-tag-filter]"));
  const progressWrap = document.getElementById("uploadProgressWrap");
  const progressBar = document.getElementById("uploadProgressBar");
  const progressLabel = document.getElementById("uploadProgressLabel");
  const uiBlocker = document.getElementById("uiBlocker");
  const uiBlockerTitle = document.getElementById("uiBlockerTitle");
  const uiBlockerSub = document.getElementById("uiBlockerSub");
  const seriesField = document.getElementById("seriesField");
  const yearField = document.getElementById("yearField");
  const newTagField = document.getElementById("newTagField");
  const uploadReadinessScore = document.getElementById("uploadReadinessScore");
  const uploadReadinessSummary = document.getElementById("uploadReadinessSummary");
  const uploadReadinessList = document.getElementById("uploadReadinessList");
  const uploadReadinessNote = document.getElementById("uploadReadinessNote");
  const selectedBatchTags = new Set();
  const selectedTagFilters = new Set();
  const newIds = [];
  const publishedStatusBtn = statusPills.find((btn) => String(btn?.getAttribute?.("data-status-pill") || "").toLowerCase() === "published");

  function getApiBase() {
    return API_BASE;
  }

  function requireAdminSession() {
    return requireUploadAdminSession({ getAdminToken, windowRef: window });
  }

  function showUiBlocker(title, subtitle) {
    if (!uiBlocker) return;
    if (uiBlockerTitle) uiBlockerTitle.textContent = title || "Please wait...";
    if (uiBlockerSub) uiBlockerSub.textContent = subtitle || "";
    uiBlocker.style.display = "block";
  }

  function hideUiBlocker() {
    if (uiBlocker) uiBlocker.style.display = "none";
  }

  function flashFilePicker() {
    if (!filePickerShell) return;
    filePickerShell.classList.remove("upload-section-flash");
    void filePickerShell.offsetWidth;
    filePickerShell.classList.add("upload-section-flash");
    window.setTimeout(() => {
      filePickerShell.classList.remove("upload-section-flash");
    }, 1500);
    if (fileInput && typeof fileInput.focus === "function") fileInput.focus();
  }

  function mergeUploadedArtwork(item) {
    if (!item?.id) return;
    if (!Array.isArray(state.artworks)) state.artworks = [];
    const idx = state.artworks.findIndex((entry) => entry?.id === item.id);
    if (idx >= 0) state.artworks[idx] = { ...state.artworks[idx], ...item };
    else state.artworks.unshift(item);
  }

  function resolveArtworkThumb(item) {
    const raw = String(
      item?.thumb ||
      item?.image ||
      item?.artworkThumb ||
      item?.artworkImage ||
      ""
    ).trim();
    return raw || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 44'><rect width='56' height='44' rx='10' fill='%23272638'/><path d='M11 31l10-10 8 8 6-6 10 8' fill='none' stroke='%237f7a9a' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'/><circle cx='20' cy='16' r='4' fill='%237f7a9a'/></svg>";
  }

  function getAllTags() {
    const source = Array.isArray(state.artworks) ? state.artworks : [];
    const out = new Set();
    source.forEach((artwork) => {
      const tags = Array.isArray(artwork?.tags)
        ? artwork.tags
        : String(artwork?.tags || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
      tags.forEach((tag) => out.add(String(tag || "").trim().toLowerCase()));
    });
    return Array.from(out).filter(Boolean);
  }

  function getAllKnownSeries() {
    const direct = Array.isArray(state.series) ? state.series : [];
    const names = new Set();
    direct.forEach((series) => {
      const value = typeof series === "string" ? series : (series?.name || series?.title || series?.slug || "");
      if (value) names.add(String(value).trim());
    });
    const artworkSeries = Array.isArray(state.artworks) ? state.artworks : [];
    artworkSeries.forEach((artwork) => {
      const value = String(artwork?.series || "").trim();
      if (value) names.add(value);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function buildBatchArtworkPreview() {
    return {
      title: "",
      description: "",
      alt: "",
      tags: Array.from(selectedBatchTags),
      series: document.getElementById("series")?.value?.trim() || "",
      year: document.getElementById("year")?.value?.trim() || "",
      status: "draft"
    };
  }

  function renderUploadReadiness() {
    const audit = getArtworkPublishReadiness(buildBatchArtworkPreview());
    if (uploadReadinessScore) uploadReadinessScore.textContent = `${audit.completed} / ${audit.total} ready`;
    if (uploadReadinessSummary) {
      uploadReadinessSummary.textContent = summarizeReadinessMissing(audit.missing, { completeLabel: "Ready to publish" });
    }
    if (uploadReadinessNote) {
      uploadReadinessNote.textContent = "New uploads are forced to Draft until required metadata is filled in on the Edit page.";
    }
    if (uploadReadinessList) {
      uploadReadinessList.innerHTML = "";
      audit.checks.forEach((check) => {
        uploadReadinessList.appendChild(
          el("div", { class: `upload-readiness__item ${check.complete ? "is-complete" : "is-incomplete"}` },
            el("span", { class: "upload-readiness__icon", "aria-hidden": "true" }, check.complete ? "OK" : "!"),
            el("div", { class: "upload-readiness__body" },
              el("span", { class: "upload-readiness__label" }, check.label),
              el("span", { class: "upload-readiness__detail" }, check.complete ? "Ready for publish" : "Needs completion in Edit")
            )
          )
        );
      });
    }
    if (publishedStatusBtn) {
      publishedStatusBtn.disabled = true;
      publishedStatusBtn.setAttribute("aria-disabled", "true");
      publishedStatusBtn.title = "New uploads start as Draft. Complete metadata in Edit before publishing.";
    }
    if (statusSelect?.value === "published") statusSelect.value = "draft";
  }

  function syncFloatingField(field, control) {
    if (!field || !control) return;
    field.classList.toggle("has-value", !!String(control.value || "").trim());
  }

  function tagMatchesActiveFilters(tag) {
    if (!selectedTagFilters.size) return false;
    const normalized = String(tag || "").trim().toLowerCase();
    if (!normalized) return false;
    return Array.from(selectedTagFilters).some((filter) => {
      if (filter === "0-9") return /^\d/.test(normalized);
      return normalized.startsWith(filter);
    });
  }

  function setStatus(msg){ statusEl.textContent = msg || ""; }
  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map(v => String(v || "").trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  function parseTags(value){
    return parseUploadTags(normalizeTags(value));
  }

  function renderTagPills(){
    const host = document.getElementById("tagPills");
    if (!host) return;
    host.innerHTML = "";

    if (!selectedTagFilters.size) {
      host.appendChild(el("span", { class: "sub" }, "Select one or more filters to show matching tags."));
      return;
    }

    const tags = getAllTags().sort((a,b)=> a.localeCompare(b));
    const filtered = tags.filter((tag) => tagMatchesActiveFilters(tag));
    const visible = Array.from(new Set([...filtered, ...Array.from(selectedBatchTags).filter((tag) => tagMatchesActiveFilters(tag))])).sort((a,b)=> a.localeCompare(b));

    if (!visible.length) {
      host.appendChild(el("span", { class: "sub" }, "No tags match the current filter."));
      return;
    }

    for (const tag of visible){
      const active = selectedBatchTags.has(tag);
      const btn = el("button", {
        type: "button",
        class: `btn mini ${active ? "primary" : ""}`,
        style: active ? "" : "opacity:.88"
      }, tag);
      btn.addEventListener("click", () => {
        if (selectedBatchTags.has(tag)) selectedBatchTags.delete(tag);
        else selectedBatchTags.add(tag);
        renderTagPills();
        renderUploadReadiness();
      });

      host.appendChild(btn);
    }
  }

  function addTagsFromInput(){
    const input = document.getElementById("newTagInput");
    if (!input) return;
    const tags = parseTags(input.value);
    if (!tags.length) return;
    for (const t of tags) selectedBatchTags.add(t);
    input.value = "";
    renderTagPills();
    renderUploadReadiness();
  }

  function renderSeriesOptions(){
    const seriesSelect = document.getElementById("series");
    if (!seriesSelect) return;
    const current = seriesSelect.value || "";
    seriesSelect.innerHTML = "";
    seriesSelect.appendChild(new Option("No change", ""));
    for (const s of getAllKnownSeries()){
      seriesSelect.appendChild(new Option(s, s));
    }
    if ([...seriesSelect.options].some(o => o.value === current)) {
      seriesSelect.value = current;
    }
    syncFloatingFieldState(seriesField, seriesSelect);
  }

  initUploadFilterControllers({
    statusSelect,
    statusPills,
    tagFilterPills,
    selectedTagFilters,
    onTagFilterChange() {
      renderTagPills();
    }
  });

  document.getElementById("addTagBtn").addEventListener("click", addTagsFromInput);
  document.getElementById("series")?.addEventListener("change", renderUploadReadiness);
  document.getElementById("year")?.addEventListener("input", renderUploadReadiness);
  document.getElementById("newTagInput").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addTagsFromInput();
  });

  function renderNew(){
    list.innerHTML = "";

    if (!newIds.length){
      list.appendChild(el("div", { class:"sub" }, "No uploads yet."));
      return;
    }

    let rendered = 0;

    for (const id of newIds){
      const a = state.artworks.find(x => x.id === id);
      if (!a) continue;
      rendered++;
      const audit = getArtworkPublishReadiness(a);

      list.appendChild(
        el("a", { class:"card upload-new-card", href:`edit.html?id=${encodeURIComponent(a.id)}`, style:"box-shadow:none; padding:10px;" },
          el("div", { class:"thumbSm" }, el("img", { src: resolveArtworkThumb(a), alt:a.title, loading:"lazy" })),
          el("div", { class:"meta" },
            el("div", { class:"upload-new-card__title-row" },
              el("p", { class:"title upload-new-card__title" }, a.title || "Untitled"),
              el("span", { class:`upload-new-card__pill ${audit.isComplete ? "is-complete" : "is-incomplete"}` }, audit.isComplete ? "Ready" : `${audit.missing.length} missing`)
            ),
            el("p", { class:"sub" }, `ID: ${a.id} | ${summarizeReadinessMissing(audit.missing, { completeLabel: "Ready to publish" })}`),
            el("p", { class:"sub" }, audit.isComplete ? "Open to review or publish ->" : "Open to finish metadata ->")
          )
        )
      );
    }

    if (!rendered) {
      list.appendChild(el("div", { class:"sub" }, "No uploads yet."));
    }
  }

  function uploadWithProgress(path, formData, onProgress){
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${getApiBase()}${path}`);
      xhr.withCredentials = true;
      const token = getAdminToken();
      if (token && token !== "__session__") xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.responseType = "json";
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable || typeof onProgress !== "function") return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        onProgress(pct, evt.loaded, evt.total);
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        if (!ok) {
          const payload = xhr.response && typeof xhr.response === "object" ? xhr.response : null;
          reject(new Error(payload?.error || `Upload failed (${xhr.status})`));
          return;
        }
        resolve(xhr.response && typeof xhr.response === "object" ? xhr.response : {});
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  async function refreshUploadedArtworksFromBackend(ids) {
    if (!ids?.length) return;
    try {
      const refreshed = await Promise.all(
        ids.map(async (id) => {
          const res = await apiFetch(`/api/admin/artworks/${encodeURIComponent(id)}`, { method: "GET" });
          return res;
        })
      );
      refreshed.forEach((item) => mergeUploadedArtwork(item));
      saveState(state);
      renderNew();
    } catch (err) {
      console.warn("Failed to refresh uploaded artworks from backend", err);
    }
  }

  document.getElementById("uploadBtn").addEventListener("click", async () => {
    try {
      requireAdminSession();
      const files = Array.from(fileInput.files || []);
      if (!files.length) {
        setStatus("Choose one or more files first.");
        flashFilePicker();
        return;
      }

      const fd = new FormData();
      files.forEach(file => fd.append("files", file));
      const series = document.getElementById("series")?.value?.trim();
      const year = document.getElementById("year")?.value?.trim();
      const uploadStatus = statusSelect?.value || "draft";
      const tags = Array.from(selectedBatchTags);
      if (series) fd.append("series", series);
      if (year) fd.append("year", year);
      if (uploadStatus) fd.append("status", uploadStatus);
      if (tags.length) fd.append("tags", tags.join(","));

      showUiBlocker("Uploading artwork", `${files.length} file${files.length === 1 ? "" : "s"} in progress...`);
      if (progressWrap) progressWrap.style.display = "block";
      if (progressBar) progressBar.value = 0;
      if (progressLabel) progressLabel.textContent = "Preparing upload...";
      setStatus("Uploading...");

      const out = await uploadWithProgress("/api/admin/upload", fd, (pct) => {
        if (progressBar) progressBar.value = pct;
        if (progressLabel) progressLabel.textContent = `${pct}% uploaded`;
      });

      const created = Array.isArray(out?.created) ? out.created : [];
      const duplicates = Array.isArray(out?.duplicates) ? out.duplicates : [];
      created.forEach((item) => {
        mergeUploadedArtwork(item);
        if (item?.id) newIds.unshift(item.id);
      });
      saveState(state);
      renderNew();
      renderTagPills();
      await refreshUploadedArtworksFromBackend(created.map((item) => item?.id).filter(Boolean));

      const parts = [];
      if (created.length) parts.push(`Uploaded ${created.length} artwork${created.length === 1 ? "" : "s"}.`);
      if (duplicates.length) parts.push(`Skipped ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"}.`);
      setStatus(parts.join(" ") || "Upload complete.");
      showToast(parts.join(" ") || "Upload complete.");
    } catch (err) {
      setStatus(String(err?.message || err || "Upload failed."));
      showToast(String(err?.message || err || "Upload failed."), { tone: "error" });
    } finally {
      hideUiBlocker();
      if (progressWrap) progressWrap.style.display = "none";
      if (progressBar) progressBar.value = 0;
      if (progressLabel) progressLabel.textContent = "";
    }
  });

  const seriesSelect = document.getElementById("series");
  const yearInput = document.getElementById("year");
  const newTagInput = document.getElementById("newTagInput");
  [
    [seriesField, seriesSelect],
    [yearField, yearInput],
    [newTagField, newTagInput]
  ].forEach(([field, control]) => {
    if (!field || !control) return;
    bindFloatingField(field, control);
  });

  renderSeriesOptions();
  renderTagPills();
  renderUploadReadiness();
  renderNew();
})();








