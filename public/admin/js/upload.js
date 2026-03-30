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
    if (getAdminToken()) return;
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `login.html?next=${encodeURIComponent(next)}`;
    throw new Error("Please sign in to continue.");
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

  function syncTagFilterPills() {
    tagFilterPills.forEach((btn) => {
      const value = String(btn.getAttribute("data-tag-filter") || "").toLowerCase();
      const active = selectedTagFilters.has(value);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncStatusPills() {
    const current = String(statusSelect?.value || "draft").toLowerCase();
    statusPills.forEach((btn) => {
      const value = String(btn.getAttribute("data-status-pill") || "").toLowerCase();
      const active = value === current;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (statusSelect && !statusSelect.value) statusSelect.value = "draft";
  }
  statusPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = String(btn.getAttribute("data-status-pill") || "").toLowerCase();
      if (!value || !statusSelect) return;
      statusSelect.value = value;
      syncStatusPills();
    });
  });
  tagFilterPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = String(btn.getAttribute("data-tag-filter") || "").toLowerCase();
      if (!value) return;
      if (selectedTagFilters.has(value)) selectedTagFilters.delete(value);
      else selectedTagFilters.add(value);
      syncTagFilterPills();
      renderTagPills();
    });
  });
  syncStatusPills();
  syncTagFilterPills();

  function setStatus(msg){ statusEl.textContent = msg || ""; }
  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map(v => String(v || "").trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  function parseTags(value){
    return Array.from(new Set(normalizeTags(value).map(v => v.toLowerCase())));
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

    if (!rendered){
      list.appendChild(
        el("div", { class:"sub" }, "Uploads were created, but no matching items were found in local state (check backend id field).")
      );
    }
  }

  function uploadWithProgress(path, formData, onProgress){
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${getApiBase()}${path}`, true);
      xhr.withCredentials = true;
      const token = getAdminToken();
      if (token && token !== "__session__") xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        onProgress?.(pct);
      };

      xhr.onload = () => {
        let data = null;
        try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data?.error || `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  async function refreshStateFromBackend(){
    try {
      const rows = await apiFetch("/api/admin/artworks", { method: "GET" });
      const normalized = (rows || []).map((a) => ({
        ...a,
        featured: !!a.featured,
        tags: Array.isArray(a.tags) ? a.tags : (typeof a.tags === "string" ? JSON.parse(a.tags || "[]") : []),
        thumb: a.thumb?.startsWith("/") ? `${getApiBase()}${a.thumb}` : a.thumb,
        image: a.image?.startsWith("/") ? `${getApiBase()}${a.image}` : a.image
      }));
      state.artworks = normalized;
      saveState(state);
      renderTagPills();
    } catch (err) {
      console.warn("Failed to refresh uploaded artworks from backend", err);
    }
  }

  document.getElementById("uploadBtn").addEventListener("click", async () => {
    try {
      requireAdminSession();
      const files = [...(fileInput.files || [])];
      if (!files.length){
        setStatus("Choose one or more image files.");
        showToast("Select one or more files first.", { tone: "warn" });
        flashFilePicker();
        return;
      }

      const series = document.getElementById("series")?.value || "";
      const year = String(document.getElementById("year")?.value || "").trim();
      const uploadStatus = statusSelect?.value || "draft";
      const tags = Array.from(selectedBatchTags);

      const fd = new FormData();
      for (const f of files) fd.append("files", f, f.name);
      if (series) fd.append("series", series);
      if (year) fd.append("year", year);
      if (uploadStatus) fd.append("status", uploadStatus);
      if (tags.length) fd.append("tags", JSON.stringify(tags));

      showUiBlocker("Uploading and processing...", "Please wait. Interaction is temporarily disabled.");
      progressWrap.style.display = "block";
      progressBar.style.width = "0%";
      progressLabel.textContent = "Uploading: 0%";
      setStatus("Uploading originals and generating variants...");

      const out = await uploadWithProgress("/api/admin/upload", fd, (pct) => {
        progressBar.style.width = `${pct}%`;
        progressLabel.textContent = `Uploading: ${pct}%`;
      });

      const created = Array.isArray(out?.created) ? out.created : (Array.isArray(out?.items) ? out.items : []);
      const skipped = Array.isArray(out?.skipped) ? out.skipped : [];
      for (const item of created){
        if (item?.id) newIds.unshift(item.id);
        mergeUploadedArtwork(item);
      }
      saveState(state);
      await refreshStateFromBackend();
      renderTagPills();
      renderSeriesOptions();
      renderNew();
      const statusParts = [];
      statusParts.push(`Uploaded ${created.length} image${created.length === 1 ? "" : "s"}.`);
      if (skipped.length) statusParts.push(`Skipped ${skipped.length} duplicate${skipped.length === 1 ? "" : "s"}.`);
      setStatus(statusParts.join(" "));
      progressBar.style.width = "100%";
      progressLabel.textContent = "Upload complete";
      showToast(statusParts.join(" "), { tone: skipped.length ? "warn" : "success" });
      if (fileInput) fileInput.value = "";
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Upload failed");
      showToast(e.message || "Upload failed", { tone: "warn" });
    } finally {
      window.setTimeout(() => {
        progressWrap.style.display = "none";
        progressBar.style.width = "0%";
        progressLabel.textContent = "Uploading: 0%";
        hideUiBlocker();
      }, 350);
    }
  });

  renderTagPills();
  renderSeriesOptions();
  renderNew();
})();





