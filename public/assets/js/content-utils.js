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
    }
    .lb-media{
      background: rgba(255,255,255,.03);
      display:flex; align-items:center; justify-content:center;
      min-height: calc(100vh - 90px);
      position: relative;
      overflow: hidden;
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
    @media (max-width: 920px){
      .lb-body{ grid-template-columns: 1fr; }
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
    }
  `;
  document.head.appendChild(style);
}

export function createArtworkLightboxController() {
  ensureLightboxStyles();

  const backdrop = el("div", { class: "lb-backdrop", role: "dialog", "aria-modal": "true" });
	  const title = el("div", { class: "lb-title" }, "");
	  const closeBtn = el("button", { class: "btn", type: "button" }, "Close");
	  const prevBtn = el("button", { class: "btn", type: "button" }, "Prev");
	  const nextBtn = el("button", { class: "btn", type: "button" }, "Next");

	  const top = el("div", { class: "lb-top" }, title, el("div", { class: "lb-actions" }, prevBtn, nextBtn, closeBtn));
	  const mediaFrame = el("div", { class: "lb-media-frame" });
	  const media = el("div", { class: "lb-media" }, mediaFrame);
	  const metaTitle = el("div", { style: "font-weight:650" }, "");
	  const metaSub = el("div", { class: "sub" }, "");
	  const metaTagsLabel = el("div", { class: "lb-tags-label" }, "Tags");
  const metaTagsValue = el("div", { class: "lb-tags-value" });
  const metaTags = el("div", { class: "lb-tags" }, metaTagsLabel, metaTagsValue);
  const metaDesc = el("div", { class: "sub", style: "font-size:15px; line-height:1.65" }, "");
  const meta = el("div", { class: "lb-meta" }, metaTitle, metaSub, metaTags, el("hr", { class: "sep" }), metaDesc);
  const body = el("div", { class: "lb-body" }, media, meta);
  const panel = el("div", { class: "lb" }, top, body);

  backdrop.appendChild(panel);

	  let currentList = [];
	  let currentIndex = -1;
	  let lastActive = null;
	  let activeImg = null;
	  let animationToken = 0;

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

  document.addEventListener("keydown", (e) => {
    if (backdrop.style.display !== "flex") return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  return { host: backdrop, open, close, next, prev };
}
