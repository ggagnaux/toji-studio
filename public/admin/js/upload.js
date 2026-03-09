    import { applyBannerLogoBehavior } from "../../assets/js/header.js";
    import {
      loadState, saveState, el, setYearFooter, ensureBaseStyles,
      upsertTag,
      patchArtworkToBackend,
      getAdminToken, setAdminToken,
      apiFetch, API_BASE, showToast
    } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();
    applyBannerLogoBehavior(document.querySelector("header.header"));

    const state = await loadState();
    state.artworks ||= [];
    state.tags ||= [];
    state.series ||= [];

    const files = document.getElementById("files");
    const uploadOriginalsPanel = document.getElementById("uploadOriginalsPanel");
    const list = document.getElementById("list");
    const statusSelect = document.getElementById("statusSelect");
    const statusPills = Array.from(document.querySelectorAll("[data-status-pill]"));

    const tokenInput = document.getElementById("token");
    const uiBlocker = document.getElementById("uiBlocker");
    const uiBlockerTitle = document.getElementById("uiBlockerTitle");
    const uiBlockerSub = document.getElementById("uiBlockerSub");

    const newIds = [];
    let uiLocked = false;

    const syncStatusPills = () => {
      const current = String(statusSelect?.value || "draft").toLowerCase();
      for (const btn of statusPills) {
        const value = String(btn.getAttribute("data-status-pill") || "").toLowerCase();
        const active = value === current;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      }
    };
    if (statusSelect && !statusSelect.value) statusSelect.value = "draft";
    statusPills.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = String(btn.getAttribute("data-status-pill") || "").toLowerCase();
        if (!value || !statusSelect) return;
        statusSelect.value = value;
        syncStatusPills();
      });
    });
    syncStatusPills();

    function setStatus(msg, tone = "info"){
      if (!msg) return;
      showToast(msg, { tone, duration: 10000 });
    }
    function setTokenStatus(msg, tone = "success"){
      if (!msg) return;
      showToast(msg, { tone, duration: 10000 });
    }
    function flashUploadOriginalsPanel(){
      if (!uploadOriginalsPanel) return;
      uploadOriginalsPanel.classList.remove("upload-section-flash");
      // Force reflow so the animation restarts on repeated clicks.
      void uploadOriginalsPanel.offsetWidth;
      uploadOriginalsPanel.classList.add("upload-section-flash");
    }
    function setUiLocked(on, title = "Uploading and processing...", sub = "Please wait. Interaction is temporarily disabled."){
      uiLocked = !!on;
      if (uiBlocker) uiBlocker.style.display = on ? "block" : "none";
      if (uiBlockerTitle) uiBlockerTitle.textContent = title;
      if (uiBlockerSub) uiBlockerSub.textContent = sub;
    }
    window.addEventListener("keydown", (e) => {
      if (!uiLocked) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    function setUploadProgress(pct){
      const wrap = document.getElementById("uploadProgressWrap");
      const bar = document.getElementById("uploadProgressBar");
      const label = document.getElementById("uploadProgressLabel");
      const p = Math.max(0, Math.min(100, Number(pct) || 0));
      if (wrap) wrap.style.display = "block";
      if (bar) bar.style.width = `${p}%`;
      if (label) label.textContent = `Uploading: ${Math.round(p)}%`;
    }
    function hideUploadProgress(){
      const wrap = document.getElementById("uploadProgressWrap");
      if (wrap) wrap.style.display = "none";
    }

    // ---- tag helpers ----
    function normTag(t){
      return String(t || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/^[#]+/, "");
    }
    function normSeries(s){
      return String(s || "").trim().replace(/\s+/g, " ");
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

      selectedBatchTags.forEach(t => {
        const nt = normTag(t);
        if (nt) set.add(nt);
      });

      return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }
    function allKnownSeries(){
      const set = new Set();
      (state.series || []).forEach(s => {
        const ns = normSeries(s);
        if (ns) set.add(ns);
      });
      (state.artworks || []).forEach(a => {
        const ns = normSeries(a.series);
        if (ns) set.add(ns);
      });
      return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    const selectedBatchTags = new Set();

    function getSelectedBatchTags(){
      return Array.from(selectedBatchTags).sort((a,b)=>a.localeCompare(b));
    }

    function renderTagPills(){
      const host = document.getElementById("tagPills");
      if (!host) return;
      host.innerHTML = "";

      const tags = allKnownTags();
      if (!tags.length){
        host.appendChild(el("span", { class:"sub" }, "No tags available yet."));
        return;
      }

      for (const tag of tags){
        const active = selectedBatchTags.has(tag);
        const btn = el(
          "button",
          {
            type: "button",
            class: `chip${active ? " active" : ""}`,
            "aria-pressed": active ? "true" : "false"
          },
          tag
        );

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
      for (const s of allKnownSeries()){
        seriesSelect.appendChild(new Option(s, s));
      }
      if ([...seriesSelect.options].some(o => o.value === current)) {
        seriesSelect.value = current;
      }
    }

    // Seed token input
    tokenInput.value = getAdminToken();

    document.getElementById("saveToken").addEventListener("click", () => {
      setAdminToken(tokenInput.value);
      setTokenStatus("Saved.");
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
              el("p", { class:"sub" }, `ID: ${a.id} • Open to edit →`)
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

    function normalizeMediaUrl(p){
      // backend returns "/media/....jpg"
      // For local dev (front-end on 5173), need absolute URL.
      if (!p) return p;
      if (p.startsWith("http")) return p;
      if (p.startsWith("/")) return `${API_BASE}${p}`;
      return p;
    }

    function normalizeArtworkId(a){
      const v = a?.id || a?.artworkId || a?._id || a?.uuid;
      return v == null ? "" : String(v).trim();
    }
    function uploadWithProgress(path, formData, onProgress){
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}${path}`, true);
        const token = getAdminToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          onProgress?.((ev.loaded / ev.total) * 100);
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.onload = () => {
          const text = xhr.responseText || "";
          let payload = null;
          try { payload = text ? JSON.parse(text) : null; } catch {}
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(payload?.error || `${xhr.status} ${xhr.statusText}`));
            return;
          }
          resolve(payload);
        };

        xhr.send(formData);
      });
    }

    async function applyBatchToIds(ids){
      const targets = Array.from(new Set((ids || []).map(x => String(x || "").trim()).filter(Boolean)));
      if (!targets.length) return { total: 0, ok: 0, failed: 0, skipped: true };

      if (!getAdminToken()) {
        setStatus("Uploaded, but batch metadata not applied (missing admin token).");
        return { total: targets.length, ok: 0, failed: targets.length, skipped: true };
      }

      const tags = getSelectedBatchTags();
      const series = document.getElementById("series").value.trim();
      const year = document.getElementById("year").value.trim();
      const status = statusSelect?.value || "draft";

      const basePatch = {};
      if (series) basePatch.series = series;
      if (year) basePatch.year = year;
      if (status) basePatch.status = status;

      const now = new Date().toISOString();

      const hasWork = tags.length || Object.keys(basePatch).length;
      if (!hasWork) return { total: targets.length, ok: targets.length, failed: 0, skipped: true };

      setStatus(`Applying batch metadata to ${targets.length} item(s)...`);

      try{
        const jobs = targets.map(async (id) => {
          const a = state.artworks.find(x => x.id === id);
          if (!a) throw new Error("Artwork not found in local state");

          const patch = { ...basePatch };

          if (tags.length){
            const merged = Array.from(new Set([...(a.tags||[]).map(normTag).filter(Boolean), ...tags]))
              .sort((x,y)=>x.localeCompare(y));
            patch.tags = merged;
          }

          if (patch.status === "published" && !a.publishedAt) {
            patch.publishedAt = now; // backend may ignore, fine
          }

          // Local-first
          Object.assign(a, patch, { updatedAt: now });

          // Write-through
          const updated = await patchArtworkToBackend(id, patch);
          if (updated){
            if (updated.thumb) updated.thumb = normalizeMediaUrl(updated.thumb);
            if (updated.image) updated.image = normalizeMediaUrl(updated.image);
            Object.assign(a, updated);
          }
        });

        const settled = await Promise.allSettled(jobs);
        const failedIds = settled
          .map((result, i) => ({ result, id: targets[i] }))
          .filter(x => x.result.status === "rejected")
          .map(x => x.id);
        const okCount = targets.length - failedIds.length;

        // Maintain global tag/series pools locally
        for (const t of tags) upsertTag(state, t);
        if (series && !(state.series || []).includes(series)) state.series.push(series);

        saveState(state);
        renderNew();
        renderTagPills();
        renderSeriesOptions();
        if (!failedIds.length) {
          setStatus(`Upload + batch metadata applied to ${okCount}/${targets.length} item(s).`);
        } else {
          const preview = failedIds.slice(0, 4).join(", ");
          const more = failedIds.length > 4 ? ` +${failedIds.length - 4} more` : "";
          setStatus(`Batch metadata applied to ${okCount}/${targets.length}. Failed IDs: ${preview}${more}`);
        }
        return { total: targets.length, ok: okCount, failed: failedIds.length };
      }catch(err){
        saveState(state);
        setStatus(`Batch apply failed: ${err?.message || err}`);
        return { total: targets.length, ok: 0, failed: targets.length };
      }
    }

    document.getElementById("uploadBtn").addEventListener("click", async () => {
      const arr = Array.from(files.files || []);
      if (!arr.length) {
        setStatus("Pick at least one image.");
        flashUploadOriginalsPanel();
        return;
      }

      if (!getAdminToken()) return setStatus("Set and save your admin token first.");

      setStatus(`Uploading ${arr.length} file(s)…`);

      setUiLocked(true);
      setUploadProgress(0);

      try{
        const fd = new FormData();
        for (const f of arr) fd.append("files", f);
        const uploadTags = getSelectedBatchTags();
        const uploadSeries = document.getElementById("series").value.trim();
        const uploadYear = document.getElementById("year").value.trim();
        const uploadStatus = statusSelect?.value || "draft";

        if (uploadTags.length) fd.append("tags", JSON.stringify(uploadTags));
        if (uploadSeries) fd.append("series", uploadSeries);
        if (uploadYear) fd.append("year", uploadYear);
        if (uploadStatus) fd.append("status", uploadStatus);

        const result = await uploadWithProgress("/api/admin/upload", fd, setUploadProgress);
        setUploadProgress(100);

        const created = result?.created || [];

        if (!created.length){
          setStatus("Upload succeeded, but nothing returned.");
          return;
        }

        // Merge returned records into local admin state
        const createdIds = [];
        for (const a of created){
          // --- normalize id coming from backend ---
          const normId = normalizeArtworkId(a);
          if (!normId) {
            console.warn("Upload returned item without id:", a);
            continue;
          }
          a.id = normId;
          if (!Array.isArray(a.tags)) a.tags = [];

          // Ensure URLs are usable
          a.thumb = normalizeMediaUrl(a.thumb);
          a.image = normalizeMediaUrl(a.image);

          // Dedup by id
          const idx = state.artworks.findIndex(x => x.id === a.id);
          if (idx >= 0) state.artworks.splice(idx, 1);
          state.artworks.unshift(a);

          // Keep newIds unique
          const nidx = newIds.indexOf(a.id);
          if (nidx >= 0) newIds.splice(nidx, 1);
          newIds.unshift(a.id);
          createdIds.push(a.id);
        }

        if (!createdIds.length){
          setStatus("Upload succeeded, but no valid artwork IDs were returned.");
          saveState(state);
          renderNew();
          return;
        }

        saveState(state);
        renderNew();

        // Safety pass: if anything is still missing after upload write-through, patch it.
        const needsPatchPass = uploadTags.length || uploadSeries || uploadYear;
        if (needsPatchPass) await applyBatchToIds(createdIds);

      }catch(err){
        setStatus(`Upload failed: ${err?.message || err}`);
      } finally {
        setUiLocked(false);
        setTimeout(() => hideUploadProgress(), 800);
      }
    });

    renderTagPills();
    renderSeriesOptions();
    renderNew();
  

