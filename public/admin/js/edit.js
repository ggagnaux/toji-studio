    import {
      loadStateAutoSync, saveState, qs, el, setYearFooter, ensureBaseStyles, upsertTag, confirmToast, showToast
    } from "../admin.js";

    import {
      getAdminToken,
      patchArtworkToBackend,
      API_BASE
    } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();

    function ensureSocialPanelStyles(){
      if (document.getElementById("social-posting-styles")) return;
      const style = document.createElement("style");
      style.id = "social-posting-styles";
      style.textContent = `
        .social-posting-grid{
          display:grid;
          gap:10px;
          margin-top:10px;
        }
        .social-posting-row{
          border:1px solid var(--line);
          border-radius:12px;
          padding:10px;
          background: color-mix(in srgb, var(--panel) 96%, transparent);
          display:grid;
          gap:8px;
        }
        .social-posting-head{
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
        }
        .social-posting-head .pill{
          font-size:12px;
          padding:5px 8px;
        }
        .social-posting-fields{
          display:grid;
          gap:8px;
          grid-template-columns: minmax(120px, 180px) 1fr;
        }
        .social-posting-fields .field{
          margin-top:0 !important;
        }
        .social-posting-actions{
          display:flex;
          gap:8px;
          align-items:center;
          flex-wrap:wrap;
        }
        .social-posting-muted{
          color:var(--muted);
          font-size:12px;
          margin-left:auto;
        }
        .social-site-tabbar{
          display:flex;
          gap:0;
          flex-wrap:wrap;
          margin-top:8px;
          border-bottom:1px solid var(--line);
        }
        .social-site-tabbtn{
          --site-color: var(--accent);
          border:1px solid transparent;
          border-bottom:1px solid color-mix(in srgb, var(--site-color) 38%, var(--line));
          background: transparent;
          color: var(--muted);
          border-radius:10px 10px 0 0;
          padding:8px 12px;
          cursor:pointer;
          font-size:13px;
          margin-bottom:-1px;
        }
        .social-site-tabbtn.is-active{
          border-color: color-mix(in srgb, var(--site-color) 88%, var(--line));
          border-bottom-color: transparent;
          background: color-mix(in srgb, var(--site-color) 16%, var(--panel));
          color: var(--text);
        }
        .social-site-panel{
          --social-site-color: var(--accent);
          border:1px solid color-mix(in srgb, var(--social-site-color) 80%, var(--line));
          border-top-color: color-mix(in srgb, var(--social-site-color) 80%, var(--line));
          border-radius:0 0 10px 10px;
          padding:10px;
          margin-top:0;
          background: color-mix(in srgb, var(--social-site-color) 8%, var(--panel));
        }
        .edit-tabbar{
          display:flex;
          gap:0;
          flex-wrap:wrap;
          margin-bottom:0;
          border-bottom:1px solid var(--line);
        }
        .edit-tabbtn{
          border:1px solid transparent;
          border-bottom:1px solid var(--line);
          background: transparent;
          color: var(--muted);
          border-radius:10px 10px 0 0;
          padding:8px 12px;
          cursor:pointer;
          font-size:13px;
          margin-bottom:-1px;
        }
        .edit-tabbtn.is-active{
          border-bottom-color: transparent;
          color: var(--text);
          margin-bottom:-1px;
        }
        .edit-tabbtn.tab-details.is-active{
          border-color: color-mix(in srgb, var(--accent) 90%, var(--line));
          background: color-mix(in srgb, var(--accent-soft) 88%, var(--panel));
          box-shadow: none;
        }
        .edit-tabbtn.tab-social.is-active{
          border-color: color-mix(in srgb, #2a97d4 82%, var(--line));
          background: color-mix(in srgb, #2a97d4 16%, var(--panel));
          box-shadow: none;
        }
        .edit-tabcontent{
          border:1px solid var(--line);
          border-radius:0 0 12px 12px;
          padding:12px;
          background: color-mix(in srgb, var(--panel) 98%, transparent);
        }
        .edit-tabcontent.tab-active-details{
          border-color: color-mix(in srgb, var(--accent) 82%, var(--line));
          border-top-color: color-mix(in srgb, var(--accent) 82%, var(--line));
          box-shadow: none;
        }
        .edit-tabcontent.tab-active-social{
          border-color: color-mix(in srgb, #2a97d4 82%, var(--line));
          border-top-color: color-mix(in srgb, #2a97d4 82%, var(--line));
          box-shadow: none;
        }
        .edit-tabpane[hidden]{
          display:none !important;
        }
        .btn-ai{
          border-color: color-mix(in srgb, #2a97d4 82%, var(--line));
          background: color-mix(in srgb, #2a97d4 16%, var(--panel));
          color: var(--text);
          font-weight: 700;
          letter-spacing: .01em;
          box-shadow: 0 0 0 1px color-mix(in srgb, #2a97d4 22%, transparent) inset;
        }
        .btn-ai:hover{
          border-color: color-mix(in srgb, #2a97d4 92%, var(--line));
          background: color-mix(in srgb, #2a97d4 24%, var(--panel));
          transform: translateY(-1px);
        }
        .btn-ai:focus-visible{
          outline: 2px solid color-mix(in srgb, #2a97d4 72%, transparent);
          outline-offset: 2px;
        }
        .btn-ai[disabled]{
          opacity: .75;
          transform: none;
          cursor: wait;
        }
        @media (max-width: 780px){
          .social-posting-fields{
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 980px){
          .edit-main-card,
          .edit-side-card{
            grid-column: 1 / -1 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
    ensureSocialPanelStyles();

    const state = await loadStateAutoSync();
    const id = qs("id");
    const a = state.artworks.find(x => x.id === id) || state.artworks[0];

    const root = document.getElementById("root");
    const backNavBtn = document.getElementById("backNavBtn");
    const h1 = document.getElementById("h1");
    const sub = document.getElementById("sub");

    backNavBtn?.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "index.html";
    });

    if (!a) {
      root.appendChild(el("div", { class:"sub" }, "No artwork found." ));
      throw new Error("No artwork");
    }

    // -----------------------
    // Status + autosave wiring
    // -----------------------
    const status = el("span", { class:"sub", id:"status", "aria-live":"polite" }, "");

    function setStatusText(msg, ms=10000, tone="info"){
      if (!msg) return;
      if (tone === "error") console.error(`[Edit] ${msg}`);
      showToast(msg, { tone, duration: Math.max(10000, Number(ms) || 0) });
    }

    function localSave(quiet=false){
      a.updatedAt = new Date().toISOString();
      saveState(state);
      h1.textContent = a.title || "Untitled";
      sub.textContent = `ID: ${a.id} • Status: ${a.status}`;
      if (!quiet) setStatusText("Saved locally.");
    }

    // Debounced backend PATCH
    let saveTimer = null;
    let saving = false;
    let lastPatchJson = "";

    function buildPatch(){
      return {
        title: a.title || "",
        year: a.year || "",
        series: a.series || "",
        description: a.description || "",
        alt: a.alt || "",
        status: a.status || "draft",
        featured: !!a.featured,
        sortOrder: Number(a.sortOrder || 0),
        tags: Array.isArray(a.tags) ? a.tags : []
      };
    }

    // Treat current loaded state as baseline; prevents write-on-load loops.
    lastPatchJson = JSON.stringify(buildPatch());

    async function flushBackendSave(force=false){
      const token = getAdminToken();
      if (!token) {
        if (force) setStatusText("No admin token - saved locally only.", 10000, "warn");
        return;
      }

      const patch = buildPatch();
      const patchJson = JSON.stringify(patch);

      // avoid spamming identical saves
      if (!force && patchJson === lastPatchJson) return;

      saving = true;
      setStatusText("Saving...", 10000, "info");

      try {
        const updated = await patchArtworkToBackend(a.id, patch);

        // merge backend truth into local cache + current object
        Object.assign(a, updated);

        // also keep series/tags lists healthy
        if (a.series && !state.series.includes(a.series)) state.series.push(a.series);
        for (const t of (a.tags || [])) upsertTag(state, t);

        lastPatchJson = patchJson;
        localSave(true);
        setStatusText("Saved to backend.", 10000, "success");
      } catch (err) {
        setStatusText(`Backend save failed - local only. (${err?.message || err})`, 10000, "error");
      } finally {
        saving = false;
      }
    }



    async function replaceImage(){
      const token = getAdminToken();
      if (!token) return setStatusText("No admin token - set it in Upload page.", 10000, "warn");

      const inp = document.getElementById("replaceFile");
      const f = inp?.files?.[0];
      if (!f) {
        setStatusText("Pick an image first.", 10000, "warn");
        const pickerPanel = document.getElementById("replaceFilePickerPanel");
        if (pickerPanel) {
          pickerPanel.classList.remove("file-picker-shell-flash");
          void pickerPanel.offsetWidth;
          pickerPanel.classList.add("file-picker-shell-flash");
        }
        return;
      }

      const setMedia = (m, tone="info") => { if (m) showToast(m, { tone, duration: 10000 }); };

      setMedia("Replacing…");

      try{
        const fd = new FormData();
        fd.append("file", f);

        // call backend
        const updated = await (await fetch(
          `${(await import("../admin.js")).API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/replace-image`,
          {
            method: "POST",
            headers: { "Authorization": `Bearer ${getAdminToken()}` },
            body: fd
          }
        )).json();

        if (updated?.error) throw new Error(updated.error);

        // Normalize + merge into local object
        const { API_BASE } = await import("../admin.js");
        const norm = (p) => !p ? p : (p.startsWith("http") ? p : (p.startsWith("/") ? `${API_BASE}${p}` : p));
        updated.thumb = norm(updated.thumb);
        updated.image = norm(updated.image);
        updated.featured = !!updated.featured;

        Object.assign(a, updated);
        localSave(true);

        // Update preview immediately (cache-bust)
        const img = document.getElementById("previewImg");
        if (img) img.src = `${a.image}?v=${Date.now()}`;

        setMedia("Replaced.", "success");
        inp.value = "";
      }catch(err){
        setMedia(`Replace failed: ${err?.message || err}`, "error");
      }
    }

    async function regenVariants(){
      const token = getAdminToken();
      if (!token) return setStatusText("No admin token - set it in Upload page.", 10000, "warn");

      const setMedia = (m, tone="info") => { if (m) showToast(m, { tone, duration: 10000 }); };

      setMedia("Regenerating…");

      try{
        const { API_BASE } = await import("../admin.js");
        const res = await fetch(
          `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/regenerate-variants`,
          {
            method: "POST",
            headers: { "Authorization": `Bearer ${getAdminToken()}` }
          }
        );

        const updated = await res.json();
        if (!res.ok) throw new Error(updated?.error || `${res.status} ${res.statusText}`);

        const norm = (p) => !p ? p : (p.startsWith("http") ? p : (p.startsWith("/") ? `${API_BASE}${p}` : p));
        updated.thumb = norm(updated.thumb);
        updated.image = norm(updated.image);
        updated.featured = !!updated.featured;

        Object.assign(a, updated);
        localSave(true);

        const img = document.getElementById("previewImg");
        if (img) img.src = `${a.image}?v=${Date.now()}`;

        setMedia("Done.", "success");
      }catch(err){
        setMedia(`Regen failed: ${err?.message || err}`, "error");
      }
    }

    async function deleteArtwork(){
      const ok = await confirmToast(
        "Delete this artwork? This removes the original + variants on the server and cannot be undone.",
        { confirmLabel: "Delete", cancelLabel: "Cancel", tone: "warn" }
      );
      if (!ok) return;

      const token = getAdminToken();
      if (!token) return setStatusText("No admin token - set it in Upload page.", 10000, "warn");

      setStatusText("Deleting...", 10000, "warn");

      try{
        const { API_BASE } = await import("../admin.js");
        const res = await fetch(`${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${getAdminToken()}` }
        });

        const j = await res.json().catch(()=> ({}));
        if (!res.ok) throw new Error(j?.error || `${res.status} ${res.statusText}`);

        // Remove from local cache
        const idx = state.artworks.findIndex(x => x.id === a.id);
        if (idx >= 0) state.artworks.splice(idx, 1);
        saveState(state);

        // Go back to dashboard
        location.href = "index.html";
      }catch(err){
        setStatusText(`Delete failed: ${err?.message || err}`, 10000, "error");
      }
    }









    function scheduleBackendSave(){
      // Always save local immediately
      localSave(true);

      // Debounce backend save
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => flushBackendSave(false), 700);
    }

    function setStatus(next){
      a.status = next;
      if (next === "published" && !a.publishedAt) a.publishedAt = new Date().toISOString();
      localSave(true);
      flushBackendSave(true);
      sub.textContent = `ID: ${a.id} • Status: ${a.status}`;
    }

    function extractGeneratedDescription(payload){
      if (!payload) return "";
      if (typeof payload === "string") return payload.trim();
      if (typeof payload.description === "string") return payload.description.trim();
      if (typeof payload.text === "string") return payload.text.trim();
      if (typeof payload.output_text === "string") return payload.output_text.trim();
      if (Array.isArray(payload.output)) {
        for (const row of payload.output) {
          if (typeof row?.content?.[0]?.text === "string") return row.content[0].text.trim();
          if (typeof row?.text === "string") return row.text.trim();
        }
      }
      return "";
    }

    function extractGeneratedTags(payload){
      if (!payload) return [];
      const fromArray = Array.isArray(payload.tags) ? payload.tags : null;
      const text =
        fromArray ? fromArray.join(",") :
        (typeof payload.output_text === "string" ? payload.output_text :
        (typeof payload.text === "string" ? payload.text :
        (typeof payload.tags === "string" ? payload.tags : "")));

      if (!text && !fromArray) return [];

      const rawParts = (fromArray || String(text).split(/[\n,;|]/g))
        .map((p) => String(p || "").replace(/^[-*•\d\.\)\s]+/, "").trim())
        .map((p) => p.replace(/^#/, "").replace(/["']/g, "").trim())
        .map((p) => p.toLowerCase())
        .map((p) => p.replace(/\s+/g, " "))
        .map((p) => p.replace(/[^a-z0-9 -]/g, "").trim())
        .filter(Boolean)
        .filter((p) => p.length <= 32);

      return Array.from(new Set(rawParts)).slice(0, 20);
    }

    async function generateDescriptionViaAi(){
      const endpoint = String(
        localStorage.getItem("toji_ai_description_endpoint_v1") ||
        `${API_BASE}/api/admin/ai/describe-artwork`
      ).trim();
      if (!endpoint) throw new Error("AI endpoint is not configured.");

      const payload = {
        artworkId: a.id,
        imageUrl: a.image || a.thumb || "",
        title: a.title || "",
        year: a.year || "",
        series: a.series || "",
        alt: a.alt || "",
        tags: Array.isArray(a.tags) ? a.tags : [],
        description: a.description || ""
      };

      const headers = { "Content-Type": "application/json" };
      const token = getAdminToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      let json = null;
      try { json = await res.json(); } catch {}
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);

      const generated = extractGeneratedDescription(json);
      if (!generated) throw new Error("AI response did not include a description.");
      return generated;
    }

    async function generateTagsViaAi(){
      const endpoint = String(
        localStorage.getItem("toji_ai_tags_endpoint_v1") ||
        `${API_BASE}/api/admin/ai/generate-tags`
      ).trim();
      if (!endpoint) throw new Error("AI endpoint is not configured.");

      const payload = {
        artworkId: a.id,
        imageUrl: a.image || a.thumb || "",
        title: a.title || "",
        year: a.year || "",
        series: a.series || "",
        alt: a.alt || "",
        tags: Array.isArray(a.tags) ? a.tags : [],
        description: a.description || ""
      };

      const headers = { "Content-Type": "application/json" };
      const token = getAdminToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      let json = null;
      try { json = await res.json(); } catch {}
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);

      const generated = extractGeneratedTags(json);
      if (!generated.length) throw new Error("AI response did not include usable tags.");
      return generated;
    }

    let generatingDescription = false;
    const descriptionGenerateBtn = el(
      "button",
      { class:"btn mini btn-ai", type:"button", style:"padding:6px 10px; margin-left:auto; margin-bottom:10px;" },
      "🤖 Generate"
    );
    descriptionGenerateBtn.addEventListener("click", async () => {
      if (generatingDescription) return;

      const ok = await confirmToast(
        "Generate a new description from the artwork image using an external Ai system? This will replace the current Description field.",
        {
          confirmLabel: "Generate",
          cancelLabel: "Cancel",
          tone: "warn",
          highlightText: "Note: This will consume API tokens."
        }
      );
      if (!ok) return;

      generatingDescription = true;
      descriptionGenerateBtn.disabled = true;
      descriptionGenerateBtn.textContent = "🤖 Generating...";
      setStatusText("Generating description...", 10000, "info");

      try {
        const generated = await generateDescriptionViaAi();
        a.description = generated;
        const descriptionInput = document.getElementById("description");
        if (descriptionInput) descriptionInput.value = generated;
        scheduleBackendSave();
        setStatusText("Description generated.", 10000, "success");
      } catch (err) {
        setStatusText(`Generate failed: ${err?.message || err}`, 10000, "error");
      } finally {
        generatingDescription = false;
        descriptionGenerateBtn.disabled = false;
        descriptionGenerateBtn.textContent = "🤖 Generate";
      }
    });

    const TAG_CAP_KEY = "toji_ai_tag_cap_v1";

    function normalizeTagCap(value){
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n)) return 20;
      return Math.min(120, Math.max(1, n));
    }

    function getTagCap(){
      return normalizeTagCap(localStorage.getItem(TAG_CAP_KEY));
    }

    function normalizeTagList(tags){
      const cap = getTagCap();
      return Array.from(
        new Set(
          (Array.isArray(tags) ? tags : [])
            .map((t) => String(t || "").trim().toLowerCase())
            .map((t) => t.replace(/\s+/g, " "))
            .map((t) => t.replace(/[^a-z0-9 -]/g, "").trim())
            .filter(Boolean)
            .filter((t) => t.length <= 32)
        )
      ).slice(0, cap);
    }

    let refreshTagsEditorView = () => {};
    let generatingTags = false;
    const tagsGenerateBtn = el(
      "button",
      { class:"btn mini btn-ai", type:"button", style:"padding:6px 10px; margin-left:auto;" },
      "🤖 Generate"
    );
    tagsGenerateBtn.addEventListener("click", async () => {
      if (generatingTags) return;

      const ok = await confirmToast(
        "Generate tags from the artwork image using an external Ai system? New tags will be merged with existing tags.",
        {
          confirmLabel: "Generate",
          cancelLabel: "Cancel",
          tone: "warn",
          highlightText: "Note: This will consume API tokens."
        }
      );
      if (!ok) return;

      generatingTags = true;
      tagsGenerateBtn.disabled = true;
      tagsGenerateBtn.textContent = "🤖 Generating...";
      setStatusText("Generating tags...", 10000, "info");

      try {
        const generated = await generateTagsViaAi();
        const merged = normalizeTagList([...(a.tags || []), ...generated]);
        a.tags = merged;
        for (const t of merged) upsertTag(state, t);
        refreshTagsEditorView();
        scheduleBackendSave();
        const cap = getTagCap();
        const isAtCap = merged.length >= cap;
        const generatedMsg = `Generated ${generated.length} tag${generated.length === 1 ? "" : "s"}.`;
        const capMsg = isAtCap ? ` Reached cap (${cap}).` : "";
        setStatusText(`${generatedMsg}${capMsg}`, 10000, "success");
      } catch (err) {
        setStatusText(`Generate failed: ${err?.message || err}`, 10000, "error");
      } finally {
        generatingTags = false;
        tagsGenerateBtn.disabled = false;
        tagsGenerateBtn.textContent = "🤖 Generate";
      }
    });

    const SOCIAL_STATUSES = ["draft", "queued", "posted", "failed", "skipped"];
    const socialState = {
      posts: [],
      loading: false,
      saving: new Set(),
      binding: false,
      selectedBoundPlatformId: ""
    };
    const socialAutoSaveTimers = new Map();
    const socialBindSelect = el("select", { "aria-label":"Available social platforms" });
    const socialBindBtn = el("button", { class:"btn mini", type:"button" }, "Bind platform");
    const socialBoundLabel = el("div", { class:"sub", style:"margin-top:10px; display:none;" }, "Bound platforms");
    const socialBoundPills = el("div", { class:"social-site-tabbar" });
    const socialRowsHost = el("div", { class:"social-posting-grid social-site-panel" });
    const socialSummary = el("div", { class:"sub", "aria-live":"polite" }, "");
    const socialBindLabel = el("div", { class:"sub" }, "Available platforms");
    const socialBindField = el("div", { class:"field" }, socialBindLabel, socialBindSelect);
    const socialBindBtnWrap = el("div", { style:"display:flex; align-items:flex-end;" }, socialBindBtn);
    const socialBindRow = el("div", { class:"social-posting-fields", style:"margin-top:10px; grid-template-columns: 1fr auto;" },
      socialBindField,
      socialBindBtnWrap
    );

    function clearSocialAutoSaveTimer(platformId) {
      const key = String(platformId || "").trim();
      if (!key) return;
      const timer = socialAutoSaveTimers.get(key);
      if (timer) clearTimeout(timer);
      socialAutoSaveTimers.delete(key);
    }

    function buildSocialField(labelText, inputNode){
      return el("div", { class:"field" },
        el("div", { class:"sub" }, labelText),
        inputNode
      );
    }

    function getSocialPartitions() {
      const all = (socialState.posts || []).filter((p) =>
        p?.platformEnabled == null ? true : !!p.platformEnabled
      );
      return {
        all,
        bound: all.filter((p) => !!p.id),
        available: all.filter((p) => !p.id)
      };
    }

    const SOCIAL_COLOR_PALETTE = [
      "#2a97d4", // blue
      "#2ea97d", // green
      "#d18b2e", // amber
      "#d15353", // red
      "#8a63d2", // violet
      "#cf5ea8", // pink
      "#3aa5a0", // teal
      "#7e8c2b"  // olive
    ];

    function hashString(text) {
      let h = 0;
      for (let i = 0; i < text.length; i++) {
        h = ((h << 5) - h) + text.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    }

    function colorForPlatformId(platformId) {
      const key = String(platformId || "").trim().toLowerCase();
      if (!key) return SOCIAL_COLOR_PALETTE[0];
      return SOCIAL_COLOR_PALETTE[hashString(key) % SOCIAL_COLOR_PALETTE.length];
    }

    async function fetchSocialPosts(){
      const token = getAdminToken();
      if (!token) throw new Error("No admin token - set it in Upload page.");

      const res = await fetch(`${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
      return Array.isArray(json?.posts) ? json.posts : [];
    }

    async function saveSocialPost(platformId, payload){
      const token = getAdminToken();
      if (!token) throw new Error("No admin token - set it in Upload page.");

      const res = await fetch(
        `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts/${encodeURIComponent(platformId)}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
      return json;
    }

    async function deleteSocialPost(platformId){
      const token = getAdminToken();
      if (!token) throw new Error("No admin token - set it in Upload page.");

      const res = await fetch(
        `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts/${encodeURIComponent(platformId)}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        }
      );
      if (res.status === 404) return;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
    }

    function renderSocialEditor(post) {
      const platformId = String(post.platformId || "").trim();
      const statusInput = el("select", {},
        ...SOCIAL_STATUSES.map((s) =>
          el("option", { value:s, selected: (post.status || "draft") === s ? "" : null }, s)
        )
      );
      const captionInput = el("textarea", { placeholder:"Caption for this platform..." }, post.caption || "");
      const urlInput = el("input", { type:"url", placeholder:"https://...", value: post.postUrl || "" });
      const externalIdInput = el("input", { placeholder:"External post id", value: post.externalPostId || "" });
      const errorInput = el("input", { placeholder:"Last error message (optional)", value: post.errorMessage || "" });

      const useDescriptionBtn = el("button", { class:"btn mini", type:"button" }, "Use description");

      const buildPayload = () => ({
        status: statusInput.value,
        caption: captionInput.value,
        postUrl: urlInput.value,
        externalPostId: externalIdInput.value,
        errorMessage: errorInput.value
      });

      const queueAutoSave = (delayMs = 0) => {
        clearSocialAutoSaveTimer(platformId);
        const timer = setTimeout(async () => {
          socialAutoSaveTimers.delete(platformId);
          socialState.saving.add(platformId);
          try {
            await saveSocialPost(platformId, buildPayload());
            await loadSocialPanel(platformId);
          } catch (err) {
            setStatusText(`Social save failed: ${err?.message || err}`, 10000, "error");
          } finally {
            socialState.saving.delete(platformId);
          }
        }, Math.max(0, Number(delayMs) || 0));
        socialAutoSaveTimers.set(platformId, timer);
      };

      statusInput.addEventListener("change", () => queueAutoSave(0));
      captionInput.addEventListener("blur", () => queueAutoSave(0));
      urlInput.addEventListener("blur", () => queueAutoSave(0));
      externalIdInput.addEventListener("blur", () => queueAutoSave(0));
      errorInput.addEventListener("blur", () => queueAutoSave(0));

      const savingNow = socialState.saving.has(platformId);

      useDescriptionBtn.addEventListener("click", async () => {
        const description = String(a.description || "").trim();
        if (!description) {
          setStatusText("Description is empty. Add or generate a description first.", 10000, "warn");
          return;
        }
        const currentCaption = String(captionInput.value || "").trim();
        if (currentCaption) {
          const ok = await confirmToast(
            "Replace the existing Caption with the Description text?",
            { confirmLabel: "Replace", cancelLabel: "Cancel", tone: "warn" }
          );
          if (!ok) return;
        }
        captionInput.value = description;
        queueAutoSave(120);
      });

      const unbindBtn = el("button", { class:"btn mini", type:"button" }, "Unbind");
      unbindBtn.addEventListener("click", async () => {
        const ok = await confirmToast(
          `Unbind ${post.platformName || platformId} from this image?`,
          { confirmLabel: "Unbind", cancelLabel: "Cancel", tone: "warn" }
        );
        if (!ok) return;

        clearSocialAutoSaveTimer(platformId);
        socialState.saving.add(platformId);
        renderSocialPanel();
        try {
          await deleteSocialPost(platformId);
          setStatusText(`Unbound ${post.platformName || platformId}.`, 10000, "success");
          if (socialState.selectedBoundPlatformId === platformId) {
            socialState.selectedBoundPlatformId = "";
          }
          await loadSocialPanel();
        } catch (err) {
          setStatusText(`Social unbind failed: ${err?.message || err}`, 10000, "error");
        } finally {
          socialState.saving.delete(platformId);
          renderSocialPanel();
        }
      });

      return [
        el("div", { class:"social-posting-head" },
          el("strong", {}, post.platformName || platformId),
          post.platformEnabled ? el("span", { class:"pill" }, "Enabled") : el("span", { class:"pill" }, "Disabled"),
          post.postedAt ? el("span", { class:"pill" }, `Posted: ${String(post.postedAt).slice(0, 10)}`) : null
        ),
        el("div", { class:"social-posting-fields" },
          buildSocialField("Status", statusInput),
          buildSocialField("Post URL", urlInput),
          buildSocialField("External ID", externalIdInput),
          buildSocialField("Error", errorInput)
        ),
        buildSocialField("Caption", captionInput),
        el("div", { class:"social-posting-actions" },
          unbindBtn,
          useDescriptionBtn,
          el("span", { class:"social-posting-muted" }, savingNow ? "Saving..." : (post.updatedAt ? `Updated ${String(post.updatedAt).slice(0, 19).replace("T", " ")}` : "Not saved yet"))
        )
      ];
    }

    function renderSocialPanel(){
      const enabledCount = (socialState.posts || []).filter((p) =>
        p?.platformEnabled == null ? true : !!p.platformEnabled
      ).length;

      if (socialState.loading) {
        socialSummary.textContent = "Loading social platforms...";
        socialBindLabel.textContent = "Available platforms";
        socialBindRow.style.display = "grid";
        socialBindSelect.style.display = "";
        socialBindBtnWrap.style.display = "flex";
        socialBindSelect.innerHTML = "";
        socialBindSelect.appendChild(el("option", { value:"" }, "Loading..."));
        socialBindSelect.disabled = true;
        socialBindBtn.disabled = true;
        socialBoundPills.innerHTML = "";
        socialBoundPills.style.display = "";
        socialBoundLabel.style.display = "none";
        socialRowsHost.innerHTML = "";
        socialRowsHost.style.display = "";
        socialRowsHost.classList.remove("social-posting-row");
        socialRowsHost.appendChild(el("div", { class:"sub" }, "Loading..."));
        return;
      }

      if (!socialState.posts.length) {
        socialSummary.textContent = "No social platforms available.";
        socialBindLabel.textContent = "No active platforms available";
        socialBindRow.style.display = "grid";
        socialBindSelect.style.display = "none";
        socialBindBtnWrap.style.display = "none";
        socialBindSelect.innerHTML = "";
        socialBindSelect.appendChild(el("option", { value:"" }, "No platforms"));
        socialBindSelect.disabled = true;
        socialBindBtn.disabled = true;
        socialBoundPills.innerHTML = "";
        socialBoundPills.style.display = "none";
        socialBoundLabel.style.display = "none";
        socialRowsHost.innerHTML = "";
        socialRowsHost.style.display = "none";
        socialRowsHost.classList.remove("social-posting-row");
        return;
      }

      if (!enabledCount) {
        socialSummary.textContent = `${socialState.posts.length} platforms • 0 bound to this image`;
        socialBindLabel.textContent = "No active platforms available";
        socialBindRow.style.display = "grid";
        socialBindSelect.style.display = "none";
        socialBindBtnWrap.style.display = "none";
        socialBindSelect.innerHTML = "";
        socialBindSelect.appendChild(el("option", { value:"" }, "No active platforms"));
        socialBindSelect.disabled = true;
        socialBindBtn.disabled = true;
        socialBoundPills.innerHTML = "";
        socialBoundPills.style.display = "none";
        socialBoundLabel.style.display = "none";
        socialRowsHost.innerHTML = "";
        socialRowsHost.style.display = "none";
        socialRowsHost.classList.remove("social-posting-row");
        return;
      }

      const { bound, available } = getSocialPartitions();
      socialBindLabel.textContent = "Available platforms";
      socialBindRow.style.display = "grid";
      socialBindSelect.style.display = "";
      socialBindBtnWrap.style.display = "flex";
      socialBoundPills.style.display = "";
      socialRowsHost.style.display = "";
      socialBoundLabel.style.display = "none";
      socialRowsHost.classList.remove("social-posting-row");
      socialSummary.textContent = `${socialState.posts.length} platforms • ${bound.length} bound to this image`;

      socialBindSelect.innerHTML = "";
      socialBindSelect.appendChild(el("option", { value:"" }, available.length ? "Select a platform..." : "All platforms already bound"));
      for (const p of available) {
        const pid = String(p.platformId || "").trim();
        if (!pid) continue;
        socialBindSelect.appendChild(el("option", { value:pid }, p.platformName || pid));
      }
      socialBindSelect.disabled = !available.length || socialState.binding;
      socialBindBtn.disabled = !available.length || !socialBindSelect.value || socialState.binding;
      socialBindBtnWrap.style.display = socialBindSelect.value ? "flex" : "none";
      socialBindBtn.textContent = socialState.binding ? "Binding..." : "Bind platform";

      socialBoundPills.innerHTML = "";
      socialRowsHost.innerHTML = "";
      if (!bound.length) {
        socialBoundLabel.style.display = "none";
        socialBoundPills.appendChild(el("span", { class:"sub" }, "No social platforms bound yet."));
        socialRowsHost.style.setProperty("--social-site-color", "var(--accent)");
        socialRowsHost.style.display = "none";
        socialRowsHost.classList.remove("social-posting-row");
      } else {
        socialBoundLabel.style.display = "";
        socialRowsHost.style.display = "";
        const validIds = new Set(bound.map((p) => String(p.platformId || "")).filter(Boolean));
        if (socialState.selectedBoundPlatformId && !validIds.has(socialState.selectedBoundPlatformId)) {
          socialState.selectedBoundPlatformId = "";
        }
        if (!socialState.selectedBoundPlatformId && bound.length) {
          socialState.selectedBoundPlatformId = String(bound[0].platformId || "");
        }

        for (const p of bound) {
          const pid = String(p.platformId || "").trim();
          const active = pid && pid === socialState.selectedBoundPlatformId;
          const tabColor = colorForPlatformId(pid);
          const btn = el("button", {
            class: active ? "social-site-tabbtn is-active" : "social-site-tabbtn",
            type:"button",
            onclick: () => {
              socialState.selectedBoundPlatformId = pid;
              renderSocialPanel();
            }
          }, p.platformName || pid);
          btn.style.setProperty("--site-color", tabColor);
          socialBoundPills.appendChild(
            btn
          );
        }
        const selected = bound.find((p) => String(p.platformId || "") === socialState.selectedBoundPlatformId) || null;
        if (!selected) {
          socialRowsHost.appendChild(el("div", { class:"sub" }, "Click a platform tab to show its detail section."));
          socialRowsHost.style.setProperty("--social-site-color", "var(--accent)");
          socialRowsHost.classList.remove("social-posting-row");
        } else {
          socialRowsHost.style.setProperty("--social-site-color", colorForPlatformId(selected.platformId));
          socialRowsHost.classList.add("social-posting-row");
          const socialContent = renderSocialEditor(selected);
          socialContent.forEach((node) => socialRowsHost.appendChild(node));
        }
      }
    }

    socialBindSelect.addEventListener("change", () => {
      socialBindBtn.disabled = !socialBindSelect.value || socialState.binding;
      socialBindBtnWrap.style.display = socialBindSelect.value ? "flex" : "none";
    });

    socialBindBtn.addEventListener("click", async () => {
      const platformId = String(socialBindSelect.value || "").trim();
      if (!platformId) return;
      socialState.binding = true;
      renderSocialPanel();
      try {
        await saveSocialPost(platformId, { status: "draft" });
        setStatusText("Social platform bound.", 10000, "success");
        await loadSocialPanel();
      } catch (err) {
        setStatusText(`Bind failed: ${err?.message || err}`, 10000, "error");
      } finally {
        socialState.binding = false;
        renderSocialPanel();
      }
    });

    async function loadSocialPanel(preferredPlatformId = ""){
      socialState.loading = true;
      renderSocialPanel();
      try {
        socialState.posts = await fetchSocialPosts();
        if (preferredPlatformId) socialState.selectedBoundPlatformId = String(preferredPlatformId || "");
      } catch (err) {
        socialState.posts = [];
        socialSummary.textContent = String(err?.message || err);
        setStatusText(`Social panel failed to load: ${err?.message || err}`, 10000, "error");
      } finally {
        socialState.loading = false;
        renderSocialPanel();
      }
    }

    // -----------------------
    // Initial header text
    // -----------------------
    h1.textContent = a.title || "Untitled";
    sub.textContent = `ID: ${a.id} • Status: ${a.status}`;

    // -----------------------
    // UI
    // -----------------------
    const left = el("div", { class:"card edit-main-card", style:"grid-column: span 7" },
      el("div", { class:"thumb", style:"aspect-ratio:16/10; width:50%; margin:0 auto;" },
        el("img", {
          id: "previewImg",
          src: a.image || a.thumb,
          alt: a.alt || a.title,
          style:"object-fit:contain;background:var(--bg)"
        })
      ),
      el("div", { class:"meta" },
        el("div", { class:"pillrow" },
          el("button", { class:"btn mini", type:"button", onclick:()=>setStatus("published") }, "Publish"),
          el("button", { class:"btn mini", type:"button", onclick:()=>setStatus("draft") }, "Draft"),
          el("button", { class:"btn mini", type:"button", onclick:()=>setStatus("hidden") }, "Hide"),
          el("span", { style:"margin-left:auto" }, status)
        ),


        el("hr", { class:"sep" }),

        el("p", { class:"title" }, "Media tools"),
        el("div", { class:"sub" }, "Replace original (private) and regenerate resized variants."),

        el("div", { class:"field", style:"margin-top:12px" },
          el("div", { class:"sub" }, "Replace image"),
          el("div", { id:"replaceFilePickerPanel", class:"file-picker-shell" },
            el("input", { id:"replaceFile", type:"file", accept:"image/*" })
          )
        ),

        el("div", { style:"display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:12px" },
          el("button", { class:"btn", type:"button", onclick: replaceImage }, "Replace image"),
          el("button", { class:"btn", type:"button", onclick: regenVariants }, "Regenerate variants"),
          el("span", { class:"sub", id:"mediaStatus", "aria-live":"polite" }, "")
        ),
      )
    );

    function getSeriesOptions(currentValue = ""){
      const metaRows = Object.values(state.seriesMeta || {})
        .filter((row) => row && row.name)
        .sort((a, b) => {
          const byOrder = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
          if (byOrder !== 0) return byOrder;
          return String(a.name).localeCompare(String(b.name));
        })
        .map((row) => String(row.name).trim())
        .filter(Boolean);

      // Keep local labels as fallback when no metadata exists yet.
      const fallbackRows = Array.isArray(state.series) ? state.series : [];
      const set = new Set([...metaRows, ...fallbackRows, ...(currentValue ? [currentValue] : [])]);
      return Array.from(set).filter(Boolean);
    }

    const detailsPane = el("div", { class:"edit-tabpane", "data-tab":"details" },
      field("Title", "title", a.title, (v)=>{ a.title=v; scheduleBackendSave(); }),
      field("Year", "year", a.year || "", (v)=>{ a.year=v; scheduleBackendSave(); }),
      selectField("Series", "series", getSeriesOptions(a.series || ""), a.series || "", (v)=>{
        a.series=v;
        if (v && !state.series.includes(v)) state.series.push(v);
        scheduleBackendSave();
      }),
      field("Alt text", "alt", a.alt || "", (v)=>{ a.alt=v; scheduleBackendSave(); updatePreviewAlt(); }),
      textareaField(
        "Description",
        "description",
        a.description || "",
        (v)=>{ a.description=v; scheduleBackendSave(); },
        { labelAction: descriptionGenerateBtn }
      ),
      el("hr", { class:"sep" }),
      el("div", { style:"display:flex; align-items:center; gap:10px;" },
        el("p", { class:"title", style:"margin:0" }, "Tags"),
        tagsGenerateBtn
      ),
      tagsEditor(),
      el("hr", { class:"sep" }),
      el("div", { class:"pillrow" },
        el("label", { class:"pill", style:"cursor:pointer; display:inline-flex; align-items:center; gap:8px; white-space:nowrap" },
          el("input", {
            type:"checkbox",
            style:"margin:0; width:auto; height:auto;",
            checked: a.featured ? "" : null,
            onchange:(e)=>{ a.featured = e.target.checked; scheduleBackendSave(); }
          }),
          "Featured"
        ),
        el("button", {
          class:"btn mini",
          type:"button",
          style:"margin-left:auto",
          onclick: deleteArtwork
        }, "Delete"),
        el("a", { class:"btn mini", href:"index.html" }, "Done")
      )
    );

    const socialPane = el("div", { class:"edit-tabpane", "data-tab":"social", hidden:"" },
      el("p", { class:"title" }, "Social posting"),
      socialSummary,
      socialBindRow,
      socialBoundLabel,
      socialBoundPills,
      socialRowsHost,
      el("div", { style:"margin-top:10px" },
        el("button", { class:"btn mini", type:"button", onclick: loadSocialPanel }, "Refresh social")
      )
    );

    const detailsTabBtn = el("button", { class:"edit-tabbtn tab-details is-active", type:"button" }, "Details");
    const socialTabBtn = el("button", { class:"edit-tabbtn tab-social", type:"button" }, "Social Media");
    const tabContent = el("div", { class:"edit-tabcontent tab-active-details" },
      detailsPane,
      socialPane
    );

    function setEditTab(tab){
      const onDetails = tab === "details";
      detailsTabBtn.classList.toggle("is-active", onDetails);
      socialTabBtn.classList.toggle("is-active", !onDetails);
      tabContent.classList.toggle("tab-active-details", onDetails);
      tabContent.classList.toggle("tab-active-social", !onDetails);
      if (onDetails) {
        detailsPane.removeAttribute("hidden");
        socialPane.setAttribute("hidden", "");
      } else {
        detailsPane.setAttribute("hidden", "");
        socialPane.removeAttribute("hidden");
      }
    }

    detailsTabBtn.addEventListener("click", () => setEditTab("details"));
    socialTabBtn.addEventListener("click", () => setEditTab("social"));

    const right = el("div", { class:"card edit-side-card", style:"grid-column: span 5" },
      el("div", { class:"meta" },
        el("div", { class:"edit-tabbar", role:"tablist", "aria-label":"Edit sections" },
          detailsTabBtn,
          socialTabBtn
        ),
        tabContent
      )
    );

    root.appendChild(left);
    root.appendChild(right);
    loadSocialPanel();

    function updatePreviewAlt(){
      const img = document.getElementById("previewImg");
      if (img) img.alt = a.alt || a.title || "Artwork";
    }

    // -----------------------
    // Fields
    // -----------------------
    function field(label, id, value, onChange){
      const input = el("input", { id, value: value ?? "" });
      input.addEventListener("input", (e)=> onChange(e.target.value));
      return el("div", { class:"field", style:"margin-top:12px" },
        el("div", { class:"sub" }, label),
        input
      );
    }

    function textareaField(label, id, value, onChange, opts = {}){
      const t = el("textarea", { id }, value ?? "");
      t.addEventListener("input", (e)=> onChange(e.target.value));
      const labelRow = el(
        "div",
        { style:"display:flex; align-items:center; gap:10px;" },
        el("div", { class:"sub" }, label),
        opts.labelAction || null
      );
      return el("div", { class:"field", style:"margin-top:12px" },
        labelRow,
        t
      );
    }

    function selectField(label, id, options, current, onChange){
      // Ensure current exists in options so it shows even if state.series isn't synced yet
      const set = new Set([...(options || []), ...(current ? [current] : [])]);
      const list = Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b));

      const s = el("select", { id },
        el("option", { value:"" }, "—"),
        ...list.map(o => el("option", { value:o, selected: o===current ? "" : null }, o))
      );
      s.addEventListener("change", (e)=> onChange(e.target.value));
      return el("div", { class:"field", style:"margin-top:12px" },
        el("div", { class:"sub" }, label),
        s
      );
    }

    function tagsEditor(){
      const wrap = el("div", { style:"display:grid; gap:10px; margin-top:10px" });
      const list = el("div", { class:"pillrow" });

      const input = el("input", { placeholder:"type tag + Enter" });
      input.addEventListener("keydown", (e)=>{
        if (e.key !== "Enter") return;
        e.preventDefault();
        const t = input.value.trim().toLowerCase();
        if (!t) return;

        const current = normalizeTagList(a.tags || []);
        const cap = getTagCap();
        if (!current.includes(t) && current.length >= cap) {
          setStatusText(`Tag cap reached (${cap}). Remove a tag or raise the cap in Other Settings.`, 10000, "warn");
          return;
        }
        input.value = "";

        a.tags = normalizeTagList([...(a.tags||[]), t]);
        upsertTag(state, t);
        scheduleBackendSave();
        renderTags();
      });

      wrap.appendChild(input);
      wrap.appendChild(list);

      function renderTags(){
        list.innerHTML = "";
        const tags = (a.tags||[]).slice().sort();
        if (!tags.length) list.appendChild(el("span", { class:"sub" }, "No tags yet."));
        for (const t of tags){
          list.appendChild(
            el("span", { class:"pill" },
              t,
              el("button", {
                class:"btn mini",
                type:"button",
                style:"margin-left:8px",
                onclick:()=>{
                  a.tags = (a.tags||[]).filter(x => x !== t);
                  scheduleBackendSave();
                  renderTags();
                }
              }, "×")
            )
          );
        }
      }

      refreshTagsEditorView = renderTags;
      renderTags();
      return wrap;
    }

    // No auto-write on load.
    // Saves occur only after explicit user edits/actions.
  
