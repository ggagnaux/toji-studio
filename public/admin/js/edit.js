    import {
      loadStateAutoSync, saveState, qs, el, setYearFooter, ensureBaseStyles, upsertTag, confirmToast, showToast
    } from "../admin.js";

    import {
      getAdminToken,
      patchArtworkToBackend,
      API_BASE
    } from "../admin.js";
    import { AI_FEATURES_ENABLED_KEY, initEditTabController, isAiFeaturesEnabled, syncAiButtons } from "./edit-controller.js";
    import { initUploadFilterControllers } from "./upload-controller.js";
import { getArtworkPublishReadiness, summarizeReadinessMissing } from "./artwork-readiness.js";

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
        .social-posting-preview{
          display:grid;
          gap:8px;
          padding:12px;
          border:1px solid color-mix(in srgb, var(--social-site-color) 36%, var(--line));
          border-radius:12px;
          background:color-mix(in srgb, var(--social-site-color) 7%, var(--panel));
        }
        .social-posting-preview.is-warning{
          border-color:color-mix(in srgb, #d18b2e 66%, var(--line));
          background:color-mix(in srgb, #d18b2e 11%, var(--panel));
        }
        .social-posting-preview.is-error{
          border-color:color-mix(in srgb, #d15353 66%, var(--line));
          background:color-mix(in srgb, #d15353 11%, var(--panel));
        }
        .social-posting-previewhead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .social-posting-previewtext{
          white-space:pre-wrap;
          line-height:1.55;
          font-size:14px;
        }
        .social-posting-previewmeta{
          display:grid;
          gap:6px;
        }
        .social-posting-previewactions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
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
          display:inline-flex;
          align-items:center;
          gap:8px;
        }
        .social-site-tabicon{
          width:16px;
          height:16px;
          border-radius:4px;
          background:
            radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--site-color) 78%, white) 0 2px, transparent 2.5px),
            color-mix(in srgb, var(--site-color) 14%, transparent);
          flex:0 0 auto;
          display:inline-block;
          overflow:hidden;
        }
        .social-site-tabicon img{
          display:block;
          width:100%;
          height:100%;
          object-fit:contain;
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
        .edit-tabbtn.tab-tags.is-active{
          border-color: color-mix(in srgb, #d08a2f 82%, var(--line));
          background: color-mix(in srgb, #d08a2f 16%, var(--panel));
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
        .edit-tabcontent.tab-active-tags{
          border-color: color-mix(in srgb, #d08a2f 82%, var(--line));
          border-top-color: color-mix(in srgb, #d08a2f 82%, var(--line));
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
          opacity: .55;
          filter: grayscale(.25);
          transform: none;
          cursor: not-allowed;
        }
        .btn-ai[disabled]:hover{
          transform: none;
        }
        .btn-ai[data-tooltip]{
          position: relative;
        }
        .featured-toggle{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:4px 6px 4px 12px;
          border:1px solid var(--line);
          border-radius:999px;
          background:color-mix(in srgb, var(--panel) 94%, transparent);
          color:var(--text);
          cursor:pointer;
          transition:border-color .18s ease, background-color .18s ease, box-shadow .18s ease, transform .12s ease;
        }
        .featured-toggle:hover{
          border-color:var(--hover-line);
          transform:translateY(-1px);
        }
        .featured-toggle:focus-visible{
          outline:2px solid color-mix(in srgb, var(--accent) 56%, transparent);
          outline-offset:2px;
        }
        .featured-toggle__track{
          width:46px;
          height:26px;
          padding:2px;
          display:inline-flex;
          align-items:center;
          justify-content:flex-start;
          border-radius:999px;
          background:color-mix(in srgb, var(--line) 72%, var(--panel));
          box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--line) 88%, transparent);
          transition:background-color .18s ease, box-shadow .18s ease;
        }
        .featured-toggle__dot{
          width:22px;
          height:22px;
          border-radius:50%;
          background:#fff;
          box-shadow:0 1px 3px rgba(0,0,0,.22);
          transform:translateX(0);
          transition:transform .18s ease, background-color .18s ease, box-shadow .18s ease;
        }
        .featured-toggle[aria-pressed="true"]{
          border-color:color-mix(in srgb, var(--accent) 82%, var(--line));
          background:color-mix(in srgb, var(--accent-soft) 84%, var(--panel));
          box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
        }
        .featured-toggle[aria-pressed="true"] .featured-toggle__track{
          background:color-mix(in srgb, var(--accent) 86%, #fff);
          box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent);
        }
        .featured-toggle[aria-pressed="true"] .featured-toggle__dot{
          transform:translateX(20px);
          background:#ffffff;
        }
        .status-toggle{
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:4px;
          border:1px solid var(--line);
          border-radius:999px;
          background:color-mix(in srgb, var(--panel) 94%, transparent);
        }
        .status-toggle__pill{
          border:0;
          border-radius:999px;
          padding:7px 12px;
          background:transparent;
          color:var(--muted);
          cursor:pointer;
          font:inherit;
          font-size:13px;
          font-weight:600;
          transition:background-color .18s ease, color .18s ease, box-shadow .18s ease, transform .12s ease;
        }
        .status-toggle__pill:hover{
          color:var(--text);
          background:color-mix(in srgb, var(--line) 35%, transparent);
          transform:translateY(-1px);
        }
        .status-toggle__pill:focus-visible{
          outline:2px solid color-mix(in srgb, var(--accent) 56%, transparent);
          outline-offset:2px;
        }
        .status-toggle__pill.is-active{
          color:var(--text);
          box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent);
        }
        .status-toggle__pill[data-status-value="published"].is-active{
          background:color-mix(in srgb, #2f9e63 22%, var(--panel));
        }
        .status-toggle__pill[data-status-value="draft"].is-active{
          background:color-mix(in srgb, #c18a2d 24%, var(--panel));
        }
        .status-toggle__pill[data-status-value="hidden"].is-active{
          background:color-mix(in srgb, #8f5565 24%, var(--panel));
        }
        .status-toggle__pill:disabled{
          opacity:.45;
          cursor:not-allowed;
          transform:none;
        }
        .status-toggle__pill:disabled:hover{
          color:var(--muted);
          background:transparent;
          transform:none;
        }
        .edit-publish-readiness{
          display:grid;
          gap:10px;
          padding:12px;
          margin-top:12px;
          border:1px solid color-mix(in srgb, var(--line) 84%, transparent);
          border-radius:14px;
          background:color-mix(in srgb, var(--panel) 96%, transparent);
        }
        .edit-publish-readiness__head{
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
        }
        .edit-publish-readiness__head .title{
          margin:0;
        }
        .edit-publish-readiness__score{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:92px;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--line) 86%, transparent);
          background:color-mix(in srgb, var(--panel) 90%, transparent);
          font-size:12px;
          font-weight:700;
          letter-spacing:.04em;
          text-transform:uppercase;
        }
        .edit-publish-readiness__list{
          display:grid;
          gap:8px;
        }
        .edit-publish-readiness__item{
          display:flex;
          align-items:center;
          gap:10px;
          min-height:38px;
          padding:8px 10px;
          border:1px solid color-mix(in srgb, var(--line) 78%, transparent);
          border-radius:12px;
          background:color-mix(in srgb, var(--panel) 92%, transparent);
        }
        .edit-publish-readiness__item.is-complete{
          border-color:color-mix(in srgb, #2f9e63 52%, var(--line));
          background:color-mix(in srgb, #2f9e63 10%, var(--panel));
        }
        .edit-publish-readiness__item.is-incomplete{
          border-color:color-mix(in srgb, #c18a2d 50%, var(--line));
          background:color-mix(in srgb, #c18a2d 11%, var(--panel));
        }
        .edit-publish-readiness__icon{
          width:22px;
          height:22px;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          font-size:12px;
          font-weight:800;
          flex:0 0 auto;
        }
        .edit-publish-readiness__item.is-complete .edit-publish-readiness__icon{
          background:color-mix(in srgb, #2f9e63 22%, var(--panel));
          color:color-mix(in srgb, #b9f0cf 88%, white);
        }
        .edit-publish-readiness__item.is-incomplete .edit-publish-readiness__icon{
          background:color-mix(in srgb, #c18a2d 18%, var(--panel));
          color:color-mix(in srgb, #ffd98c 92%, white);
        }
        .edit-publish-readiness__body{
          display:grid;
          gap:2px;
        }
        .edit-publish-readiness__label{
          font-weight:700;
        }
        .edit-publish-readiness__detail,
        .edit-publish-readiness__hint{
          color:var(--muted);
          font-size:12px;
          line-height:1.4;
          margin:0;
        }
        .btn-ai[data-tooltip]:hover::after,
        .btn-ai[data-tooltip]:focus-visible::after{
          content: attr(data-tooltip);
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          transform: translateX(-50%);
          max-width: 220px;
          width: max-content;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--line) 86%, #000);
          background: color-mix(in srgb, var(--surface) 92%, #000);
          color: var(--text);
          font-size: 12px;
          line-height: 1.25;
          white-space: normal;
          text-align: center;
          pointer-events: none;
          z-index: 20;
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

    // Ensure seriesSlugs is always an array (backfill from legacy series if needed)
    if (a && !Array.isArray(a.seriesSlugs)) {
      if (a.series) {
        const matchSlug = Object.keys(state.seriesMeta || {}).find(k => {
          const m = state.seriesMeta[k];
          return m && (k === a.series || m.name === a.series || m.slug === a.series);
        });
        a.seriesSlugs = matchSlug ? [matchSlug] : [];
      } else {
        a.seriesSlugs = [];
      }
    }

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
    let publishStatusButton = null;
    let editReadinessScore = null;
    let editReadinessSummary = null;
    let editReadinessList = null;
    let editReadinessHint = null;

    function setStatusText(msg, ms=10000, tone="info"){
      if (!msg) return;
      if (tone === "error") console.error(`[Edit] ${msg}`);
      showToast(msg, { tone, duration: Math.max(10000, Number(ms) || 0) });
    }

    function localSave(quiet=false){
      a.updatedAt = new Date().toISOString();
      saveState(state);
      h1.textContent = a.title || "Untitled";
      sub.textContent = `ID: ${a.id} � Status: ${a.status}`;
      renderPublishReadiness();
      if (!quiet) setStatusText("Saved locally.");
    }

    // Debounced backend PATCH
    let saveTimer = null;
    let saving = false;
    let lastPatchJson = "";
    let refreshSeriesChips = () => {};

    function buildPatch(){
      return {
        title: a.title || "",
        year: a.year || "",
        series: a.series || "",
        seriesSlugs: Array.isArray(a.seriesSlugs) ? a.seriesSlugs : [],
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
        if (force) setStatusText("No active admin session - saved locally only.", 10000, "warn");
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

        // ensure seriesSlugs is always an array after merge
        if (!Array.isArray(a.seriesSlugs)) a.seriesSlugs = [];
        refreshSeriesChips();

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
      if (!token) return setStatusText("Sign in to the admin first.", 10000, "warn");

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

      setMedia("Replacing\u2026");

      try{
        const fd = new FormData();
        fd.append("file", f);

        // call backend
        const updated = await (await fetch(
          `${(await import("../admin.js")).API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/replace-image`,
          {
            method: "POST",
            credentials: "include",
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
      if (!token) return setStatusText("Sign in to the admin first.", 10000, "warn");

      const setMedia = (m, tone="info") => { if (m) showToast(m, { tone, duration: 10000 }); };

      setMedia("Regenerating\u2026");

      try{
        const { API_BASE } = await import("../admin.js");
        const res = await fetch(
          `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/regenerate-variants`,
          {
            method: "POST",
            credentials: "include"
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
      if (!token) return setStatusText("Sign in to the admin first.", 10000, "warn");

      setStatusText("Deleting...", 10000, "warn");

      try{
        const { API_BASE } = await import("../admin.js");
        const res = await fetch(`${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}`, {
          method: "DELETE",
          credentials: "include"
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

    function renderPublishReadiness(){
      const audit = getArtworkPublishReadiness(a);
      if (editReadinessScore) editReadinessScore.textContent = `${audit.completed} / ${audit.total} ready`;
      if (editReadinessSummary) editReadinessSummary.textContent = summarizeReadinessMissing(audit.missing, { completeLabel: "Ready to publish" });
      if (editReadinessHint) editReadinessHint.textContent = audit.isComplete
        ? "All required publish metadata is present."
        : "Complete the missing fields before switching this piece to Published.";
      if (editReadinessList) {
        editReadinessList.innerHTML = "";
        audit.checks.forEach((check) => {
          editReadinessList.appendChild(
            el("div", { class: `edit-publish-readiness__item ${check.complete ? "is-complete" : "is-incomplete"}` },
              el("span", { class: "edit-publish-readiness__icon", "aria-hidden":"true" }, check.complete ? "OK" : "!"),
              el("div", { class: "edit-publish-readiness__body" },
                el("span", { class: "edit-publish-readiness__label" }, check.label),
                el("span", { class: "edit-publish-readiness__detail" }, check.complete ? "Ready for publish" : "Needs completion")
              )
            )
          );
        });
      }
      if (publishStatusButton) {
        const disablePublish = !audit.isComplete && a.status !== "published";
        publishStatusButton.disabled = disablePublish;
        publishStatusButton.setAttribute("aria-disabled", disablePublish ? "true" : "false");
        publishStatusButton.title = disablePublish ? `Complete ${audit.missing.join(", ")} before publishing.` : "Publish artwork";
      }
      return audit;
    }

    function setStatus(next){
      const audit = getArtworkPublishReadiness(a);
      if (next === "published" && a.status !== "published" && !audit.isComplete) {
        setStatusText(`Complete ${audit.missing.join(", ")} before publishing.`, 10000, "warn");
        renderPublishReadiness();
        return;
      }
      a.status = next;
      if (next === "published" && !a.publishedAt) a.publishedAt = new Date().toISOString();
      if (next !== "published") a.publishedAt = a.publishedAt || null;
      localSave(true);
      flushBackendSave(true);
      sub.textContent = `ID: ${a.id} \u2022 Status: ${a.status}`;
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
        .map((p) => String(p || "").replace(/^[-*\u2022\d\.\)\s]+/, "").trim())
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



      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload)
      });

      let json = {};
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



      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload)
      });

      let json = {};
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
      "AI Generate"
    );

    function syncAiGenerateButtons(){
      syncAiButtons({
        storageRef: localStorage,
        descriptionButton: descriptionGenerateBtn,
        tagsButton: tagsGenerateBtn,
        generatingDescription,
        generatingTags
      });
    }

    descriptionGenerateBtn.addEventListener("click", async () => {
      if (!isAiFeaturesEnabled()) {
        setStatusText("AI features are disabled in Other Settings.", 10000, "warn");
        return;
      }
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
      descriptionGenerateBtn.textContent = "AI Generating...";
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
        syncAiGenerateButtons();
        descriptionGenerateBtn.textContent = "AI Generate";
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
      "AI Generate"
    );

    syncAiGenerateButtons();
    window.addEventListener("storage", (e) => {
      if (!e || e.key === AI_FEATURES_ENABLED_KEY) syncAiGenerateButtons();
    });

    tagsGenerateBtn.addEventListener("click", async () => {
      if (!isAiFeaturesEnabled()) {
        setStatusText("AI features are disabled in Other Settings.", 10000, "warn");
        return;
      }
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
      tagsGenerateBtn.textContent = "AI Generating...";
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
        syncAiGenerateButtons();
        tagsGenerateBtn.textContent = "AI Generate";
      }
    });

    const SOCIAL_STATUSES = ["draft", "queued", "posted", "failed", "skipped"];
    const SOCIAL_CHARACTER_LIMITS = Object.freeze({
      bluesky: 300,
      linkedin: 3000
    });
	    const socialState = {
      posts: [],
      platforms: [],
      loading: false,
      saving: new Set(),
      publishing: new Set(),
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
	      if (!token) throw new Error("No active admin session.");

      const res = await fetch(`${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts`, {
        credentials: "include"
      });
      const json = await res.json().catch(() => ({}));
	      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
	      return Array.isArray(json?.posts) ? json.posts : [];
	    }

	    async function fetchSocialPlatforms(){
	      const token = getAdminToken();
	      if (!token) throw new Error("No active admin session.");

	      const res = await fetch(`${API_BASE}/api/admin/social/platforms`, {
	        credentials: "include"
	      });
	      const json = await res.json().catch(() => ([]));
	      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
	      return Array.isArray(json) ? json : [];
	    }

	    function resolveSocialPlatformIconSrc(raw) {
      const text = String(raw || "").trim().replace(/\\/g, "/");
      if (!text) return "";
      if (/^(https?:)?\/\//i.test(text) || text.startsWith("data:")) return text;

      let normalized = text;
      if (normalized.startsWith("/public/")) {
        normalized = normalized.slice("/public".length);
      } else if (!normalized.startsWith("/")) {
        const marker = "/assets/";
        const markerIndex = normalized.toLowerCase().indexOf(marker);
        normalized = markerIndex >= 0 ? normalized.slice(markerIndex) : `/${normalized.replace(/^\/+/, "")}`;
      }

      const pathname = String(window.location.pathname || "");
      const isPublicPreview = pathname === "/public" || pathname.startsWith("/public/");
      if (isPublicPreview && normalized.startsWith("/assets/")) {
        return `/public${normalized}`;
      }

      return normalized;
    }
    function mergeSocialPlatformMeta(posts, platforms) {
	      const byId = new Map(
	        (Array.isArray(platforms) ? platforms : [])
	          .map((platform) => [String(platform?.id || "").trim(), platform])
	          .filter(([id]) => id)
	      );
	      return (Array.isArray(posts) ? posts : []).map((post) => {
	        const platformId = String(post?.platformId || "").trim();
	        const platform = byId.get(platformId);
	        if (!platform) return post;
	        return {
	          ...post,
	          platformName: post?.platformName || platform?.name || platformId,
	          platformCategory: post?.platformCategory || platform?.category || "",
	          platformEnabled: post?.platformEnabled == null ? !!platform?.enabled : post.platformEnabled,
	          platformIconLocation: String(post?.platformIconLocation || platform?.iconLocation || "").trim()
	        };
	      });
	    }

    function getSocialPlatformById(platformId) {
      const key = String(platformId || "").trim();
      if (!key) return null;
      return (socialState.platforms || []).find((platform) => String(platform?.id || "").trim() === key) || null;
    }

    function getSocialCharacterLimit(platformId) {
      return Number(SOCIAL_CHARACTER_LIMITS[String(platformId || "").trim().toLowerCase()] || 0);
    }

    function normalizeHashtag(tag) {
      return String(tag || "")
        .trim()
        .replace(/^#+/, "")
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_]+/gi, "")
        .toLowerCase();
    }

    function getArtworkPublicUrl() {
      return new URL(`../artwork.html?id=${encodeURIComponent(a.id)}`, window.location.href).href;
    }

    function getArtworkImageUrl() {
      const candidate = String(a.image || a.thumb || "").trim();
      if (!candidate) return "";
      try {
        return new URL(candidate, window.location.href).href;
      } catch {
        return candidate;
      }
    }

    async function copyTextToClipboard(text) {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard is not available in this browser.");
      }
      await navigator.clipboard.writeText(String(text || ""));
    }

    function buildComposedSocialCaption(platformId, captionOverride = "") {
      const platform = getSocialPlatformById(platformId);
      const config = platform?.config || {};
      const baseCaption = String(captionOverride || "").trim();
      const suffix = String(config?.defaultCaptionSuffix || "").trim();
      const hashtags = Array.isArray(config?.defaultHashtags)
        ? config.defaultHashtags
        : String(config?.defaultHashtags || "")
            .split(/[,;\n]+/g)
            .map((item) => item.trim());
      const hashtagLine = Array.from(new Set(
        hashtags
          .map(normalizeHashtag)
          .filter(Boolean)
      )).map((tag) => `#${tag}`).join(" ");
      return [baseCaption, suffix, hashtagLine].filter(Boolean).join("\n\n").trim();
    }

    function buildSocialPostPackage(platformId, captionOverride = "", postUrlOverride = "", externalIdOverride = "") {
      const platform = getSocialPlatformById(platformId);
      const config = platform?.config || {};
      const caption = buildComposedSocialCaption(platformId, captionOverride);
      return {
        platformId,
        platformName: platform?.name || platformId,
        postingMode: String(config?.postingMode || "manual").trim() || "manual",
        accountHandle: String(config?.accountHandle || "").trim(),
        profileUrl: String(config?.profileUrl || "").trim(),
        artworkId: a.id,
        artworkTitle: String(a.title || "").trim(),
        artworkUrl: getArtworkPublicUrl(),
        imageUrl: getArtworkImageUrl(),
        altText: String(a.alt || a.title || "").trim(),
        caption,
        postUrl: String(postUrlOverride || "").trim(),
        externalPostId: String(externalIdOverride || "").trim()
      };
    }
    function extractExternalPostId(platformId, postUrl) {
      const platformKey = String(platformId || "").trim().toLowerCase();
      const raw = String(postUrl || "").trim();
      if (!raw) return "";
      try {
        const parsed = new URL(raw, window.location.href);
        if (platformKey === "bluesky") {
          const match = parsed.pathname.match(/\/profile\/([^/]+)\/post\/([^/?#]+)/i);
          if (!match) return "";
          return `profile/${match[1]}/post/${match[2]}`;
        }
        if (platformKey === "linkedin") {
          const urnMatch = decodeURIComponent(parsed.pathname || "").match(/urn:li:[^/?#]+/i);
          if (urnMatch) return urnMatch[0];
          const activityMatch = parsed.pathname.match(/\/posts\/[^/?#]*-(\d+)(?:[-/?#]|$)/i)
            || parsed.pathname.match(/\/feed\/update\/urn:li:[^:]+:(\d+)(?:[/?#]|$)/i);
          if (activityMatch?.[1]) return `activity:${activityMatch[1]}`;
        }
      } catch {
        return "";
      }
      return "";
    }
    async function saveSocialPost(platformId, payload){
      const token = getAdminToken();
      if (!token) throw new Error("No active admin session.");

      const res = await fetch(
        `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts/${encodeURIComponent(platformId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
      return json;
    }

    async function publishSocialPost(platformId){
      const token = getAdminToken();
      if (!token) throw new Error("No active admin session.");

      const res = await fetch(
        `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts/${encodeURIComponent(platformId)}/publish`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
      return json;
    }

    async function deleteSocialPost(platformId){
      const token = getAdminToken();
      if (!token) throw new Error("No active admin session.");

      const res = await fetch(
        `${API_BASE}/api/admin/artworks/${encodeURIComponent(a.id)}/social-posts/${encodeURIComponent(platformId)}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );
      if (res.status === 404) return;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
    }

    function renderSocialEditor(post) {
      const platformId = String(post.platformId || "").trim();
      const platform = getSocialPlatformById(platformId);
      const platformConfig = platform?.config || {};
      const postingMode = String(platformConfig?.postingMode || "manual").trim().toLowerCase() || "manual";
      const isBluesky = platformId === "bluesky";
      const isLinkedIn = platformId === "linkedin";
      const isApiPublishEnabled = (isBluesky || isLinkedIn) && postingMode === "api";
      const platformOpenLabel = isBluesky ? "Open Bluesky" : (isLinkedIn ? "Open LinkedIn" : "");
      const platformPreviewTitle = isBluesky ? "Bluesky preview" : (isLinkedIn ? "LinkedIn preview" : "Post preview");
      const publishLabel = isBluesky ? "Publish to Bluesky" : (isLinkedIn ? "Publish to LinkedIn" : "Publish");
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
      const copyCaptionBtn = el("button", { class:"btn mini", type:"button" }, "Copy caption");
      const copyPackageBtn = el("button", { class:"btn mini", type:"button" }, "Copy post package");
      const openArtworkBtn = el("button", { class:"btn mini", type:"button" }, "Open artwork page");
      const openImageBtn = el("button", { class:"btn mini", type:"button" }, "Open artwork image");
      const openPlatformBtn = (isBluesky || isLinkedIn)
        ? el("button", { class:"btn mini", type:"button" }, platformOpenLabel)
        : null;
      const publishBtn = isApiPublishEnabled
        ? el("button", { class:"btn mini", type:"button" }, publishLabel)
        : null;
      const markPostedBtn = !isApiPublishEnabled
        ? el("button", { class:"btn mini", type:"button" }, "Mark posted")
        : null;
      const extractIdBtn = (isBluesky || isLinkedIn) && !isApiPublishEnabled
        ? el("button", { class:"btn mini", type:"button" }, "Extract ID")
        : null;
      const previewTitle = el("strong", {}, platformPreviewTitle);
      const previewCount = el("span", { class:"pill" }, "0 chars");
      const previewText = el("div", { class:"social-posting-previewtext" }, "");
      const previewMeta = el("div", { class:"social-posting-previewmeta sub" });
      const previewActionNodes = [copyCaptionBtn, copyPackageBtn, openArtworkBtn, openImageBtn];
      if (openPlatformBtn) previewActionNodes.push(openPlatformBtn);
      const previewWrap = el("div", { class:"social-posting-preview" },
        el("div", { class:"social-posting-previewhead" }, previewTitle, previewCount),
        previewText,
        previewMeta,
        el("div", { class:"social-posting-previewactions" }, ...previewActionNodes)
      );

      const buildPayload = () => ({
        status: statusInput.value,
        caption: captionInput.value,
        postUrl: urlInput.value,
        externalPostId: externalIdInput.value,
        errorMessage: errorInput.value
      });

      const syncDerivedExternalId = ({ overwrite = false } = {}) => {
        const derived = extractExternalPostId(platformId, urlInput.value);
        if (!derived) return false;
        if (!overwrite && String(externalIdInput.value || "").trim()) return false;
        externalIdInput.value = derived;
        return true;
      };

      const syncPreview = () => {
        const packageData = buildSocialPostPackage(
          platformId,
          captionInput.value,
          urlInput.value,
          externalIdInput.value
        );
        const finalCaption = packageData.caption;
        const limit = getSocialCharacterLimit(platformId);
        const count = finalCaption.length;
        previewText.textContent = finalCaption || "No caption composed yet.";
        previewMeta.innerHTML = "";
        const metaLines = [];
        metaLines.push(`Posting mode: ${packageData.postingMode}`);
        metaLines.push(`Status: ${statusInput.value}`);
        if (packageData.accountHandle) metaLines.push(`Handle: ${packageData.accountHandle}`);
        if (packageData.artworkUrl) metaLines.push(`Artwork URL: ${packageData.artworkUrl}`);
        if (packageData.imageUrl) metaLines.push(`Image URL: ${packageData.imageUrl}`);
        if (packageData.altText) metaLines.push(`Alt text: ${packageData.altText}`);
        if (packageData.postUrl) metaLines.push(`Live post URL: ${packageData.postUrl}`);
        else if (statusInput.value === "posted") metaLines.push("Live post URL: missing");
        if (packageData.externalPostId) metaLines.push(`External ID: ${packageData.externalPostId}`);
        metaLines.forEach((line) => previewMeta.appendChild(el("div", {}, line)));
        previewCount.textContent = limit ? `${count}/${limit} chars` : `${count} chars`;
        previewWrap.classList.remove("is-warning", "is-error");
        if (limit) {
          if (count > limit) previewWrap.classList.add("is-error");
          else if (count > Math.floor(limit * 0.9)) previewWrap.classList.add("is-warning");
        }
        if (statusInput.value === "posted" && !packageData.postUrl) {
          previewWrap.classList.add("is-warning");
        }
      };

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

      statusInput.addEventListener("change", () => {
        syncPreview();
        queueAutoSave(0);
      });
      captionInput.addEventListener("input", syncPreview);
      captionInput.addEventListener("blur", () => queueAutoSave(0));
      urlInput.addEventListener("input", () => {
        syncDerivedExternalId();
        syncPreview();
      });
      urlInput.addEventListener("blur", () => {
        syncDerivedExternalId();
        syncPreview();
        queueAutoSave(0);
      });
      externalIdInput.addEventListener("input", syncPreview);
      externalIdInput.addEventListener("blur", () => queueAutoSave(0));
      errorInput.addEventListener("blur", () => queueAutoSave(0));

      const savingNow = socialState.saving.has(platformId);
      const publishingNow = socialState.publishing.has(platformId);

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
        syncPreview();
        queueAutoSave(120);
      });

      copyCaptionBtn.addEventListener("click", async () => {
        try {
          await copyTextToClipboard(buildComposedSocialCaption(platformId, captionInput.value));
          setStatusText(`Copied ${post.platformName || platformId} caption.`, 6000, "success");
        } catch (err) {
          setStatusText(`Copy failed: ${err?.message || err}`, 10000, "error");
        }
      });

      copyPackageBtn.addEventListener("click", async () => {
        try {
          const packageData = buildSocialPostPackage(
            platformId,
            captionInput.value,
            urlInput.value,
            externalIdInput.value
          );
          await copyTextToClipboard(JSON.stringify(packageData, null, 2));
          setStatusText(`Copied ${post.platformName || platformId} post package.`, 6000, "success");
        } catch (err) {
          setStatusText(`Copy failed: ${err?.message || err}`, 10000, "error");
        }
      });

      openArtworkBtn.addEventListener("click", () => {
        window.open(getArtworkPublicUrl(), "_blank", "noopener,noreferrer");
      });

      openImageBtn.addEventListener("click", () => {
        const imageUrl = getArtworkImageUrl();
        if (!imageUrl) {
          setStatusText("No artwork image URL is available yet.", 10000, "warn");
          return;
        }
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      });

      openPlatformBtn?.addEventListener("click", () => {
        const fallbackTarget = isLinkedIn ? "https://www.linkedin.com/feed/" : "https://bsky.app";
        const target = String(platformConfig?.profileUrl || "").trim() || fallbackTarget;
        window.open(target, "_blank", "noopener,noreferrer");
      });

      extractIdBtn?.addEventListener("click", () => {
        const applied = syncDerivedExternalId({ overwrite: true });
        syncPreview();
        if (!applied) {
          setStatusText(`Paste a valid ${post.platformName || platformId} post URL first.`, 10000, "warn");
          urlInput.focus();
          return;
        }
        queueAutoSave(0);
        setStatusText(`Extracted ${post.platformName || platformId} post ID from the URL.`, 6000, "success");
      });

      markPostedBtn?.addEventListener("click", () => {
        if (!String(urlInput.value || "").trim()) {
          setStatusText("Paste the live post URL before marking this post as posted.", 10000, "warn");
          urlInput.focus();
          return;
        }
        syncDerivedExternalId();
        statusInput.value = "posted";
        syncPreview();
        queueAutoSave(0);
        setStatusText(`${post.platformName || platformId} marked as posted.`, 6000, "success");
      });

      publishBtn?.addEventListener("click", async () => {
        const ok = await confirmToast(
          `Publish this artwork to ${post.platformName || platformId} now?`,
          { confirmLabel: "Publish", cancelLabel: "Cancel", tone: "warn" }
        );
        if (!ok) return;

        clearSocialAutoSaveTimer(platformId);
        socialState.publishing.add(platformId);
        renderSocialPanel();

        try {
          await saveSocialPost(platformId, buildPayload());
          await publishSocialPost(platformId);
          setStatusText(`Published to ${post.platformName || platformId}.`, 10000, "success");
          await loadSocialPanel(platformId);
        } catch (err) {
          setStatusText(`${post.platformName || platformId} publish failed: ${err?.message || err}`, 10000, "error");
          await loadSocialPanel(platformId);
        } finally {
          socialState.publishing.delete(platformId);
          renderSocialPanel();
        }
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

      syncDerivedExternalId();
      syncPreview();

      return [
        el("div", { class:"social-posting-head" },
          el("strong", {}, post.platformName || platformId),
          el("span", { class:"pill" }, isApiPublishEnabled ? "API mode" : "Manual mode"),
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
        previewWrap,
        el("div", { class:"social-posting-actions" },
          unbindBtn,
          useDescriptionBtn,
          extractIdBtn,
          markPostedBtn,
          publishBtn,
          el("span", { class:"social-posting-muted" }, publishingNow ? "Publishing..." : (savingNow ? "Saving..." : (post.updatedAt ? `Updated ${String(post.updatedAt).slice(0, 19).replace("T", " ")}` : "Not saved yet")))
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
        socialSummary.textContent = `${socialState.posts.length} platforms \u2022 0 bound to this image`;
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
      socialSummary.textContent = `${socialState.posts.length} platforms \u2022 ${bound.length} bound to this image`;

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
          const icon = el("span", { class:"social-site-tabicon", "aria-hidden":"true" });
          const iconSrc = resolveSocialPlatformIconSrc(p.platformIconLocation || "");
          if (iconSrc) {
            icon.appendChild(el("img", { src: iconSrc, alt:"", loading:"lazy" }));
          }
          const label = el("span", {}, p.platformName || pid);
          const btn = el("button", {
            class: active ? "social-site-tabbtn is-active" : "social-site-tabbtn",
            type:"button",
            onclick: () => {
              socialState.selectedBoundPlatformId = pid;
              renderSocialPanel();
            }
          }, icon, label);
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
	        const [posts, platforms] = await Promise.all([
	          fetchSocialPosts(),
	          fetchSocialPlatforms()
	        ]);
	        socialState.platforms = platforms;
	        socialState.posts = mergeSocialPlatformMeta(posts, platforms);
	        if (preferredPlatformId) socialState.selectedBoundPlatformId = String(preferredPlatformId || "");
	      } catch (err) {
	        socialState.posts = [];
	        socialState.platforms = [];
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
    sub.textContent = `ID: ${a.id} \u2022 Status: ${a.status}`;

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
        (() => {
          const statusButtons = [
            { value:"published", label:"Publish" },
            { value:"draft", label:"Draft" },
            { value:"hidden", label:"Hide" }
          ];
          const toggle = el("div", { class:"status-toggle", role:"group", "aria-label":"Artwork status" });
          const syncStatusButtons = () => {
            for (const btn of toggle.querySelectorAll("[data-status-value]")) {
              const active = btn.getAttribute("data-status-value") === String(a.status || "draft");
              btn.classList.toggle("is-active", active);
              btn.setAttribute("aria-pressed", active ? "true" : "false");
            }
          };
          for (const row of statusButtons) {
            const btn = el("button", {
              class:"status-toggle__pill",
              type:"button",
              "data-status-value": row.value,
              "aria-pressed":"false",
              onclick:() => {
                setStatus(row.value);
                syncStatusButtons();
              }
            }, row.label);
            if (row.value === "published") publishStatusButton = btn;
            toggle.appendChild(btn);
          }
          syncStatusButtons();
          return el("div", { class:"pillrow" },
            toggle,
            el("span", { style:"margin-left:auto" }, status)
          );
        })(),


        el("div", { class:"edit-publish-readiness", id:"editPublishReadiness", "aria-live":"polite" },
          el("div", { class:"edit-publish-readiness__head" },
            el("p", { class:"title" }, "Publish readiness"),
            el("span", { class:"edit-publish-readiness__score", id:"editReadinessScore" }, "0 / 5 ready")
          ),
          el("p", { class:"sub", id:"editReadinessSummary" }, "Checking required metadata..."),
          el("div", { class:"edit-publish-readiness__list", id:"editReadinessList" }),
          el("p", { class:"edit-publish-readiness__hint", id:"editReadinessHint" }, "")
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
      seriesMultiField(),
      field("Alt text", "alt", a.alt || "", (v)=>{ a.alt=v; scheduleBackendSave(); updatePreviewAlt(); }),
      textareaField(
        "Description",
        "description",
        a.description || "",
        (v)=>{ a.description=v; scheduleBackendSave(); },
        { labelAction: descriptionGenerateBtn }
      ),
      el("hr", { class:"sep" }),
      (() => {
        const featuredToggle = el(
          "button",
          {
            class:"featured-toggle",
            type:"button",
            "aria-pressed": a.featured ? "true" : "false",
            onclick:() => {
              a.featured = !a.featured;
              featuredToggle.setAttribute("aria-pressed", a.featured ? "true" : "false");
              scheduleBackendSave();
            }
          },
          el("span", { class:"featured-toggle__label" }, "Featured"),
          el("span", { class:"featured-toggle__track", "aria-hidden":"true" },
            el("span", { class:"featured-toggle__dot" })
          )
        );
        return el("div", { class:"pillrow" },
          featuredToggle,
          el("button", {
            class:"btn mini danger",
            type:"button",
            style:"margin-left:auto",
            onclick: deleteArtwork
          }, "Delete"),
          el("a", { class:"btn mini", href:"index.html" }, "Done")
        );
      })()
    );

    const tagsPane = el("div", { class:"edit-tabpane", "data-tab":"tags", hidden:"" },
      el("div", { style:"display:flex; align-items:center; gap:10px;" },
        el("p", { class:"title", style:"margin:0" }, "Tags"),
        tagsGenerateBtn
      ),
      tagsEditor()
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
    const tagsTabBtn = el("button", { class:"edit-tabbtn tab-tags", type:"button" }, "Tags");
    const socialTabBtn = el("button", { class:"edit-tabbtn tab-social", type:"button" }, "Social Media");
    const tabContent = el("div", { class:"edit-tabcontent tab-active-details" },
      detailsPane,
      tagsPane,
      socialPane
    );

    initEditTabController({
      buttons: { details: detailsTabBtn, tags: tagsTabBtn, social: socialTabBtn },
      panes: { details: detailsPane, tags: tagsPane, social: socialPane },
      tabContent,
      initialTab: "details"
    });

    const right = el("div", { class:"card edit-side-card", style:"grid-column: span 5" },
      el("div", { class:"meta" },
        el("div", { class:"edit-tabbar", role:"tablist", "aria-label":"Edit sections" },
          detailsTabBtn,
          tagsTabBtn,
          socialTabBtn
        ),
        tabContent
      )
    );

    root.appendChild(left);
    root.appendChild(right);
    editReadinessScore = document.getElementById("editReadinessScore");
    editReadinessSummary = document.getElementById("editReadinessSummary");
    editReadinessList = document.getElementById("editReadinessList");
    editReadinessHint = document.getElementById("editReadinessHint");
    renderPublishReadiness();
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

    function seriesMultiField() {
      const slugToName = (slug) => {
        const m = state.seriesMeta?.[slug];
        return m?.name || slug;
      };

      const getSortedSeries = () =>
        Object.values(state.seriesMeta || {})
          .filter(row => row && row.name)
          .sort((x, y) => {
            const byOrder = Number(x.sortOrder || 0) - Number(y.sortOrder || 0);
            return byOrder !== 0 ? byOrder : String(x.name).localeCompare(String(y.name));
          });

      const chipsWrap = el("div", { class:"edit-series-chips", style: "display:flex; flex-wrap:wrap; gap:6px; min-height:24px; margin:6px 0 8px" });

      function renderChips() {
        chipsWrap.innerHTML = "";
        const slugs = Array.isArray(a.seriesSlugs) ? a.seriesSlugs : [];
        if (!slugs.length) {
          chipsWrap.appendChild(el("span", { class:"sub", style:"opacity:.5; font-size:12px" }, "No series assigned"));
          return;
        }
        slugs.forEach((slug, idx) => {
          const name = slugToName(slug);
          const chip = el("span", { class:"chip active", style:"display:inline-flex; align-items:center; gap:4px; cursor:default; padding:4px 8px; font-size:12px" },
            ...(idx === 0 ? [el("span", { style:"font-size:10px; opacity:.65; margin-right:2px", title:"Primary series" }, "\u2605")] : []),
            el("span", {}, name),
            el("button", {
              type:"button",
              class:"btn mini",
              style:"padding:0 5px; margin-left:4px; font-size:12px; line-height:1.2; border-radius:99px; min-width:0",
              "aria-label": `Remove ${name}`,
              onclick: () => {
                a.seriesSlugs = (a.seriesSlugs || []).filter(s => s !== slug);
                syncLegacy();
                renderChips();
                renderAddSelect();
                scheduleBackendSave();
              }
            }, "\u00d7")
          );
          chipsWrap.appendChild(chip);
        });
      }

      const addSelect = el("select", { id:"seriesAddSelect", class:"edit-series-select", style:"flex:1; min-width:0" });

      function renderAddSelect() {
        addSelect.innerHTML = "";
        addSelect.appendChild(el("option", { value:"" }, "\u2014 add series \u2014"));
        const assigned = new Set(Array.isArray(a.seriesSlugs) ? a.seriesSlugs : []);
        for (const row of getSortedSeries()) {
          if (!assigned.has(row.slug)) {
            addSelect.appendChild(el("option", { value: row.slug }, row.name));
          }
        }
      }

      function syncLegacy() {
        const slugs = Array.isArray(a.seriesSlugs) ? a.seriesSlugs : [];
        a.series = slugs.length ? slugToName(slugs[0]) : "";
        if (a.series && !state.series.includes(a.series)) state.series.push(a.series);
      }

      const addBtn = el("button", {
        type:"button",
        class:"btn mini",
        onclick: () => {
          const slug = addSelect.value;
          if (!slug) return;
          if (!(a.seriesSlugs || []).includes(slug)) {
            a.seriesSlugs = [...(a.seriesSlugs || []), slug];
            syncLegacy();
            renderChips();
            renderAddSelect();
            addSelect.value = "";
            scheduleBackendSave();
          }
        }
      }, "Add");

      // Expose refresh so flushBackendSave can re-render after backend merge
      refreshSeriesChips = () => { renderChips(); renderAddSelect(); };

      renderChips();
      renderAddSelect();

      return el("div", { class:"field", style:"margin-top:12px" },
        el("div", { class:"sub" }, "Series"),
        chipsWrap,
        el("div", { class:"edit-series-picker", style:"display:flex; gap:6px; align-items:center" }, addSelect, addBtn)
      );
    }

    function selectField(label, id, options, current, onChange){
      // Ensure current exists in options so it shows even if state.series isn't synced yet
      const set = new Set([...(options || []), ...(current ? [current] : [])]);
      const list = Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b));

      const s = el("select", { id },
        el("option", { value:"" }, "\u2014"),
        ...list.map(o => el("option", { value:o, selected: o===current ? "" : null }, o))
      );
      s.addEventListener("change", (e)=> onChange(e.target.value));
      return el("div", { class:"field", style:"margin-top:12px" },
        el("div", { class:"sub" }, label),
        s
      );
    }

    function tagsEditor(){
      const wrap = el("div", { class:"edit-tags-editor", style:"display:grid; gap:12px; margin-top:10px" });
      const filterWrap = el("div", { class:"edit-tags-filter-panel" });
      const filterRow = el("div", { class:"tag-filter-row", role:"group", "aria-label":"Filter available tags" });
      const availableTagsWrap = el("div", { class:"edit-tags-available", style:"display:grid; gap:10px" });
      const availableList = el("div", { class:"pillrow" });
      const list = el("div", { class:"pillrow" });
      const selectedTagFilters = new Set();
      const tagFilterValues = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "0-9"];

      tagFilterValues.forEach((value) => {
        filterRow.appendChild(
          el("button", {
            type:"button",
            class:"btn mini tag-filter-pill",
            "data-tag-filter": value.toLowerCase(),
            "aria-pressed":"false"
          }, value)
        );
      });

      const input = el("input", { placeholder:"type tag + Enter" });

      function getAllTags(){
        const source = Array.isArray(state.artworks) ? state.artworks : [];
        const tags = new Set(normalizeTagList(a.tags || []));
        source.forEach((artwork) => {
          normalizeTagList(artwork?.tags || []).forEach((tag) => tags.add(tag));
        });
        return Array.from(tags).sort((left, right) => left.localeCompare(right));
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

      function renderAvailableTags(){
        availableList.innerHTML = "";

        if (!selectedTagFilters.size) {
          availableList.appendChild(el("span", { class:"sub" }, "Select one or more filters to show matching tags."));
          return;
        }

        const currentTags = new Set(normalizeTagList(a.tags || []));
        const visibleTags = getAllTags().filter((tag) => tagMatchesActiveFilters(tag));
        if (!visibleTags.length) {
          availableList.appendChild(el("span", { class:"sub" }, "No tags match the current filter."));
          return;
        }

        visibleTags.forEach((tag) => {
          const active = currentTags.has(tag);
          const btn = el("button", {
            type:"button",
            class:`btn mini ${active ? "primary" : ""}`,
            style: active ? "" : "opacity:.88"
          }, tag);
          btn.addEventListener("click", () => {
            if (active) removeTag(tag);
            else addTag(tag);
          });
          availableList.appendChild(btn);
        });
      }

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
                  removeTag(t);
                }
              }, "x")
            )
          );
        }
      }

      function renderAll() {
        renderTags();
        renderAvailableTags();
      }

      function addTag(tag) {
        const normalizedTag = String(tag || "").trim().toLowerCase();
        if (!normalizedTag) return false;
        const current = normalizeTagList(a.tags || []);
        const cap = getTagCap();
        if (!current.includes(normalizedTag) && current.length >= cap) {
          setStatusText(`Tag cap reached (${cap}). Remove a tag or raise the cap in Other Settings.`, 10000, "warn");
          return false;
        }
        a.tags = normalizeTagList([...(a.tags||[]), normalizedTag]);
        upsertTag(state, normalizedTag);
        scheduleBackendSave();
        renderAll();
        return true;
      }

      function removeTag(tag) {
        a.tags = (a.tags||[]).filter(x => x !== tag);
        scheduleBackendSave();
        renderAll();
      }

      input.addEventListener("keydown", (e)=>{
        if (e.key !== "Enter") return;
        e.preventDefault();
        const nextTag = input.value.trim().toLowerCase();
        if (!nextTag) return;
        if (addTag(nextTag)) input.value = "";
      });

      filterWrap.appendChild(el("div", { class:"sub" }, "Show tags starting with..."));
      filterWrap.appendChild(filterRow);
      availableTagsWrap.appendChild(el("div", { class:"sub" }, "Available Tags"));
      availableTagsWrap.appendChild(availableList);
      wrap.appendChild(input);
      wrap.appendChild(filterWrap);
      wrap.appendChild(availableTagsWrap);
      wrap.appendChild(list);

      initUploadFilterControllers({
        statusPills: [],
        tagFilterPills: Array.from(filterRow.querySelectorAll("[data-tag-filter]")),
        selectedTagFilters,
        onTagFilterChange() {
          renderAvailableTags();
        }
      });

      refreshTagsEditorView = renderAll;
      renderAll();
      return wrap;
    }

    // No auto-write on load.
    // Saves occur only after explicit user edits/actions.
  

























