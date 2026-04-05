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
	    .lb-title{
	      font-weight:650;
	      min-width:0;
	    }
	    .lb-counter{
	      position:absolute;
	      left:14px;
	      bottom:14px;
	      padding:6px 10px;
	      border:1px solid color-mix(in srgb, var(--line) 78%, transparent);
	      border-radius:999px;
	      background:color-mix(in srgb, var(--panel) 82%, rgba(0,0,0,.18) 18%);
	      color:var(--muted);
	      font-size:19.5px;
	      line-height:1.2;
	      white-space:nowrap;
	      z-index:3;
	      pointer-events:none;
	      backdrop-filter:blur(6px);
	    }
    .lb-body{
      display:grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 0;
      min-height: 0;
    }
    .lb-media{
      --lb-media-pad: clamp(18px, 2.4vw, 32px);
      background: rgba(255,255,255,.03);
      display:flex; align-items:center; justify-content:center;
      min-height: calc(100vh - 90px);
      position: relative;
      overflow: visible;
      min-width: 0;
      grid-column: 2;
      grid-row: 1;
    }
    .lb-media-nav{
      position:absolute;
      top:50%;
      width:60px;
      height:60px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:1px solid color-mix(in srgb, var(--accent-border) 72%, var(--line) 28%);
      border-radius:10px;
      background:linear-gradient(
        180deg,
        color-mix(in srgb, var(--panel) 62%, rgba(0,0,0,.38) 38%),
        color-mix(in srgb, var(--panel) 78%, rgba(0,0,0,.18) 22%)
      );
      color:var(--text);
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, #ffffff 10%, transparent),
        0 12px 28px rgba(0,0,0,.28),
        0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
      opacity:0;
      // pointer-events:none;
      pointer: hand;
      z-index:4;
      font-size:18px;
      font-weight:700;
      transition:opacity .18s ease, transform .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease;
    }
    .lb-media-nav--prev{
      left:calc(var(--lb-media-pad) * .45);
      transform:translate(-4px, -50%);
    }
    .lb-media-nav--next{
      right:calc(var(--lb-media-pad) * .45);
      transform:translate(4px, -50%);
    }
    .lb-media:hover .lb-media-nav,
    .lb-media:focus-within .lb-media-nav{
      opacity:.96;
      pointer-events:auto;
    }
    .lb-media:hover .lb-media-nav--prev,
    .lb-media:focus-within .lb-media-nav--prev{
      transform:translate(0, -50%);
    }
    .lb-media:hover .lb-media-nav--next,
    .lb-media:focus-within .lb-media-nav--next{
      transform:translate(0, -50%);
    }
	    .lb-media-nav:hover,
	    .lb-media-nav:focus-visible{
	      background:linear-gradient(
	        180deg,
	        color-mix(in srgb, var(--panel) 42%, var(--accent) 58%),
        color-mix(in srgb, var(--panel) 56%, var(--accent) 44%)
      );
      border-color:color-mix(in srgb, var(--accent-border) 88%, #ffffff 12%);
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, #ffffff 14%, transparent),
        0 14px 30px rgba(0,0,0,.34),
	        0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
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
      inset: var(--lb-media-pad);
      width:calc(100% - (var(--lb-media-pad) * 2));
      height:calc(100% - (var(--lb-media-pad) * 2));
      max-height: calc(100vh - 16px - (var(--lb-media-pad) * 2));
      object-fit: contain;
      background: var(--bg);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--line) 78%, transparent);
      border-radius: 2px;
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
	      padding-bottom:52px;
	      border-right:1px solid var(--line);
	      overflow:hidden;
	      min-width:0;
	      grid-column: 1;
	      grid-row: 1;
	      position:relative;
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
		    .lb-actions .btn{
		      transition: background .18s ease, border-color .18s ease, transform .18s ease, opacity .18s ease, box-shadow .18s ease, color .18s ease;
		    }
			    .lb-actions .btn:hover,
			    .lb-actions .btn:focus-visible{
			      color: var(--text);
			      background: color-mix(in srgb, var(--panel) 62%, var(--accent) 38%);
			      border-color: color-mix(in srgb, var(--accent-border) 88%, #ffffff 12%);
			      box-shadow: 0 10px 24px rgba(0,0,0,.28);
			      transform: translate(2px, 0);
			    }
			    @media (max-width: 920px){
	      .lb{
	        overflow:auto;
	      }
	      .lb-body{ grid-template-columns: 1fr; }
	      .lb-media{
	        min-height: min(52vh, calc(100vh - 260px));
          grid-column: auto;
          grid-row: auto;
	      }
		      .lb-media-frame{
		        min-height: min(52vh, calc(100vh - 260px));
		      }
          .lb-media-nav{
            width:42px;
            height:42px;
          }
			      .lb-meta{
		          grid-column: auto;
		          grid-row: auto;
		        border-left:0;
		        border-top:1px solid var(--line);
		        max-height:none;
		        overflow:visible;
		      }
	    }
  `;
  document.head.appendChild(style);
}

export function createArtworkLightboxController() {
  ensureLightboxStyles();

  const backdrop = el("div", { class: "lb-backdrop", role: "dialog", "aria-modal": "true" });
		  const title = el("div", { class: "lb-title" }, "");
		  const counter = el("div", { class: "lb-counter", "aria-live": "polite" }, "");
			  const closeBtn = el("button", { class: "btn", type: "button", "aria-label": "Close lightbox", title: "Close lightbox" }, "x");
		  const prevBtn = el("button", { class: "btn", type: "button", "aria-label": "Previous artwork", title: "Previous artwork" }, "\u2190");
		  const nextBtn = el("button", { class: "btn", type: "button", "aria-label": "Next artwork", title: "Next artwork" }, "\u2192");

			  const top = el("div", { class: "lb-top" }, title, el("div", { class: "lb-actions" }, closeBtn));
			  const mediaFrame = el("div", { class: "lb-media-frame" });
		  const metaTitle = el("div", { style: "font-weight:650" }, "");
	  const metaSub = el("div", { class: "sub" }, "");
		  const metaTagsLabel = el("div", { class: "lb-tags-label" }, "Tags");
	  const metaTagsValue = el("div", { class: "lb-tags-value" });
	  const metaTags = el("div", { class: "lb-tags" }, metaTagsLabel, metaTagsValue);
	  const metaDesc = el("div", { class: "sub", style: "font-size:15px; line-height:1.65" }, "");
				  const meta = el("div", { class: "lb-meta" }, metaTitle, metaSub, metaTags, el("hr", { class: "sep" }), metaDesc, counter);
			  prevBtn.className = "lb-media-nav lb-media-nav--prev";
			  nextBtn.className = "lb-media-nav lb-media-nav--next";
				  const media = el("div", { class: "lb-media" }, mediaFrame, prevBtn, nextBtn);
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

	    // Give the browser a paint with the entry state applied first, or the
	    // transition can be skipped and the image will appear without sliding.
	    requestAnimationFrame(() => {
	      if (token !== animationToken) return;
	      void nextImg.offsetWidth;
	      requestAnimationFrame(() => {
	        if (token !== animationToken) return;
	        outgoingImg.classList.remove("is-active");
	        outgoingImg.classList.add(direction > 0 ? "is-exit-to-next" : "is-exit-to-prev");
	        nextImg.classList.remove("is-enter-from-next", "is-enter-from-prev");
	        nextImg.classList.add("is-active");
	      });
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
		    counter.textContent = `Image ${currentIndex + 1} of ${currentList.length}`;
		    metaTitle.textContent = item.title || "Untitled";

    const bits = [item.series || null, item.year || null, item.featured ? "Featured" : null]
      .filter(Boolean)
      .join(" | ");
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
        const hasMultiple = currentList.length > 1;
        prevBtn.style.display = hasMultiple ? "inline-flex" : "none";
        nextBtn.style.display = hasMultiple ? "inline-flex" : "none";
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
	  let wheelLock = false;
	  panel.addEventListener("wheel", (e) => {
	    if (backdrop.style.display !== "flex") return;
	    if (wheelLock) {
	      e.preventDefault();
	      return;
	    }
	    const deltaY = Number(e.deltaY || 0);
	    if (Math.abs(deltaY) < 18) return;
	    e.preventDefault();
	    wheelLock = true;
	    if (deltaY > 0) next();
	    else prev();
	    window.setTimeout(() => {
	      wheelLock = false;
	    }, 220);
	  }, { passive: false });

	  document.addEventListener("keydown", (e) => {
	    if (backdrop.style.display !== "flex") return;
	    if (e.key === "Escape") close();
	    if (e.key === "ArrowRight") next();
	    if (e.key === "ArrowLeft") prev();
	  });

		  return { host: backdrop, open, close, next, prev };
	}



