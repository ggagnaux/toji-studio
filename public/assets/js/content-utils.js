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
      padding: 24px;
    }
    [data-theme="light"] .lb-backdrop{ background: rgba(0,0,0,.55); }
    .lb{
      width:min(1100px, 96vw);
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
    }
    .lb-media{
      background: rgba(255,255,255,.03);
      display:flex; align-items:center; justify-content:center;
      min-height: 56vh;
    }
    .lb-media img{
      width:100%;
      height:100%;
      max-height: 76vh;
      object-fit: contain;
      background: var(--bg);
    }
    .lb-meta{
      padding:14px;
      border-left:1px solid var(--line);
    }
    .lb-meta .sub{ margin-top:8px; }
    .lb-actions{ display:flex; gap:8px; flex-wrap:wrap; }
    .lb-actions .btn{ padding:8px 10px; font-size:13px; }
    @media (max-width: 920px){
      .lb-body{ grid-template-columns: 1fr; }
      .lb-meta{ border-left:0; border-top:1px solid var(--line); }
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
  const img = el("img", { alt: "" });
  const media = el("div", { class: "lb-media" }, img);
  const metaTitle = el("div", { style: "font-weight:650" }, "");
  const metaSub = el("div", { class: "sub" }, "");
  const metaDesc = el("div", { class: "sub", style: "font-size:15px; line-height:1.65" }, "");
  const meta = el("div", { class: "lb-meta" }, metaTitle, metaSub, el("hr", { class: "sep" }), metaDesc);
  const body = el("div", { class: "lb-body" }, media, meta);
  const panel = el("div", { class: "lb" }, top, body);

  backdrop.appendChild(panel);

  let currentList = [];
  let currentIndex = -1;
  let lastActive = null;

  function showCurrent() {
    if (!currentList.length || currentIndex < 0 || currentIndex >= currentList.length) return;
    const item = currentList[currentIndex];
    title.textContent = item.title || "Untitled";
    metaTitle.textContent = item.title || "Untitled";

    const bits = [item.series || null, item.year || null, item.featured ? "Featured" : null]
      .filter(Boolean)
      .join(" • ");
    metaSub.textContent = bits || "";
    metaDesc.textContent = item.description || "";

    img.src = item.image || item.thumb || "";
    img.alt = item.alt || item.title || "Artwork";
    backdrop.style.display = "flex";
  }

  function open(list, idx = 0) {
    if (!Array.isArray(list) || !list.length) return;
    lastActive = document.activeElement;
    currentList = list;
    currentIndex = Math.max(0, Math.min(list.length - 1, Number(idx) || 0));
    showCurrent();
    closeBtn.focus();
  }

  function close() {
    backdrop.style.display = "none";
    if (lastActive && typeof lastActive.focus === "function") lastActive.focus();
  }

  function next() {
    if (!currentList.length) return;
    currentIndex = (currentIndex + 1) % currentList.length;
    showCurrent();
  }

  function prev() {
    if (!currentList.length) return;
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    showCurrent();
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
