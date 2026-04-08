    import {
      loadStateAutoSync, saveState, el, setYearFooter, ensureBaseStyles,
      ensureSeriesMeta,
      showToast,
      confirmToast,
      getAdminToken,
      syncSeriesFromBackend,
      apiUpsertSeries,
      apiDeleteSeries,
      patchArtworkToBackend,
      slugifySeries,
      API_BASE
    } from "../admin.js";
    import { bindFloatingField, syncFloatingFieldState } from "../../assets/js/floating-fields.js";

    ensureBaseStyles();
    setYearFooter();

    function ensureSeriesManagerStyles(){
      if (document.getElementById("series-manager-styles")) return;
      document.body.classList.add("series-manager-page");
      const style = document.createElement("style");
      style.id = "series-manager-styles";
      style.textContent = `
        .series-manager-page .field input,
        .series-manager-page .field textarea,
        .series-manager-page .field select{
          background: color-mix(in srgb, var(--panel) 92%, var(--bg) 8%);
          border-color: color-mix(in srgb, var(--accent) 34%, var(--line));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 8px 18px rgba(0,0,0,.12);
          font-size:var(--floating-control-font-size);
        }
        .series-manager-page .field input:hover,
        .series-manager-page .field textarea:hover,
        .series-manager-page .field select:hover{
          border-color: color-mix(in srgb, var(--accent) 52%, var(--line));
          background: color-mix(in srgb, var(--panel) 88%, var(--bg) 12%);
        }
        .series-manager-page .field:hover:has(select)::before,
        .series-manager-page .field:hover:has(select)::after,
        .series-manager-page .field:focus-within:has(select)::before,
        .series-manager-page .field:focus-within:has(select)::after{
          background:color-mix(in srgb, var(--accent) 72%, white);
        }
        .series-manager-page .field input:focus,
        .series-manager-page .field textarea:focus,
        .series-manager-page .field select:focus{
          outline:none;
          border-color: color-mix(in srgb, var(--accent) 72%, white);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent), 0 10px 22px rgba(0,0,0,.18);
          background: color-mix(in srgb, var(--panel) 84%, var(--bg) 16%);
        }
        .series-manager-page .series-floating-field textarea{
          padding-top:calc(var(--floating-control-padding-top) + 10px);
        }
        .series-manager-page .series-cover-picker{
          display:grid;
          gap:10px;
          grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));
          margin-top:10px;
        }
        .series-manager-page .series-cover-option{
          appearance:none;
          border:1px solid color-mix(in srgb, var(--accent) 30%, var(--line));
          border-radius:14px;
          background:color-mix(in srgb, var(--panel) 92%, var(--bg) 8%);
          color:var(--text);
          padding:8px;
          display:grid;
          gap:8px;
          text-align:left;
          cursor:pointer;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 8px 18px rgba(0,0,0,.12);
          transition:border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .series-manager-page .series-cover-option:hover,
        .series-manager-page .series-cover-option:focus-visible{
          outline:none;
          border-color: color-mix(in srgb, var(--accent) 72%, white);
          background: color-mix(in srgb, var(--panel) 86%, var(--bg) 14%);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent), 0 10px 22px rgba(0,0,0,.18);
          transform: translateY(-1px);
        }
        .series-manager-page .series-cover-option.is-selected{
          border-color: color-mix(in srgb, var(--accent) 82%, white);
          background: color-mix(in srgb, var(--accent) 20%, var(--panel));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent), 0 10px 22px rgba(0,0,0,.2);
        }
        .series-manager-page .series-cover-thumb{
          width:100%;
          aspect-ratio:1;
          border-radius:10px;
          border:1px solid var(--line);
          background:color-mix(in srgb, var(--bg) 84%, var(--panel));
          overflow:hidden;
          display:grid;
          place-items:center;
        }
        .series-manager-page .series-cover-thumb img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .series-manager-page .series-cover-label{
          font-size:13px;
          line-height:1.2;
          color:var(--text);
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .series-manager-page .series-cover-empty{
          min-height:96px;
          border:1px dashed var(--line);
          border-radius:10px;
          display:grid;
          place-items:center;
          color:var(--muted);
          font-size:13px;
          background:color-mix(in srgb, var(--bg) 82%, transparent);
        }
        .series-manager-page .series-cover-trigger{
          width:132px;
          margin-top:10px;
          padding:8px;
          border-radius:14px;
          display:grid;
          place-items:center;
        }
        .series-manager-page .series-cover-trigger:hover,
        .series-manager-page .series-cover-trigger:focus-visible{
          transform:translateY(-1px);
        }
        .series-manager-page .series-cover-trigger .series-cover-thumb,
        .series-manager-page .series-cover-trigger .series-cover-empty{
          width:100%;
          min-height:auto;
          aspect-ratio:1;
        }
        .series-manager-page .series-cover-modal{
          position:fixed;
          inset:0;
          z-index:1200;
          display:none;
          align-items:center;
          justify-content:center;
          padding:18px;
          background:rgba(0,0,0,.66);
        }
        .series-manager-page .series-cover-modal.is-open{
          display:flex;
        }
        .series-manager-page .series-cover-modal-panel{
          position:relative;
          width:min(980px, calc(100vw - 36px));
          max-height:min(88vh, 820px);
          overflow:hidden;
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel);
          box-shadow:var(--shadow);
          padding:14px;
          display:grid;
          gap:12px;
          grid-template-rows:auto auto minmax(0, 1fr);
        }
        .series-manager-page .series-cover-modal-body{
          min-height:0;
          overflow:auto;
          padding-right:4px;
        }
        .series-manager-page .series-cover-modal-body::-webkit-scrollbar{
          width:12px;
          height:12px;
        }
        .series-manager-page .series-cover-modal-body::-webkit-scrollbar-track{
          background:color-mix(in srgb, var(--bg) 54%, #05070d 46%);
          border-radius:999px;
          border:2px solid transparent;
          background-clip:padding-box;
        }
        .series-manager-page .series-cover-modal-body::-webkit-scrollbar-thumb{
          background:linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent) 32%, #a991ff 68%),
            color-mix(in srgb, var(--accent) 18%, #6d617f 82%)
          );
          border-radius:999px;
          border:2px solid color-mix(in srgb, var(--panel) 88%, transparent);
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, #cbbdff 20%, transparent),
            0 0 10px color-mix(in srgb, #9d8bff 18%, transparent);
        }
        .series-manager-page .series-cover-modal-body::-webkit-scrollbar-thumb:hover{
          background:linear-gradient(
            180deg,
            color-mix(in srgb, #cdbdff 46%, var(--accent)),
            color-mix(in srgb, #8776c7 34%, var(--accent))
          );
        }
        .series-manager-page .series-cover-modal-body::-webkit-scrollbar-corner{
          background:transparent;
        }
        .series-manager-page .series-cover-modal-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }
        .series-manager-page .series-cover-modal-copy{
          display:grid;
          gap:4px;
          padding-right:46px;
        }
        .series-manager-page .series-cover-modal-close{
          position:absolute;
          top:12px;
          right:12px;
          width:34px;
          height:34px;
          padding:0;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          font-size:20px;
          line-height:1;
          font-weight:700;
          z-index:1;
        }
        .series-manager-page .series-editor-tabs{
          display:flex;
          gap:6px;
          flex-wrap:wrap;
          margin-top:12px;
          margin-bottom:0;
          border-bottom:1px solid var(--line);
        }
        .series-manager-page .series-editor-tab{
          appearance:none;
          min-width:120px;
          justify-content:center;
          border:1px solid transparent;
          border-bottom:1px solid color-mix(in srgb, var(--accent) 80%, var(--line));
          background:transparent;
          color:var(--muted);
          border-top-left-radius:10px;
          border-top-right-radius:10px;
          border-bottom-left-radius:0px;
          border-bottom-right-radius:0px;
          padding:8px 12px;
          font:inherit;
          font-size:16px;
          cursor:pointer;
          margin-bottom:-1px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          transition:border-color .18s ease, background .18s ease, color .18s ease;
        }
        .series-manager-page .series-editor-tab:hover{
          color:var(--text);
          transform:none;
        }
        .series-manager-page .series-editor-tab[data-series-tab="details"],
        .series-manager-page .series-editor-tab[data-series-tab="images"]{
          --series-tab-color:var(--accent);
        }
        .series-manager-page .series-editor-tab.is-active{
          color:var(--text);
          border-color:color-mix(in srgb, var(--accent) 80%, var(--line));
          border-bottom-color:transparent;
          background:color-mix(in srgb, var(--accent) 16%, var(--panel));
          box-shadow:none;
        }
        .series-manager-page .btn{
          border-radius:10px;
        }
        .series-manager-page .series-tab-content{
          display:grid;
          gap:0;
          margin-top:0;
          border:1px solid color-mix(in srgb, var(--accent) 80%, var(--line));
          border-top-color:color-mix(in srgb, var(--accent) 80%, var(--line));
          border-radius:0 0 10px 10px;
          background:color-mix(in srgb, var(--accent) 8%, var(--panel));
          padding:16px;
          transition:border-color .18s ease, background .18s ease;
        }
        .series-manager-page .series-tab-panel{
          display:none;
        }
        .series-manager-page .series-tab-panel.is-active{
          display:block;
        }
        .series-manager-page .series-images-toolbar{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
          margin-top:12px;
        }
        .series-manager-page .series-image-strip{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-top:14px;
        }
        .series-manager-page .series-image-strip.is-dragging .series-image-chip{
          opacity:.92;
        }
        .series-manager-page .series-image-chip{
          cursor:grab;
        }
        .series-manager-page .series-image-chip:active{
          cursor:grabbing;
        }
        .series-manager-page .series-image-chip.is-dragging{
          opacity:.42;
          transform:scale(.96);
        }
        .series-manager-page .series-image-chip.is-drop-target .series-cover-thumb,
        .series-manager-page .series-image-chip.is-drop-target .series-cover-empty{
          border-color:color-mix(in srgb, #ff8a1f 86%, white);
          box-shadow:0 0 0 3px color-mix(in srgb, #ff8a1f 30%, transparent);
        }
        .series-manager-page .series-image-chip{
          width:68px;
          display:grid;
          gap:6px;
        }
        .series-manager-page .series-image-chip .series-cover-thumb,
        .series-manager-page .series-image-chip .series-cover-empty{
          width:68px;
          aspect-ratio:1;
          min-height:auto;
        }
        .series-manager-page .series-image-chip .series-cover-label{
          font-size:12px;
        }
        .series-manager-page .series-images-empty{
          margin-top:14px;
        }
        .series-manager-page .series-cover-option.is-picked{
          position:relative;
          border-color: color-mix(in srgb, #ff8a1f 68%, var(--line));
          background: linear-gradient(
            180deg,
            color-mix(in srgb, #ff8a1f 16%, var(--panel)),
            color-mix(in srgb, #ff8a1f 10%, var(--panel))
          );
          box-shadow:
            0 0 0 2px color-mix(in srgb, #ff8a1f 28%, transparent),
            0 10px 20px rgba(0,0,0,.14),
            inset 0 0 0 1px color-mix(in srgb, white 8%, #ff8a1f);
          transform: translateY(-2px) scale(1.01);
        }
        .series-manager-page .series-cover-option.is-picked .series-cover-thumb{
          border-color: color-mix(in srgb, #ff8a1f 64%, var(--line));
          box-shadow:
            0 0 0 2px color-mix(in srgb, #ff8a1f 18%, transparent),
            0 6px 12px rgba(0,0,0,.12);
        }
        .series-manager-page .series-cover-option.is-picked .series-cover-label{
          color: color-mix(in srgb, white 22%, var(--text));
          font-weight: 800;
        }
        .series-manager-page .series-cover-option.is-included{
          background: color-mix(in srgb, var(--accent) 10%, var(--panel));
          opacity:.7;
          filter:saturate(.72) brightness(.86);
        }
        .series-manager-page .series-cover-option.is-included .series-cover-thumb{
          opacity:.8;
        }
        .series-manager-page .series-cover-option.is-included .series-cover-label{
          color:color-mix(in srgb, var(--muted) 82%, var(--text) 18%);
        }
        .series-manager-page .series-cover-option.is-included.is-picked{
          opacity:1;
          filter:none;
        }
        .series-manager-page .series-cover-option.is-included.is-picked .series-cover-thumb{
          opacity:1;
        }
        .series-manager-page .series-cover-option.is-included.is-picked .series-cover-label{
          color: color-mix(in srgb, white 22%, var(--text));
        }
        .series-manager-page .series-cover-option-meta{
          display:grid;
          gap:8px;
        }
        .series-manager-page .series-cover-pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:3px 8px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--accent) 32%, var(--line));
          background:color-mix(in srgb, var(--accent) 12%, var(--panel));
          color:var(--accent);
          font-size:11px;
          font-weight:700;
          letter-spacing:.01em;
          white-space:nowrap;
        }
        .series-manager-page .series-cover-modal-toolbar{
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          align-items:center;
        }
        .series-manager-page .series-cover-modal-toolbar-group{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
        }
        .series-manager-page .series-cover-modal-toolbar-group--right{
          margin-left:auto;
          justify-content:flex-end;
        }
        .series-manager-page .series-cover-modal-toolbar-group .btn:disabled{
          opacity:.42;
          color:color-mix(in srgb, var(--muted) 86%, transparent);
          border-color:color-mix(in srgb, var(--line) 78%, transparent);
          background:color-mix(in srgb, var(--panel) 88%, transparent);
          box-shadow:none;
          cursor:not-allowed;
          filter:saturate(.55) brightness(.88);
        }
        @media (max-width: 760px){
          .series-manager-page .series-cover-modal-toolbar{
            align-items:stretch;
          }
          .series-manager-page .series-cover-modal-toolbar-group{
            width:100%;
          }
        }
        .series-manager-page .series-row{
          justify-content:flex-start;
          text-align:left;
          padding:12px;
          border-radius:14px;
          width:100%;
          min-width:0;
        }
        .series-manager-page .series-row__main{
          display:flex;
          gap:12px;
          align-items:center;
          width:100%;
        }
        .series-manager-page .series-row-select{
          display:grid;
          place-items:center;
          width:28px;
          height:28px;
          border-radius:8px;
          border:1.5px solid color-mix(in srgb, var(--line) 88%, transparent);
          background:color-mix(in srgb, var(--panel) 92%, transparent);
          cursor:pointer;
          transition:background .16s ease, border-color .16s ease, box-shadow .16s ease;
          box-shadow:0 2px 6px rgba(0,0,0,.12);
          flex:0 0 auto;
        }
        .series-manager-page .series-row-select:hover{
          background:color-mix(in srgb, var(--panel) 96%, var(--accent) 8%);
          border-color:color-mix(in srgb, var(--accent) 32%, var(--line));
          box-shadow:0 2px 8px rgba(0,0,0,.16);
        }
        .series-manager-page .series-row-select.is-selected{
          border-color:color-mix(in srgb, var(--accent) 48%, var(--line));
          background:color-mix(in srgb, var(--accent) 12%, var(--panel));
        }
        .series-manager-page .series-row-select input{
          width:14px;
          height:14px;
          margin:0;
          appearance:none;
          -webkit-appearance:none;
          -moz-appearance:none;
          cursor:pointer;
          border:2px solid color-mix(in srgb, var(--line) 88%, white 12%);
          border-radius:999px;
          background:transparent;
          transition:background .16s ease, border-color .16s ease;
        }
        .series-manager-page .series-row-select input:checked{
          background:#ff8a1f;
          border-color:#ff8a1f;
        }
        .series-manager-page .series-row-select input:hover{
          filter:brightness(1.1);
        }
        .series-manager-page .series-row__cover{
          width:48px;
          height:48px;
          border-radius:10px;
          border:1px solid var(--line);
          object-fit:cover;
          flex:0 0 auto;
        }
        .series-manager-page .series-row__body{
          display:grid;
          gap:6px;
          min-width:0;
          flex:1 1 auto;
        }
        .series-manager-page .series-row__title{
          font-weight:650;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .series-manager-page .series-row__meta{
          display:flex;
          flex-wrap:wrap;
          gap:6px;
        }
        .series-manager-page .series-row__actions{
          display:flex;
          gap:8px;
          align-items:center;
          margin-left:auto;
          flex:0 0 auto;
        }
        .series-manager-page .series-signal{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          min-height:26px;
          padding:5px 9px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--line) 84%, transparent);
          background:color-mix(in srgb, var(--surface) 86%, transparent);
          color:var(--muted);
          font-size:12px;
          font-weight:650;
          line-height:1;
          letter-spacing:.01em;
        }
        .series-manager-page .series-signal--ok{
          border-color:color-mix(in srgb, #4db6ac 58%, var(--line));
          background:color-mix(in srgb, #4db6ac 12%, var(--panel));
          color:color-mix(in srgb, #9ce7dc 34%, var(--text));
        }
        .series-manager-page .series-signal--warn{
          border-color:color-mix(in srgb, #e0aa3c 62%, var(--line));
          background:color-mix(in srgb, #e0aa3c 15%, var(--panel));
          color:color-mix(in srgb, #ffd891 45%, var(--text));
        }
        .series-manager-page .series-signal--danger{
          border-color:color-mix(in srgb, #d15353 62%, var(--line));
          background:color-mix(in srgb, #d15353 14%, var(--panel));
          color:color-mix(in srgb, #ffc4c4 40%, var(--text));
        }
        .series-manager-page .series-signal--accent{
          border-color:color-mix(in srgb, var(--accent) 60%, var(--line));
          background:color-mix(in srgb, var(--accent) 14%, var(--panel));
          color:color-mix(in srgb, white 24%, var(--text));
        }
        .series-manager-page .series-preview-card{
          display:grid;
          grid-template-columns:minmax(160px, 220px) minmax(0, 1fr);
          gap:16px;
          padding:14px;
          border:1px solid color-mix(in srgb, var(--accent) 38%, var(--line));
          border-radius:18px;
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--panel)), color-mix(in srgb, var(--panel) 94%, var(--bg)));
          margin-top:12px;
        }
        .series-manager-page .series-preview-card__media{
          aspect-ratio:1 / 1;
          border-radius:14px;
          overflow:hidden;
          border:1px solid color-mix(in srgb, var(--accent) 30%, var(--line));
          background:color-mix(in srgb, var(--bg) 78%, var(--panel));
        }
        .series-manager-page .series-preview-card__media img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .series-manager-page .series-preview-card__empty{
          width:100%;
          height:100%;
          display:grid;
          place-items:center;
          text-align:center;
          padding:18px;
          color:var(--muted);
          font-size:13px;
          line-height:1.45;
        }
        .series-manager-page .series-preview-card__body{
          display:grid;
          gap:10px;
          align-content:start;
          min-width:0;
        }
        .series-manager-page .series-preview-card__top{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
          flex-wrap:wrap;
        }
        .series-manager-page .series-preview-card__title{
          margin:0;
          font-size:24px;
          line-height:1.05;
        }
        .series-manager-page .series-preview-card__summary{
          margin:0;
          color:var(--text);
          line-height:1.6;
        }
        .series-manager-page .series-preview-card__signals{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }
        .series-manager-page .series-preview-card__actions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
        }
        .series-manager-page .series-preview-note{
          margin:0;
        }
        @media (max-width: 900px){
          .series-manager-page .series-preview-card{
            grid-template-columns:minmax(0, 1fr);
          }
        }
      `;
      document.head.appendChild(style);
    }

    ensureSeriesManagerStyles();

    const state = await loadStateAutoSync();
    ensureSeriesMeta(state, { includeDerived: !getAdminToken() });
    saveState(state);

    const listEl = document.getElementById("list");
    const editor = document.getElementById("editor");
    const count = document.getElementById("count");
    const newNameField = document.getElementById("newNameField");
    const newName = document.getElementById("newName");
    const showHiddenToggle = document.getElementById("showHidden");
    const showHiddenTrack = document.querySelector("[data-show-hidden-track]");
    const showHiddenKnob = document.querySelector("[data-show-hidden-knob]");
    const selectAllBtn = document.getElementById("selectAllBtn");
    const selectVisibleBtn = document.getElementById("selectVisibleBtn");
    const clearSelectionBtn = document.getElementById("clearSelectionBtn");
    const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
    const selectionCount = document.getElementById("selectionCount");
    const SHOW_HIDDEN_KEY = "toji_admin_series_show_hidden_v1";

    let activeSlug = null;
    let showHidden = localStorage.getItem(SHOW_HIDDEN_KEY) === "1";
    const selectedSlugs = new Set();
    let draggedSlug = null;
    let orderSyncTimer = null;
    if (showHiddenToggle) showHiddenToggle.checked = showHidden;
        syncShowHiddenToggleVisual();
        syncFloatingFieldState(newNameField, newName);
        newName?.addEventListener("input", () => syncFloatingFieldState(newNameField, newName));
        newName?.addEventListener("change", () => syncFloatingFieldState(newNameField, newName));
        newName?.addEventListener("blur", () => syncFloatingFieldState(newNameField, newName));

    function syncShowHiddenToggleVisual(){
      const on = !!showHiddenToggle?.checked;
      if (showHiddenTrack) {
        showHiddenTrack.style.background = on ? "var(--accent-soft)" : "color-mix(in srgb, var(--panel) 84%, transparent)";
        showHiddenTrack.style.borderColor = on ? "var(--accent-border)" : "var(--line)";
      }
      if (showHiddenKnob) showHiddenKnob.style.transform = on ? "translateX(20px)" : "translateX(0)";
    }
    function normalizeCoverThumbPath(p){
      if (!p) return "";
      const v = String(p);
      if (v.startsWith("http")) return v;
      if (v.startsWith("/")) return `${API_BASE}${v}`;
      return v;
    }
    const setStatus = (m, ms=10000, tone="info") => {
      if (!m) return;
      showToast(m, { tone, duration: Math.max(10000, Number(ms) || 0) });
    };
    const flashInputAttention = (inputEl) => {
      if (!inputEl) return;
      inputEl.focus();
      inputEl.animate([
        {
          boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)",
          borderColor: "var(--line)",
          backgroundColor: "transparent"
        },
        {
          boxShadow: "0 0 0 4px color-mix(in srgb, #d15353 45%, transparent)",
          borderColor: "#d15353",
          backgroundColor: "color-mix(in srgb, #d15353 14%, var(--panel))"
        },
        {
          boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)",
          borderColor: "var(--line)",
          backgroundColor: "transparent"
        },
        {
          boxShadow: "0 0 0 4px color-mix(in srgb, #d15353 45%, transparent)",
          borderColor: "#d15353",
          backgroundColor: "color-mix(in srgb, #d15353 14%, var(--panel))"
        },
        {
          boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)",
          borderColor: "var(--line)",
          backgroundColor: "transparent"
        }
      ], {
        duration: 700,
        iterations: 1,
        easing: "ease-in-out"
      });
    };

    function seriesArray(){
      return Object.values(state.seriesMeta || {})
        .sort((a,b) => (Number(a.sortOrder||0) - Number(b.sortOrder||0)) || String(a.name||"").localeCompare(String(b.name||"")));
    }

    function getSeriesPublicHref(slug){
      return `../series.html?s=${encodeURIComponent(slug || "")}`;
    }

    function getSeriesVisibilityLabel(seriesRow){
      if (!seriesRow?.isPublic) return "Hidden from public series";
      const publicRows = seriesArray().filter((row) => !!row.isPublic);
      const index = publicRows.findIndex((row) => row.slug === seriesRow.slug);
      return index >= 0 ? `Public order #${index + 1}` : "Public series";
    }

    function getSeriesArtworkStats(seriesRow){
      const items = (state.artworks || []).filter((artwork) => artworkBelongsToSeries(artwork, seriesRow));
      const published = items.filter((artwork) => String(artwork?.status || "").toLowerCase() === "published");
      return {
        total: items.length,
        published: published.length,
        draft: Math.max(0, items.length - published.length)
      };
    }

    function resolveSeriesCover(seriesRow){
      const selectedId = String(seriesRow?.coverArtworkId || "").trim();
      const included = orderedSeriesArtworkItems(seriesRow);
      const all = seriesArtworkItems(seriesRow);
      const findArtwork = (id) => (state.artworks || []).find((artwork) => String(artwork?.id || "") === String(id || ""));
      const normalizeCover = (artwork) => {
        if (!artwork) return null;
        return {
          src: artwork.thumb || artwork.image || normalizeCoverThumbPath(seriesRow?.coverThumb),
          label: artwork.title || artwork.label || "Untitled",
          id: String(artwork.id || ""),
          status: String(artwork.status || "").toLowerCase()
        };
      };

      if (selectedId) {
        const selectedArtwork = normalizeCover(findArtwork(selectedId) || included.find((item) => String(item.id) === selectedId) || all.find((item) => String(item.id) === selectedId));
        if (selectedArtwork?.src) {
          return {
            mode: "selected",
            src: selectedArtwork.src,
            label: selectedArtwork.label,
            note: selectedArtwork.status === "published"
              ? "Public cover uses the selected artwork."
              : "Selected cover is not published yet."
          };
        }
      }

      const fallbackArtwork = normalizeCover(
        (state.artworks || []).find((artwork) => artworkBelongsToSeries(artwork, seriesRow) && String(artwork?.status || "").toLowerCase() === "published") ||
        (state.artworks || []).find((artwork) => artworkBelongsToSeries(artwork, seriesRow)) ||
        included[0] ||
        all[0]
      );

      if (fallbackArtwork?.src) {
        return {
          mode: "fallback",
          src: fallbackArtwork.src,
          label: fallbackArtwork.label,
          note: "Public cover falls back to the first available series artwork."
        };
      }

      return {
        mode: "empty",
        src: "",
        label: "",
        note: "No cover preview yet. Add artwork to this series or pick a cover manually."
      };
    }

    function getSeriesEditorialSignals(seriesRow){
      const stats = getSeriesArtworkStats(seriesRow);
      const hasDescription = !!String(seriesRow?.description || "").trim();
      const cover = resolveSeriesCover(seriesRow);
      const visibilityTone = seriesRow?.isPublic ? "ok" : "warn";
      return {
        stats,
        cover,
        hasDescription,
        descriptionSignal: hasDescription
          ? { label: "Description ready", tone: "ok" }
          : { label: "Missing description", tone: "danger" },
        coverSignal: cover.mode === "selected"
          ? { label: "Manual cover", tone: "ok" }
          : cover.mode === "fallback"
            ? { label: "Auto cover preview", tone: "warn" }
            : { label: "No cover preview", tone: "danger" },
        visibilitySignal: {
          label: getSeriesVisibilityLabel(seriesRow),
          tone: visibilityTone
        },
        artworkSignal: {
          label: stats.published > 0
            ? `${stats.published} public piece${stats.published === 1 ? "" : "s"}`
            : (stats.total > 0 ? `${stats.total} assigned, none public` : "No artwork assigned"),
          tone: stats.published > 0 ? "accent" : (stats.total > 0 ? "warn" : "danger")
        }
      };
    }

    function buildSeriesSignal(signal){
      return el("span", { class:`series-signal series-signal--${signal?.tone || "accent"}` }, signal?.label || "");
    }
    function queueSeriesOrderSync(){
      clearTimeout(orderSyncTimer);
      orderSyncTimer = setTimeout(() => syncSeriesOrderBackend(), 400);
    }

    async function syncSeriesOrderBackend(){
      if (!getAdminToken()) {
        setStatus("Series order saved locally (no token).", 10000, "warn");
        return;
      }
      const rows = seriesArray();
      const jobs = rows.map((s) => apiUpsertSeries(s.slug, {
        name: s.name,
        description: s.description,
        sortOrder: Number(s.sortOrder || 0),
        isPublic: !!s.isPublic,
        coverArtworkId: s.coverArtworkId || "",
        imageOrder: Array.isArray(s.imageOrder) ? s.imageOrder : []
      }));
      const settled = await Promise.allSettled(jobs);
      const failed = settled.filter(r => r.status === "rejected").length;
      if (!failed) setStatus("Series order saved.", 10000, "success");
      else setStatus(`Series order saved locally. Backend failed for ${failed}/${rows.length}.`, 10000, "error");
    }

    function reorderSeriesBySlug(sourceSlug, targetSlug){
      if (!sourceSlug || !targetSlug || sourceSlug === targetSlug) return;
      const allRows = seriesArray();
      const from = allRows.findIndex(s => s.slug === sourceSlug);
      const to = allRows.findIndex(s => s.slug === targetSlug);
      if (from < 0 || to < 0) return;
      const [moved] = allRows.splice(from, 1);
      allRows.splice(to, 0, moved);
      allRows.forEach((s, idx) => { s.sortOrder = idx * 10; });
      for (const s of allRows) state.seriesMeta[s.slug] = { ...state.seriesMeta[s.slug], sortOrder: s.sortOrder };
      saveState(state);
      renderList();
      if (activeSlug) renderEditor(activeSlug);
      queueSeriesOrderSync();
    }

    async function deleteSeriesOnBackend(slug){
      const candidates = [];
      const aliases = new Set();
      const pushCandidate = (v) => {
        const s = String(v || "").trim();
        if (!s) return;
        if (!candidates.includes(s)) candidates.push(s);
        aliases.add(s.toLowerCase());
        const norm = slugifySeries(s);
        if (norm) aliases.add(norm.toLowerCase());
      };

      // Try exact/raw values first to support legacy slugs that are not normalized.
      pushCandidate(slug);
      const row = state.seriesMeta?.[slug];
      pushCandidate(row?.backendSlug);
      pushCandidate(row?.rawSlug);
      pushCandidate(row?.slug);
      pushCandidate(row?.name);

      // Then try normalized variants.
      pushCandidate(slugifySeries(slug || ""));
      pushCandidate(slugifySeries(row?.backendSlug || ""));
      pushCandidate(slugifySeries(row?.rawSlug || ""));
      pushCandidate(slugifySeries(row?.slug || ""));
      pushCandidate(slugifySeries(row?.name || ""));

      for (const [key, value] of Object.entries(state.seriesMeta || {})) {
        if ((value?.slug || "") !== slug) continue;
        pushCandidate(key);
        pushCandidate(slugifySeries(key));
      }

      let lastError = null;
      let sawNotFound = false;
      let deletedAny = false;
      for (const candidate of candidates) {
        try {
          await apiDeleteSeries(candidate);
          deletedAny = true;
          break;
        } catch (e) {
          lastError = e;
          const msg = String(e?.message || e || "").toLowerCase();
          if (msg.includes("not found")) {
            sawNotFound = true;
            continue;
          }
          break;
        }
      }

      // Always verify against backend before claiming success.
      try {
        await syncSeriesFromBackend(state);
      } catch {}

      const current = Object.values(state.seriesMeta || {});
      const still = current.find((s) => {
        const name = String(s?.name || "").trim();
        const slugVal = String(s?.slug || "").trim();
        if (!name && !slugVal) return false;
        const nameNorm = slugifySeries(name).toLowerCase();
        const slugNorm = slugifySeries(slugVal).toLowerCase();
        return aliases.has(name.toLowerCase()) || aliases.has(slugVal.toLowerCase()) || aliases.has(nameNorm) || aliases.has(slugNorm);
      });

      if (still) {
        console.error("[Series Delete] Backend verification failed: series still exists.", {
          requestedSlug: slug,
          candidatesTried: candidates,
          still
        });
        return { ok: false, error: new Error(`Series still exists in backend (slug: ${still.slug})`) };
      }
      if (deletedAny || sawNotFound) {
        return { ok: true, slug: slug, notFound: sawNotFound && !deletedAny };
      }
      console.error("[Series Delete] Backend delete failed.", {
        requestedSlug: slug,
        candidatesTried: candidates,
        lastError
      });
      return { ok: false, error: lastError || new Error("Delete failed") };
    }
    async function clearSeriesFromArtworks(slug){
      const row = state.seriesMeta?.[slug];
      const aliases = new Set();
      const pushAlias = (v) => {
        const s = String(v || "").trim();
        if (!s) return;
        aliases.add(s.toLowerCase());
        const norm = slugifySeries(s);
        if (norm) aliases.add(norm.toLowerCase());
      };
      pushAlias(slug);
      pushAlias(row?.slug);
      pushAlias(row?.name);

      const touched = [];
      for (const a of (state.artworks || [])) {
        const value = String(a?.series || "").trim();
        if (!value) continue;
        const valueNorm = slugifySeries(value).toLowerCase();
        const valueLower = value.toLowerCase();
        if (!aliases.has(valueLower) && !aliases.has(valueNorm)) continue;
        a.series = "";
        touched.push(a);
      }

      if (!touched.length) return { count: 0, failed: 0 };

      if (!getAdminToken()) {
        saveState(state);
        return { count: touched.length, failed: 0 };
      }

      const results = await Promise.allSettled(touched.map((a) =>
        patchArtworkToBackend(a.id, { series: "" })
      ));
      const failed = results.filter(r => r.status === "rejected").length;
      saveState(state);
      return { count: touched.length, failed };
    }
    function renderList(){
      const allRows = seriesArray();
      const rows = showHidden ? allRows : allRows.filter(s => !!s.isPublic);
      const existingSlugs = new Set(allRows.map(s => s.slug));
      for (const slug of Array.from(selectedSlugs)) {
        if (!existingSlugs.has(slug)) selectedSlugs.delete(slug);
      }
      count.textContent = showHidden
        ? `${rows.length} series`
        : `${rows.length} visible (${allRows.length} total)`;
      if (selectionCount) selectionCount.textContent = `${selectedSlugs.size} selected`;
      if (deleteSelectedBtn) deleteSelectedBtn.style.display = selectedSlugs.size === 0 ? "none" : "";
      if (clearSelectionBtn) clearSelectionBtn.style.display = selectedSlugs.size === 0 ? "none" : "";
      listEl.innerHTML = "";

      if (!rows.length){
        listEl.appendChild(el("div", { class:"sub" }, showHidden
          ? "No series yet. Create one above."
          : "No public series yet. Enable \"Show hidden series\" to manage hidden ones."));
        return;
      }

      for (const s of rows){
        const isActive = s.slug === activeSlug;
        const isSelected = selectedSlugs.has(s.slug);
        const editorial = getSeriesEditorialSignals(s);
        const selectPill = el("label", {
          class: `series-row-select${isSelected ? " is-selected" : ""}`,
          title: `${isSelected ? "Deselect" : "Select"} series ${s.name || s.slug}`,
          "aria-label": `${isSelected ? "Deselect" : "Select"} series ${s.name || s.slug}`
        },
          el("input", {
            type: "checkbox",
            checked: isSelected ? "" : null,
            "aria-label": `${isSelected ? "Deselect" : "Select"} series ${s.name || s.slug}`,
            onchange: (e) => {
              e.stopPropagation();
              if (e.target.checked) selectedSlugs.add(s.slug);
              else selectedSlugs.delete(s.slug);
              renderList();
            }
          })
        );
        selectPill.addEventListener("click", (e) => e.stopPropagation());

        const reorderPill = el("button", {
          type: "button",
          draggable: "true",
          title: "Drag to reorder",
          "aria-label": `Drag to reorder series ${s.name || s.slug}`,
          style: `
            margin-left:auto; display:inline-flex; align-items:center; justify-content:center;
            min-width:34px; height:28px; padding:0 10px; border-radius:999px;
            border:1px solid var(--line); background:var(--surface); color:var(--muted);
            font-size:var(--floating-control-font-size); font-weight:700; letter-spacing:.04em; cursor:grab; flex:0 0 auto;
          `
        }, "\u2261");
        reorderPill.addEventListener("click", (e) => e.stopPropagation());
        reorderPill.addEventListener("dragstart", (e) => {
          draggedSlug = s.slug;
          reorderPill.style.cursor = "grabbing";
          try { e.dataTransfer?.setData("text/plain", s.slug); } catch {}
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        });
        reorderPill.addEventListener("dragend", () => {
          draggedSlug = null;
          reorderPill.style.cursor = "grab";
          Array.from(listEl.children).forEach((child) => {
            child.style.boxShadow = "";
          });
        });

        const previewLink = el("a", {
          class:"btn mini",
          href:getSeriesPublicHref(s.slug),
          target:"_blank",
          rel:"noopener noreferrer",
          title:"Open public series page preview",
          style:"flex:0 0 auto;"
        }, "Preview");
        previewLink.addEventListener("click", (e) => e.stopPropagation());

        const rowStyle = isSelected
          ? "border-color:#ff8a1f; box-shadow:0 0 0 1px color-mix(in srgb, #ff8a1f 32%, transparent) inset;"
          : (isActive ? "border-color: var(--accent-border); background: var(--accent-soft);" : "");

        const btn = el("button", {
          class:"btn series-row",
          type:"button",
          style: rowStyle
        },
          el("div", { class:"series-row__main" },
            selectPill,
            editorial.cover.src ? el("img", { class:"series-row__cover", src:editorial.cover.src, alt:"" }) : null,
            el("div", { class:"series-row__body" },
              el("div", { class:"series-row__title" }, s.name || s.slug),
              el("div", { class:"series-row__meta" },
                buildSeriesSignal(editorial.visibilitySignal),
                buildSeriesSignal(editorial.descriptionSignal),
                buildSeriesSignal(editorial.coverSignal),
                buildSeriesSignal(editorial.artworkSignal)
              )
            ),
            el("div", { class:"series-row__actions" },
              previewLink,
              reorderPill
            )
          )
        );

        btn.addEventListener("click", () => {
          activeSlug = s.slug;
          renderList();
          renderEditor(s.slug);
        });

        const rowWrap = el("div", { style:"border-radius:14px; transition:box-shadow .14s ease;" }, btn);
        rowWrap.addEventListener("dragover", (e) => {
          if (!draggedSlug || draggedSlug === s.slug) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          rowWrap.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 32%, transparent)";
        });
        rowWrap.addEventListener("dragleave", () => {
          rowWrap.style.boxShadow = "";
        });
        rowWrap.addEventListener("drop", (e) => {
          e.preventDefault();
          rowWrap.style.boxShadow = "";
          const sourceSlug = draggedSlug || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
          reorderSeriesBySlug(sourceSlug, s.slug);
          draggedSlug = null;
        });

        listEl.appendChild(rowWrap);
      }
    }
    showHiddenToggle?.addEventListener("change", (e) => {
      syncShowHiddenToggleVisual();
      showHidden = !!e.target.checked;
      localStorage.setItem(SHOW_HIDDEN_KEY, showHidden ? "1" : "0");
      renderList();
    });

    selectAllBtn?.addEventListener("click", () => {
      seriesArray().forEach(s => selectedSlugs.add(s.slug));
      renderList();
    });

    selectVisibleBtn?.addEventListener("click", () => {
      const rows = showHidden ? seriesArray() : seriesArray().filter(s => !!s.isPublic);
      rows.forEach(s => selectedSlugs.add(s.slug));
      renderList();
    });

    clearSelectionBtn?.addEventListener("click", () => {
      selectedSlugs.clear();
      renderList();
    });

    deleteSelectedBtn?.addEventListener("click", async () => {
      const slugs = Array.from(selectedSlugs);
      if (!slugs.length) return;
      const ok = await confirmToast(
        `Delete ${slugs.length} selected series? This will also clear their series assignment from artworks.`,
        { confirmLabel: "Delete", cancelLabel: "Cancel", tone: "warn" }
      );
      if (!ok) return;

      if (!getAdminToken()) {
        for (const slug of slugs) delete state.seriesMeta[slug];
        if (activeSlug && slugs.includes(activeSlug)) activeSlug = null;
        slugs.forEach(slug => selectedSlugs.delete(slug));
        saveState(state);
        renderList();

        if (!activeSlug) {
          editor.innerHTML = "";
          editor.appendChild(el("div", { class:"sub" }, "Deleted selected series locally."));
        }

        setStatus("Deleted locally (no token).", 10000, "warn");
        return;
      }

      const results = await Promise.all(slugs.map(async (slug) => ({
        slug,
        ...(await deleteSeriesOnBackend(slug))
      })));
      const succeeded = results.filter(r => r.ok).map(r => r.slug);
      const failed = results.filter(r => !r.ok);

      for (const slug of succeeded) delete state.seriesMeta[slug];
      let artworkUpdates = { count: 0, failed: 0 };
      for (const slug of succeeded) {
        const out = await clearSeriesFromArtworks(slug);
        artworkUpdates.count += out.count;
        artworkUpdates.failed += out.failed;
      }
      if (activeSlug && succeeded.includes(activeSlug)) activeSlug = null;
      succeeded.forEach(slug => selectedSlugs.delete(slug));
      saveState(state);
      renderList();

      if (!activeSlug && succeeded.length) {
        editor.innerHTML = "";
        editor.appendChild(el("div", { class:"sub" }, "Deleted selected series."));
      }

      if (!failed.length) {
        if (artworkUpdates.failed > 0) setStatus(`Deleted ${succeeded.length} series, but failed to clear series on ${artworkUpdates.failed}/${artworkUpdates.count} artworks.`, 10000, "error");
        else setStatus(`Deleted ${succeeded.length} series.`, 10000, "success");
      } else {
        const firstErr = String(failed[0]?.error?.message || failed[0]?.error || "unknown error");
        console.error("[Series Delete] Bulk delete failures.", { failedCount: failed.length, total: slugs.length, failed });
        setStatus(`Backend failed for ${failed.length}/${slugs.length}: ${firstErr}`, 10000, "error");
      }
    });
    function artworkOptions(){
      // Published + drafts are both valid for cover selection
      return (state.artworks || [])
        .slice()
        .sort((a,b) => String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))
        .map(a => ({
          id: a.id,
          label: `${a.title || "Untitled"} (${a.id})`,
          thumb: a.thumb || ""
        }));
    }

    function seriesAliasesForRow(seriesRow){
      const aliases = new Set();
      const pushAlias = (v) => {
        const s = String(v || "").trim();
        if (!s) return;
        aliases.add(s.toLowerCase());
        const norm = slugifySeries(s);
        if (norm) aliases.add(norm.toLowerCase());
      };
      pushAlias(seriesRow?.slug);
      pushAlias(seriesRow?.name);
      pushAlias(seriesRow?.backendSlug);
      pushAlias(seriesRow?.rawSlug);
      return aliases;
    }

    function artworkBelongsToSeries(artwork, seriesRow){
      const value = String(artwork?.series || "").trim();
      if (!value) return false;
      const aliases = seriesAliasesForRow(seriesRow);
      const lower = value.toLowerCase();
      const norm = slugifySeries(value).toLowerCase();
      return aliases.has(lower) || aliases.has(norm);
    }

    function seriesArtworkItems(seriesRow){
      return (state.artworks || [])
        .slice()
        .sort((a,b) => String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")))
        .map((a) => ({
          id: a.id,
          label: `${a.title || "Untitled"} (${a.id})`,
          thumb: a.thumb || "",
          included: artworkBelongsToSeries(a, seriesRow)
        }));
    }

    function orderedSeriesArtworkItems(seriesRow){
      const allItems = seriesArtworkItems(seriesRow);
      const included = allItems.filter((item) => item.included);
      const order = Array.isArray(seriesRow?.imageOrder) ? seriesRow.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : [];
      if (!order.length) return included;
      const rank = new Map(order.map((id, index) => [id, index]));
      return included.slice().sort((a, b) => {
        const ai = rank.has(String(a.id)) ? rank.get(String(a.id)) : Number.POSITIVE_INFINITY;
        const bi = rank.has(String(b.id)) ? rank.get(String(b.id)) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        return 0;
      });
    }

    function modalSeriesArtworkItems(seriesRow){
      const allItems = seriesArtworkItems(seriesRow);
      const included = orderedSeriesArtworkItems(seriesRow);
      const includedIds = new Set(included.map((item) => String(item.id)));
      const excluded = allItems.filter((item) => !includedIds.has(String(item.id)));
      return [...included, ...excluded];
    }

    function renderEditor(slug){
      const s = state.seriesMeta[slug];
      if (!s){
        editor.innerHTML = "";
        editor.appendChild(el("div", { class:"sub" }, "Series not found."));
        return;
      }
      const editorial = getSeriesEditorialSignals(s);
      const publicHref = getSeriesPublicHref(s.slug);

      document.querySelectorAll(".series-cover-modal[data-series-cover-portal='1']").forEach((node) => node.remove());
      editor.innerHTML = "";
      editor.appendChild(
        el("div", { style:"display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap" },
          el("p", { class:"title", style:"margin:0" }, `Edit: ${s.name}`),
          el("span", { class:"sub" }, `slug: ${s.slug}`)
        )
      );
      editor.appendChild(
        el("section", { class:"series-preview-card", "aria-label":"Public preview summary" },
          el("div", { class:"series-preview-card__media" },
            editorial.cover.src
              ? el("img", { src:editorial.cover.src, alt:`${s.name} public cover preview` })
              : el("div", { class:"series-preview-card__empty" }, "No public cover preview yet")
          ),
          el("div", { class:"series-preview-card__body" },
            el("div", { class:"series-preview-card__top" },
              el("div", {},
                el("p", { class:"sub", style:"margin:0" }, "Public page preview"),
                el("h2", { class:"series-preview-card__title" }, s.name || s.slug)
              ),
              buildSeriesSignal(editorial.visibilitySignal)
            ),
            el("p", { class:"series-preview-card__summary" },
              editorial.hasDescription
                ? String(s.description || "").trim()
                : "Description missing. Add a short curatorial summary so the public series page feels intentional."
            ),
            el("div", { class:"series-preview-card__signals" },
              buildSeriesSignal(editorial.descriptionSignal),
              buildSeriesSignal(editorial.coverSignal),
              buildSeriesSignal(editorial.artworkSignal),
              editorial.stats.draft > 0
                ? buildSeriesSignal({ label: `${editorial.stats.draft} draft piece${editorial.stats.draft === 1 ? "" : "s"}`, tone: "warn" })
                : null
            ),
            el("p", { class:"sub series-preview-note" }, editorial.cover.note),
            el("div", { class:"series-preview-card__actions" },
              el("a", {
                class:"btn primary",
                href:publicHref,
                target:"_blank",
                rel:"noopener noreferrer"
              }, "Open public preview"),
              el("a", {
                class:"btn",
                href:publicHref
              }, "Open in this tab")
            )
          )
        )
      );

      const tabNav = el("div", { class:"series-editor-tabs", role:"tablist", "aria-label":"Series editor sections" });
      const tabContent = el("div", { class:"series-tab-content" });
      const detailsPanel = el("div", { class:"series-tab-panel is-active", role:"tabpanel" });
      const imagesPanel = el("div", { class:"series-tab-panel", role:"tabpanel", hidden:"" });
      const panels = { details: detailsPanel, images: imagesPanel };
      const tabButtons = {};
      const tabLabelText = {};
      let activeTab = "details";

      const setActiveTab = (tab) => {
        activeTab = tab;
        const paneColors = {
          details: "#4db6ac",
          images: "#d9a14b"
        };
        tabContent.style.setProperty("--series-pane-color", paneColors[tab] || "var(--accent)");
        for (const [key, panel] of Object.entries(panels)) {
          const active = key === tab;
          panel.classList.toggle("is-active", active);
          if (active) panel.removeAttribute("hidden");
          else panel.setAttribute("hidden", "");
        }
        for (const [key, btn] of Object.entries(tabButtons)) {
          const active = key === tab;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
          btn.tabIndex = active ? 0 : -1;
        }
      };

      const makeTabBtn = (key, label) => {
        const textNode = document.createTextNode(label);
        const btn = el("button", {
          type:"button",
          class:"tab series-editor-tab" + (key === activeTab ? " is-active" : ""),
          role:"tab",
          "aria-selected": key === activeTab ? "true" : "false",
          "data-series-tab": key
        }, textNode);
        btn.addEventListener("click", () => setActiveTab(key));
        tabButtons[key] = btn;
        tabLabelText[key] = textNode;
        tabNav.appendChild(btn);
      };

      makeTabBtn("details", "Details");
      makeTabBtn("images", "Images [0]");
      editor.appendChild(tabNav);

      const nameField = inputField(
        "Name",
        s.name || "",
        (v)=>{ s.name = v; queueSave(); },
        "text",
        { commitOnBlur: true }
      );
      const descField = textareaField(
        "Description",
        s.description || "",
        (v)=>{ s.description = v; queueSave(); },
        { commitOnBlur: true }
      );
      const pubField = toggleField("Public", !!s.isPublic, (v)=>{ s.isPublic = v; queueSave(true); });
      const covers = artworkOptions();
      const coverSelect = thumbSelectField(
        "Cover artwork",
        covers,
        s.coverArtworkId || "",
        (v)=>{ s.coverArtworkId = v; queueSave(true); }
      );

      detailsPanel.appendChild(nameField);
      detailsPanel.appendChild(descField);
      detailsPanel.appendChild(pubField);
      detailsPanel.appendChild(coverSelect);

      const imagesIntro = el("div", { class:"sub", style:"margin-top:4px" }, "Assign artwork to this series and review included thumbnails. Drag to reorder artwork in this series.");
      const manageImagesBtn = el("button", { class:"btn primary", type:"button" }, "Manage Series Artwork");
      const imageThumbStrip = el("div", { class:"series-image-strip" });
      let draggedImageId = "";
      const imagesEmpty = el("div", { class:"sub series-images-empty" }, "No artwork is currently included in this series.");

      const reorderIncludedImages = (sourceId, targetId) => {
        const current = orderedSeriesArtworkItems(s).map((item) => String(item.id));
        const from = current.indexOf(String(sourceId || ""));
        const to = current.indexOf(String(targetId || ""));
        if (from < 0 || to < 0 || from === to) return;
        const next = current.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        s.imageOrder = next;
        queueSave(true);
        renderImagesStrip();
      };

      const renderImagesStrip = () => {
        const included = orderedSeriesArtworkItems(s);
        if (tabLabelText.images) tabLabelText.images.textContent = `Images [${included.length}]`;
        imageThumbStrip.innerHTML = "";
        imagesEmpty.style.display = included.length ? "none" : "";
        for (const item of included) {
          const chip = el("div", { class:"series-image-chip", draggable:"true", "data-artwork-id": String(item.id) },
            item.thumb
              ? el("div", { class:"series-cover-thumb" }, el("img", { src:item.thumb, alt:item.label || "Series artwork" }))
              : el("div", { class:"series-cover-empty" }, "N/A"),
            el("div", { class:"series-cover-label", title:item.label || "" }, item.label || "Untitled")
          );
          chip.addEventListener("dragstart", (event) => {
            draggedImageId = String(item.id);
            imageThumbStrip.classList.add("is-dragging");
            chip.classList.add("is-dragging");
            try { event.dataTransfer?.setData("text/plain", draggedImageId); } catch {}
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
          });
          chip.addEventListener("dragend", () => {
            draggedImageId = "";
            imageThumbStrip.classList.remove("is-dragging");
            imageThumbStrip.querySelectorAll(".series-image-chip").forEach((node) => node.classList.remove("is-dragging", "is-drop-target"));
          });
          chip.addEventListener("dragover", (event) => {
            if (!draggedImageId || draggedImageId === String(item.id)) return;
            event.preventDefault();
            chip.classList.add("is-drop-target");
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          });
          chip.addEventListener("dragleave", () => chip.classList.remove("is-drop-target"));
          chip.addEventListener("drop", (event) => {
            event.preventDefault();
            chip.classList.remove("is-drop-target");
            const sourceId = draggedImageId || event.dataTransfer?.getData("text/plain") || "";
            reorderIncludedImages(sourceId, String(item.id));
          });
          imageThumbStrip.appendChild(chip);
        }
      };

      const buildSeriesPayload = () => ({
        name: s.name,
        description: s.description,
        sortOrder: Number(s.sortOrder || 0),
        isPublic: !!s.isPublic,
        coverArtworkId: s.coverArtworkId || "",
        imageOrder: Array.isArray(s.imageOrder) ? s.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
      });

      async function applySeriesArtworkSelection(nextIncludedIds){
        const desired = new Set((nextIncludedIds || []).map((v) => String(v)));
        const existingOrder = Array.isArray(s.imageOrder) ? s.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : [];
        s.imageOrder = existingOrder.filter((id) => desired.has(id));
        for (const item of seriesArtworkItems(s)) {
          const id = String(item.id);
          if (desired.has(id) && !s.imageOrder.includes(id)) s.imageOrder.push(id);
        }
        const touched = [];
        for (const artwork of (state.artworks || [])) {
          const belongs = artworkBelongsToSeries(artwork, s);
          const shouldInclude = desired.has(String(artwork.id));
          if (shouldInclude) {
            if (String(artwork.series || "") !== s.slug) {
              artwork.series = s.slug;
              touched.push({ artwork, value: s.slug });
            }
          } else if (belongs) {
            artwork.series = "";
            touched.push({ artwork, value: "" });
          }
        }

        saveState(state);
        renderImagesStrip();

        state.seriesMeta[slug] = { ...s };
        saveState(state);

        if (!touched.length) {
          setStatus("Series artwork already matches selection.", 10000, "info");
          return;
        }
        if (!getAdminToken()) {
          setStatus("Series artwork saved locally (no token).", 10000, "warn");
          return;
        }

        setStatus("Saving artwork selection...", 10000, "info");
        const results = await Promise.allSettled(touched.map(({ artwork, value }) =>
          patchArtworkToBackend(artwork.id, { series: value })
        ));
        let seriesSaveFailed = false;
        try {
          const out = await apiUpsertSeries(slug, buildSeriesPayload());
          state.seriesMeta[slug] = {
            ...state.seriesMeta[slug],
            ...out,
            coverThumb: normalizeCoverThumbPath(out?.coverThumb),
            isPublic: !!out.isPublic,
            imageOrder: Array.isArray(out?.imageOrder) ? out.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : buildSeriesPayload().imageOrder
          };
          saveState(state);
        } catch (e) {
          seriesSaveFailed = true;
        }
        const failed = results.filter((r) => r.status === "rejected").length;
        if (!failed && !seriesSaveFailed) setStatus("Series artwork updated.", 10000, "success");
        else if (seriesSaveFailed) setStatus(`Updated locally, but backend failed to save series order.`, 10000, "error");
        else setStatus(`Updated locally, but backend failed for ${failed}/${touched.length} artwork items.`, 10000, "error");
      }

      const openSeriesArtworkModal = () => {
        const allItems = modalSeriesArtworkItems(s);
        let includedIds = new Set(allItems.filter((item) => item.included).map((item) => String(item.id)));
        let selectedIds = new Set();
        let selectionAnchorId = "";
        const backdrop = el("div", { class:"series-cover-modal", role:"dialog", "aria-modal":"true", "aria-label":"Manage series artwork" });
        backdrop.dataset.seriesCoverPortal = "1";
        const panel = el("div", { class:"series-cover-modal-panel" });
        const picker = el("div", { class:"series-cover-picker", role:"listbox", "aria-label":"Series artwork picker" });
        const includeBtn = el("button", { class:"btn", type:"button", disabled:"", style:"font-weight:650" }, "Include");
        const excludeBtn = el("button", { class:"btn", type:"button", disabled:"", style:"font-weight:650" }, "Exclude");
        const selectToggleBtn = el("button", { class:"btn", type:"button", style:"font-weight:650" }, "Select All");
        const closeBtn = el("button", { class:"btn series-cover-modal-close", type:"button", "aria-label":"Close manage series artwork dialog" }, "\u00D7");
        const lastFocus = document.activeElement;

        const closeModal = (restoreFocus = true) => {
          backdrop.classList.remove("is-open");
          backdrop.remove();
          if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
        };

        const syncActionButtons = () => {
          const disabled = selectedIds.size === 0;
          includeBtn.disabled = disabled;
          excludeBtn.disabled = disabled;
          const allSelected = allItems.length > 0 && selectedIds.size === allItems.length;
          selectToggleBtn.textContent = allSelected ? "Select None" : "Select All";
          selectToggleBtn.disabled = allItems.length === 0;
        };

        const renderPicker = () => {
          picker.innerHTML = "";
          syncActionButtons();
          for (const item of allItems) {
            const picked = selectedIds.has(String(item.id));
            const included = includedIds.has(String(item.id));
            const btn = el("button", {
              type:"button",
              class:"series-cover-option" + (picked ? " is-picked" : "") + (included ? " is-included" : ""),
              role:"option",
              "aria-selected": picked ? "true" : "false",
              "aria-label": item.label || "Artwork option"
            },
              item.thumb
                ? el("div", { class:"series-cover-thumb" }, el("img", { src:item.thumb, alt:item.label || "Artwork option" }))
                : el("div", { class:"series-cover-empty" }, "N/A"),
              el("div", { class:"series-cover-option-meta" },
                el("div", { class:"series-cover-label", title:item.label || "" }, item.label || "Untitled"),
                included ? el("span", { class:"series-cover-pill" }, "Included") : null
              )
            );
            btn.addEventListener("click", (event) => {
              const key = String(item.id);
              if (event.shiftKey && selectionAnchorId) {
                const start = allItems.findIndex((entry) => String(entry.id) === selectionAnchorId);
                const end = allItems.findIndex((entry) => String(entry.id) === key);
                if (start >= 0 && end >= 0) {
                  const [from, to] = start <= end ? [start, end] : [end, start];
                  for (let index = from; index <= to; index += 1) {
                    selectedIds.add(String(allItems[index].id));
                  }
                } else if (selectedIds.has(key)) selectedIds.delete(key);
                else selectedIds.add(key);
              } else if (selectedIds.has(key)) {
                selectedIds.delete(key);
              } else {
                selectedIds.add(key);
              }
              selectionAnchorId = key;
              renderPicker();
            });
            picker.appendChild(btn);
          }
        };

        includeBtn.addEventListener("click", async () => {
          if (!selectedIds.size) return;
          selectedIds.forEach((id) => includedIds.add(id));
          await applySeriesArtworkSelection(Array.from(includedIds));
          selectedIds.clear();
          selectionAnchorId = "";
          renderPicker();
        });
        excludeBtn.addEventListener("click", async () => {
          if (!selectedIds.size) return;
          selectedIds.forEach((id) => includedIds.delete(id));
          await applySeriesArtworkSelection(Array.from(includedIds));
          selectedIds.clear();
          selectionAnchorId = "";
          renderPicker();
        });
        selectToggleBtn.addEventListener("click", () => {
          const allSelected = allItems.length > 0 && selectedIds.size === allItems.length;
          if (allSelected) selectedIds.clear();
          else selectedIds = new Set(allItems.map((item) => String(item.id)));
          renderPicker();
        });
        closeBtn.addEventListener("click", () => closeModal(true));

        backdrop.addEventListener("click", (event) => {
          if (event.target === backdrop) closeModal(true);
        });
        backdrop.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeModal(true);
        });

        panel.appendChild(
          el("div", { class:"series-cover-modal-top" },
            el("div", { class:"series-cover-modal-copy" },
              el("div", { class:"title", style:"margin:0" }, "Manage Series Artwork"),
              el("div", { class:"sub" }, "Select artwork thumbnails, then include or exclude them from this series.")
            ),
            el("div", { class:"series-cover-modal-toolbar-group" }, closeBtn)
          )
        );
        const pickerBody = el("div", { class:"series-cover-modal-body" }, picker);
        panel.appendChild(
          el("div", { class:"series-cover-modal-toolbar" },
            el("div", { class:"series-cover-modal-toolbar-group" }, includeBtn, excludeBtn),
            el("div", { class:"series-cover-modal-toolbar-group series-cover-modal-toolbar-group--right" }, selectToggleBtn)
          )
        );
        panel.appendChild(pickerBody);
        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        backdrop.classList.add("is-open");
        renderPicker();
        closeBtn.focus();
      };

      imagesPanel.appendChild(imagesIntro);
      imagesPanel.appendChild(el("div", { class:"series-images-toolbar" }, manageImagesBtn));
      imagesPanel.appendChild(imagesEmpty);
      imagesPanel.appendChild(imageThumbStrip);
      manageImagesBtn.addEventListener("click", openSeriesArtworkModal);
      renderImagesStrip();

      tabContent.appendChild(detailsPanel);
      tabContent.appendChild(imagesPanel);
      editor.appendChild(tabContent);

      editor.appendChild(el("hr", { class:"sep" }));

      const delBtn  = el(
        "button",
        {
          class:"btn danger",
          type:"button",
          style:"font-weight:700; border-width:2px; box-shadow:0 0 0 1px color-mix(in srgb, #d15353 35%, transparent) inset;"
        },
        "Delete series"
      );

      editor.appendChild(el("div", { style:"display:flex; gap:10px; flex-wrap:wrap; align-items:center" },
        delBtn,
        el("span", { style:"margin-left:auto" })
      ));

      // Save logic: local immediately, backend debounced
      let t = null;

      function localSave(){
        state.seriesMeta[slug] = { ...s };
        saveState(state);
        renderList();
      }

      async function backendSave(){
        if (!getAdminToken()){
          setStatus("Saved locally (no token).", 10000, "warn");
          return;
        }

        const payload = buildSeriesPayload();

        setStatus("Saving...", 10000, "info");
        try {
          const out = await apiUpsertSeries(slug, payload);
          state.seriesMeta[slug] = {
            ...state.seriesMeta[slug],
            ...out,
            coverThumb: normalizeCoverThumbPath(out?.coverThumb),
            isPublic: !!out.isPublic,
            imageOrder: Array.isArray(out?.imageOrder) ? out.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : (Array.isArray(state.seriesMeta[slug]?.imageOrder) ? state.seriesMeta[slug].imageOrder : [])
          };
          saveState(state);
          setStatus("Saved.", 10000, "success");
          renderList();
          renderImagesStrip();
        } catch (e) {
          setStatus(`Backend save failed (local ok): ${e?.message || e}`, 10000, "error");
        }
      }

      function queueSave(immediateCover=false){
        localSave();
        clearTimeout(t);
        t = setTimeout(()=> backendSave(), immediateCover ? 0 : 600);
      }

      delBtn.addEventListener("click", async () => {
        const ok = await confirmToast(
          `Delete series "${s.name}"?

This will also clear its series assignment from any existing artwork.

`,
          {
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            tone: "warn",
            highlightText: "Note: The actual artwork is NOT deleted."
          }
        );
        if (!ok) return;

        if (getAdminToken()) {
          const out = await deleteSeriesOnBackend(slug);
          if (!out.ok) {
            console.error("[Series Delete] Single delete failed.", { slug, result: out });
            setStatus(`Backend delete failed: ${out?.error?.message || out?.error || "unknown error"}`, 10000, "error");
            return;
          }
          delete state.seriesMeta[slug];
          const artworkUpdates = await clearSeriesFromArtworks(slug);
          saveState(state);
          activeSlug = null;
          selectedSlugs.delete(slug);
          renderList();
          editor.innerHTML = "";
          editor.appendChild(el("div", { class:"sub" }, "Deleted."));
          if (artworkUpdates.failed > 0) setStatus(`Deleted, but failed to clear series on ${artworkUpdates.failed}/${artworkUpdates.count} artworks.`, 10000, "error");
          else setStatus("Deleted.", 10000, "success");
          return;
        }

        delete state.seriesMeta[slug];
        await clearSeriesFromArtworks(slug);
        saveState(state);
        activeSlug = null;
        selectedSlugs.delete(slug);
        renderList();
        editor.innerHTML = "";
        editor.appendChild(el("div", { class:"sub" }, "Deleted locally."));
        setStatus("Deleted locally (no token).", 10000, "warn");
      });
    }

    // Create series
    document.getElementById("createBtn").addEventListener("click", async () => {
      const name = newName.value.trim();
      if (!name) {
        setStatus("Enter a series name.", 10000, "warn");
        flashInputAttention(newName);
        return;
      }

      const slug = slugifySeries(name);
      if (!slug) return setStatus("Name produced an invalid slug.", 10000, "warn");

      if (!state.seriesMeta[slug]) {
        state.seriesMeta[slug] = {
          slug,
          name,
          description: "",
          sortOrder: seriesArray().length * 10,
          isPublic: true,
          coverArtworkId: "",
          imageOrder: []
        };
        saveState(state);
      }

      activeSlug = slug;
            newName.value = "";
            syncFloatingFieldState(newNameField, newName);
            renderList();
      renderEditor(slug);

      // Attempt backend create
      if (getAdminToken()){
        try {
          await apiUpsertSeries(slug, state.seriesMeta[slug]);
          setStatus("Created (and saved to backend).", 10000, "success");
        } catch(e) {
          setStatus(`Created locally; backend failed: ${e?.message || e}`, 10000, "error");
        }
      } else {
        setStatus("Created locally (no token).", 10000, "warn");
      }
    });

    // -----------------------
    // Field helpers
    // -----------------------

    function buildFloatingField(label, control, opts = {}){
      const field = el("div", { class: "field series-floating-field", style: `margin-top:${opts.marginTop ?? 12}px` },
        control,
        el("label", { class:"series-floating-label" }, label)
      );
      bindFloatingField(field, control);
      return field;
    }

    function inputField(label, value, onChange, type = "text", opts = {}){
      const input = el("input", { type, value: value ?? "", placeholder:" " });
      const commitOnBlur = !!opts.commitOnBlur;
      if (commitOnBlur) {
        const commit = () => onChange(input.value);
        input.addEventListener("blur", commit);
        input.addEventListener("change", commit);
      } else {
        input.addEventListener("input", (e)=> onChange(e.target.value));
      }
      return buildFloatingField(label, input, opts);
    }

    function textareaField(label, value, onChange, opts = {}){
      const t = el("textarea", { placeholder:" " }, value ?? "");
      const commitOnBlur = !!opts.commitOnBlur;
      if (commitOnBlur) {
        const commit = () => onChange(t.value);
        t.addEventListener("blur", commit);
        t.addEventListener("change", commit);
      } else {
        t.addEventListener("input", (e)=> onChange(e.target.value));
      }
      return buildFloatingField(label, t, opts);
    }

    function toggleField(label, checked, onChange){
      let current = !!checked;
      const knob = el("span", {
        "aria-hidden":"true",
        style:`
          width:18px;
          height:18px;
          border-radius:999px;
          background:var(--bg);
          box-shadow:0 1px 2px rgba(0,0,0,.2);
          transition:transform .15s ease;
          transform:translateX(${current ? "18px" : "0"});
        `
      });
      const track = el("span", {
        "aria-hidden":"true",
        style:`
          width:40px;
          height:22px;
          border-radius:999px;
          border:1px solid var(--line);
          padding:1px;
          display:inline-flex;
          align-items:center;
          background:${current ? "var(--accent-soft)" : "var(--surface)"};
          transition:background .15s ease, border-color .15s ease;
        `
      }, knob);
      const txt = el("span", { class:"sub", style:"margin:0; min-width:54px" }, current ? "Public" : "Hidden");
      const btn = el("button", {
        type:"button",
        role:"switch",
        "aria-checked": current ? "true" : "false",
        "aria-label": label,
        class:"btn",
        style:"padding:6px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:10px;"
      }, track, txt);

      const render = () => {
        track.style.background = current ? "var(--accent-soft)" : "var(--surface)";
        track.style.borderColor = current ? "var(--accent-border)" : "var(--line)";
        knob.style.transform = `translateX(${current ? "18px" : "0"})`;
        txt.textContent = current ? "Public" : "Hidden";
        btn.setAttribute("aria-checked", current ? "true" : "false");
      };

      btn.addEventListener("click", ()=> {
        current = !current;
        render();
        onChange(current);
      });

      render();
      return el("div", { style:"display:flex; align-items:center; gap:10px; margin-top:12px" },
        el("div", { class:"sub", style:"margin:0" }, label),
        btn
      );
    }

    function selectField(label, options, current, onChange, opts = {}){
      const s = el("select", {},
        ...options.map(o => el("option", { value:o.value, selected: o.value===current ? "" : null }, o.label))
      );
      s.addEventListener("change", (e)=> onChange(e.target.value));
      return buildFloatingField(label, s, opts);
    }

    function thumbSelectField(label, options, current, onChange){
      let selectedId = current || "";
      const opts = [{ id:"", label:"None", thumb:"" }, ...(options || [])];
      const picker = el("div", { class:"series-cover-picker", role:"listbox", "aria-label": label });
      const trigger = el("button", {
        type:"button",
        class:"btn series-cover-trigger",
        "aria-label":"Choose cover artwork"
      });
      const backdrop = el("div", { class:"series-cover-modal", role:"dialog", "aria-modal":"true", "aria-label": label });
      backdrop.dataset.seriesCoverPortal = "1";
      const closeBtn = el("button", { class:"btn series-cover-modal-close", type:"button", "aria-label":"Close cover artwork picker" }, "\u00D7");
      const panel = el("div", { class:"series-cover-modal-panel" });
      const lastFocus = { current: null };

      const closeModal = () => {
        backdrop.classList.remove("is-open");
        backdrop.remove();
        if (lastFocus.current && typeof lastFocus.current.focus === "function") lastFocus.current.focus();
      };

      const selectedOption = () => opts.find((o) => o.id === selectedId) || opts[0];

      const buildThumb = (o) => {
        if (!o.id) return el("div", { class:"series-cover-empty" }, "No cover");
        return el("div", { class:"series-cover-thumb" },
          o.thumb
            ? el("img", { src:o.thumb, alt:o.label || "Cover option" })
            : el("div", { class:"sub" }, "N/A")
        );
      };

      const renderTrigger = () => {
        trigger.innerHTML = "";
        trigger.appendChild(buildThumb(selectedOption()));
      };

      const renderPicker = () => {
        picker.innerHTML = "";
        for (const o of opts){
          const selected = o.id === selectedId;
          const btn = el("button", {
            type:"button",
            class:"series-cover-option" + (selected ? " is-selected" : ""),
            role:"option",
            "aria-selected": selected ? "true" : "false",
            "aria-label": o.label || "Cover option"
          },
            buildThumb(o),
            el("div", { class:"series-cover-label" }, o.label || "Untitled")
          );
          btn.addEventListener("click", () => {
            selectedId = o.id;
            onChange(selectedId);
            renderTrigger();
            renderPicker();
            closeModal();
          });
          picker.appendChild(btn);
        }
      };

      trigger.addEventListener("click", () => {
        lastFocus.current = document.activeElement;
        document.body.appendChild(backdrop);
        backdrop.classList.add("is-open");
        renderPicker();
        closeBtn.focus();
      });
      closeBtn.addEventListener("click", closeModal);
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) closeModal();
      });
      backdrop.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeModal();
      });

      panel.appendChild(
        el("div", { class:"series-cover-modal-top" },
          el("div", { class:"series-cover-modal-copy" },
            el("div", { class:"title", style:"margin:0" }, label),
            el("div", { class:"sub" }, "Choose a cover artwork from the available thumbnails.")
          ),
          closeBtn
        )
      );
      panel.appendChild(
        el("div", { class:"series-cover-modal-body" }, picker)
      );
      backdrop.appendChild(panel);
      document.body.appendChild(backdrop);

      renderTrigger();
      return el("div", { class:"field", style:"margin-top:12px" },
        el("div", { class:"sub" }, label),
        trigger
      );
    }
    renderList();
  








