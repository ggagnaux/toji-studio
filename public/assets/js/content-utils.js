export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function slugifySeries(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sortBySortOrderAndDate(items) {
  return items.slice().sort((a, b) => {
    const soA = Number(a.sortOrder || 0);
    const soB = Number(b.sortOrder || 0);
    if (soA !== soB) return soB - soA;
    const da = a.publishedAt || a.createdAt || "";
    const db = b.publishedAt || b.createdAt || "";
    return String(db).localeCompare(String(da));
  });
}

export function sortGallery(items) {
  return items.slice().sort((a, b) => {
    const fa = !!a.featured;
    const fb = !!b.featured;
    if (fa !== fb) return fb - fa;
    const soA = Number(a.sortOrder || 0);
    const soB = Number(b.sortOrder || 0);
    if (soA !== soB) return soB - soA;
    const da = a.publishedAt || a.createdAt || "";
    const db = b.publishedAt || b.createdAt || "";
    return String(db).localeCompare(String(da));
  });
}

function ensureLightboxStyles() {
  if (document.getElementById("artwork-lightbox-styles")) return;

  const style = document.createElement("style");
  style.id = "artwork-lightbox-styles";
  style.textContent = `
    .lb-backdrop{
      position:fixed; inset:0; z-index:1000;
      background: rgba(0,0,0,.72);
      display:none; align-items:center; justify-content:center;
      padding: 8px;
    }
    [data-theme="light"] .lb-backdrop{ background: rgba(0,0,0,.55); }
    .lb{
      width:calc(100vw - 16px);
      max-width:calc(100vw - 16px);
      max-height:calc(100vh - 16px);
      border:1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
      box-shadow: var(--shadow);
      overflow:hidden;
    }
    .lb-top{
      display:flex; align-items:center; justify-content:space-between;
      gap:10px;
      padding:12px 12px;
      border-bottom:1px solid var(--line);
    }
    .lb-title{ font-weight:650; }
    .lb-body{
      display:grid;
      grid-template-columns: 1fr 320px;
      gap: 0;
      min-height: 0;
      transition: grid-template-columns .22s ease;
    }
    .lb-body.is-meta-collapsed{
      grid-template-columns: 1fr 0;
    }
    .lb-media{
      background: rgba(255,255,255,.03);
      display:flex; align-items:center; justify-content:center;
      min-height: calc(100vh - 90px);
      position: relative;
      overflow: hidden;
    }
    .lb-media-tabbar{
      position:absolute;
      top:12px;
      right:12px;
      z-index:3;
      display:flex;
      justify-content:flex-end;
      pointer-events:none;
    }
    .lb-media-frame{
      position: relative;
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 90px);
      overflow: hidden;
    }
    .lb-media img{
      position: absolute;
      inset: 0;
      width:100%;
      height:100%;
      max-height: calc(100vh - 16px);
      object-fit: contain;
      background: var(--bg);
      transition: transform .3s ease, opacity .3s ease;
      will-change: transform, opacity;
    }
    .lb-media img.is-active{
      transform: translateX(0);
      opacity: 1;
      z-index: 2;
    }
    .lb-media img.is-enter-from-next{
      transform: translateX(100%);
      opacity: .72;
      z-index: 2;
    }
    .lb-media img.is-enter-from-prev{
      transform: translateX(-100%);
      opacity: .72;
      z-index: 2;
    }
    .lb-media img.is-exit-to-next{
      transform: translateX(-100%);
      opacity: .72;
      z-index: 1;
    }
    .lb-media img.is-exit-to-prev{
      transform: translateX(100%);
      opacity: .72;
      z-index: 1;
    }
    .lb-meta{
      padding:14px;
      border-left:1px solid var(--line);
      overflow:hidden;
      min-width:0;
      transition: opacity .18s ease, transform .18s ease, padding .18s ease, border-color .18s ease;
    }
    .lb-body.is-meta-collapsed .lb-meta{
      opacity:0;
      transform: translateX(12px);
      padding-left:0;
      padding-right:0;
      border-left-color: transparent;
      pointer-events:none;
    }
    .lb-meta-tab{
      pointer-events:auto;
      position:relative;
      z-index:3;
      min-width:88px;
      min-height:0;
      padding:8px 10px;
      border:1px solid var(--line);
      border-radius:999px;
      background: color-mix(in srgb, var(--panel) 92%, #000 8%);
      color:var(--text);
      box-shadow: var(--shadow);
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      cursor:pointer;
      transition: background .18s ease, border-color .18s ease, transform .18s ease, opacity .18s ease;
    }
    .lb-meta-tab:hover,
    .lb-meta-tab:focus-visible{
      background: color-mix(in srgb, var(--panel) 82%, var(--accent) 18%);
      border-color: color-mix(in srgb, var(--accent-border) 78%, var(--line));
    }
    .lb-meta-tab-label{
      font-size:11px;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .lb-body.is-meta-collapsed .lb-meta-tab{
      opacity:.96;
    }
    .lb-meta .sub{ margin-top:8px; }
    .lb-tags{
      margin-top:10px;
      display:grid;
      gap:6px;
    }
    .lb-tags-label{
      font-weight:600;
      font-size:13px;
      letter-spacing:.02em;
      color:var(--muted);
      text-transform:uppercase;
    }
    .lb-tags-value{
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin:0;
    }
    .lb-tag{
      border:1px solid var(--chip-border);
      border-radius:999px;
      padding:4px 9px;
      font-size:12px;
      line-height:1.2;
      color:var(--text);
      background: var(--chip-bg);
    }
    .lb-tag-empty{
      border-style:dashed;
      color:var(--muted);
    }
	    .lb-actions{ display:flex; gap:8px; flex-wrap:wrap; }
	    .lb-actions .btn{ padding:8px 10px; font-size:13px; }
	    .lb-actions .btn,
	    .lb-meta-tab{
	      transition: background .18s ease, border-color .18s ease, transform .18s ease, opacity .18s ease, box-shadow .18s ease, color .18s ease;
	    }
	    .lb-actions .btn:hover,
	    .lb-actions .btn:focus-visible,
	    .lb-meta-tab:hover,
	    .lb-meta-tab:focus-visible{
	      color: var(--text);
	      background: color-mix(in srgb, var(--panel) 62%, var(--accent) 38%);
	      border-color: color-mix(in srgb, var(--accent-border) 88%, #ffffff 12%);
	      box-shadow: 0 10px 24px rgba(0,0,0,.28);
	      transform: translateY(-1px);
	    }
	    @media (max-width: 920px){
      .lb-body{ grid-template-columns: 1fr; }
      .lb-body.is-meta-collapsed{ grid-template-columns: 1fr; }
      .lb-media{
        min-height: calc(100vh - 180px);
      }
      .lb-media-frame{
        min-height: calc(100vh - 180px);
      }
      .lb-meta{
        border-left:0;
        border-top:1px solid var(--line);
        max-height: 28vh;
        overflow:auto;
      }
      .lb-body.is-meta-collapsed .lb-meta{
        max-height:0;
        min-height:0;
        padding-top:0;
        padding-bottom:0;
        border-top-color: transparent;
      }
      .lb-meta-tab{
        min-width:82px;
      }
      .lb-body.is-meta-collapsed .lb-meta-tab{
        opacity:.96;
      }
    }
  `;
  document.head.appendChild(style);
}

export function createArtworkLightboxController() {
  ensureLightboxStyles();

  const backdrop = el("div", { class: "lb-backdrop", role: "dialog", "aria-modal": "true" });
	  const title = el("div", { class: "lb-title" }, "");
		  const closeBtn = el("button", { class: "btn", type: "button", "aria-label": "Close lightbox", title: "Close lightbox" }, "x");
		  const prevBtn = el("button", { class: "btn", type: "button", "aria-label": "Previous artwork", title: "Previous artwork" }, "\u2190");
		  const nextBtn = el("button", { class: "btn", type: "button", "aria-label": "Next artwork", title: "Next artwork" }, "\u2192");

	  const top = el("div", { class: "lb-top" }, title, el("div", { class: "lb-actions" }, prevBtn, nextBtn, closeBtn));
		  const mediaFrame = el("div", { class: "lb-media-frame" });
		  const metaTitle = el("div", { style: "font-weight:650" }, "");
	  const metaSub = el("div", { class: "sub" }, "");
	  const metaTagsLabel = el("div", { class: "lb-tags-label" }, "Tags");
  const metaTagsValue = el("div", { class: "lb-tags-value" });
  const metaTags = el("div", { class: "lb-tags" }, metaTagsLabel, metaTagsValue);
  const metaDesc = el("div", { class: "sub", style: "font-size:15px; line-height:1.65" }, "");
		  const meta = el("div", { class: "lb-meta" }, metaTitle, metaSub, metaTags, el("hr", { class: "sep" }), metaDesc);
  const metaTabLabel = el("span", { class: "lb-meta-tab-label" }, "Details");
  const metaTab = el("button", {
    class: "lb-meta-tab",
    type: "button",
    "aria-expanded": "false",
    "aria-label": "Show details panel"
  }, metaTabLabel);
  const mediaTabbar = el("div", { class: "lb-media-tabbar" }, metaTab);
		  const media = el("div", { class: "lb-media" }, mediaTabbar, mediaFrame);
  const body = el("div", { class: "lb-body is-meta-collapsed" }, media, meta);
	  const panel = el("div", { class: "lb" }, top, body);

  backdrop.appendChild(panel);

		  let currentList = [];
		  let currentIndex = -1;
		  let lastActive = null;
		  let activeImg = null;
		  let animationToken = 0;
  let isMetaOpen = false;

  function syncMetaVisibility() {
    body.classList.toggle("is-meta-collapsed", !isMetaOpen);
    metaTab.setAttribute("aria-expanded", isMetaOpen ? "true" : "false");
    metaTab.setAttribute("aria-label", isMetaOpen ? "Hide details panel" : "Show details panel");
    metaTabLabel.textContent = isMetaOpen ? "Hide" : "Details";
  }

	  function renderImage(item, direction = 0) {
	    const nextImg = el("img", {
	      alt: item.alt || item.title || "Artwork",
	      src: item.image || item.thumb || ""
	    });

	    if (!activeImg || direction === 0) {
	      mediaFrame.innerHTML = "";
	      nextImg.classList.add("is-active");
	      mediaFrame.appendChild(nextImg);
	      activeImg = nextImg;
	      return;
	    }

	    const token = ++animationToken;
	    const outgoingImg = activeImg;
	    nextImg.classList.add(direction > 0 ? "is-enter-from-next" : "is-enter-from-prev");
	    mediaFrame.appendChild(nextImg);

	    requestAnimationFrame(() => {
	      if (token !== animationToken) return;
	      outgoingImg.classList.remove("is-active");
	      outgoingImg.classList.add(direction > 0 ? "is-exit-to-next" : "is-exit-to-prev");
	      nextImg.classList.remove("is-enter-from-next", "is-enter-from-prev");
	      nextImg.classList.add("is-active");
	    });

	    const cleanup = () => {
	      if (outgoingImg.parentNode === mediaFrame) mediaFrame.removeChild(outgoingImg);
	      nextImg.removeEventListener("transitionend", cleanup);
	    };
	    nextImg.addEventListener("transitionend", cleanup);
	    window.setTimeout(cleanup, 360);
	    activeImg = nextImg;
	  }

	  function showCurrent(direction = 0) {
	    if (!currentList.length || currentIndex < 0 || currentIndex >= currentList.length) return;
	    const item = currentList[currentIndex];
	    title.textContent = item.title || "Untitled";
	    metaTitle.textContent = item.title || "Untitled";

    const bits = [item.series || null, item.year || null, item.featured ? "Featured" : null]
      .filter(Boolean)
      .join(" • ");
    metaSub.textContent = bits || "";
    const tags = Array.isArray(item.tags)
      ? item.tags.map((t) => String(t || "").trim()).filter(Boolean)
      : [];
    metaTagsValue.innerHTML = "";
    if (tags.length) {
      tags.forEach((tag) => metaTagsValue.appendChild(el("span", { class: "lb-tag" }, tag)));
	    } else {
	      metaTagsValue.appendChild(el("span", { class: "lb-tag lb-tag-empty" }, "None"));
	    }
	    metaDesc.textContent = item.description || "";

	    renderImage(item, direction);
	    backdrop.style.display = "flex";
	  }

		  function open(list, idx = 0) {
	    if (!Array.isArray(list) || !list.length) return;
	    lastActive = document.activeElement;
	    currentList = list;
	    currentIndex = Math.max(0, Math.min(list.length - 1, Number(idx) || 0));
    isMetaOpen = false;
    syncMetaVisibility();
		    showCurrent(0);
		    closeBtn.focus();
		  }

	  function close() {
	    backdrop.style.display = "none";
    if (lastActive && typeof lastActive.focus === "function") lastActive.focus();
  }

	  function next() {
	    if (!currentList.length) return;
	    currentIndex = (currentIndex + 1) % currentList.length;
	    showCurrent(1);
	  }

	  function prev() {
	    if (!currentList.length) return;
	    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
	    showCurrent(-1);
	  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
	  closeBtn.addEventListener("click", close);
	  nextBtn.addEventListener("click", next);
	  prevBtn.addEventListener("click", prev);
  metaTab.addEventListener("click", () => {
    isMetaOpen = !isMetaOpen;
    syncMetaVisibility();
  });

	  document.addEventListener("keydown", (e) => {
	    if (backdrop.style.display !== "flex") return;
	    if (e.key === "Escape") close();
	    if (e.key === "ArrowRight") next();
	    if (e.key === "ArrowLeft") prev();
	  });

  syncMetaVisibility();

	  return { host: backdrop, open, close, next, prev };
}
