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
  const selectedBatchTags = new Set();
  const selectedTagFilters = new Set();
  const newIds = [];

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

      list.appendChild(
        el("a", { class:"card", href:`edit.html?id=${encodeURIComponent(a.id)}`, style:"box-shadow:none; display:flex; align-items:center; gap:12px; padding:10px;" },
          el("div", { class:"thumbSm" }, el("img", { src:a.thumb, alt:a.title, loading:"lazy" })),
          el("div", { class:"meta" },
            el("p", { class:"title" }, a.title || "Untitled"),
            el("p", { class:"sub" }, `ID: ${a.id} - Open to edit ->`)
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

  renderSeriesOptions();
  renderTagPills();
  renderNew();
})();
