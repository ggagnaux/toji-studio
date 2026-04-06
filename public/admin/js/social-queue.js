import { ensureBaseStyles, setYearFooter, showToast, apiFetch, API_BASE } from "../admin.js";
import { bindFloatingField, syncFloatingFieldState } from "../../assets/js/floating-fields.js";

ensureBaseStyles();
setYearFooter();

const queueList = document.getElementById("queueList");
const queueSummary = document.getElementById("queueSummary");
const queueSearch = document.getElementById("queueSearch");
const queueSort = document.getElementById("queueSort");
const queueSortField = document.getElementById("queueSortField");
const queuePlatform = document.getElementById("queuePlatform");
const queuePlatformField = document.getElementById("queuePlatformField");
const refreshQueueBtn = document.getElementById("refreshQueueBtn");
const kQueued = document.getElementById("kQueued");
const kFailed = document.getElementById("kFailed");
const kPosted = document.getElementById("kPosted");
const queuePageTitle = document.getElementById("queuePageTitle");
const queuePageIntro = document.getElementById("queuePageIntro");
const queueCardTitle = document.getElementById("queueCardTitle");

const state = {
  rows: [],
  platformId: "bluesky",
  statusFilter: "all",
  search: "",
  sort: "updated_desc"
};

const PLATFORM_META = Object.freeze({
  bluesky: {
    name: "Bluesky",
    intro: "Track queued, failed, posted, and draft Bluesky posts from one admin view."
  },
  linkedin: {
    name: "LinkedIn",
    intro: "Track queued, failed, posted, and draft LinkedIn posts from one admin view."
  }
});

function getActivePlatformMeta() {
  return PLATFORM_META[String(state.platformId || "").trim().toLowerCase()] || {
    name: "Social",
    intro: "Track queued, failed, posted, and draft social posts from one admin view."
  };
}

function syncPlatformUi() {
  const meta = getActivePlatformMeta();
  document.title = `Studio - ${meta.name} Queue`;
  if (queuePageTitle) queuePageTitle.textContent = `${meta.name} Queue`;
  if (queuePageIntro) queuePageIntro.textContent = meta.intro;
  if (queueCardTitle) queueCardTitle.textContent = `${meta.name} post queue`;
  if (queuePlatform) {
    queuePlatform.value = String(state.platformId || "bluesky");
    syncFloatingFieldState(queuePlatformField, queuePlatform);
  }
}

function ensureQueueStyles() {
  if (document.getElementById("social-queue-styles")) return;
  const style = document.createElement("style");
  style.id = "social-queue-styles";
  style.textContent = `
    .social-queue-grid{
      display:grid;
      gap:12px;
    }
    .dashboard-controls .filters{
      min-height:58px;
      align-items:flex-start;
      overflow-anchor:none;
    }
    .dashboard-controls .filters .chip{
      align-self:center;
    }
    .social-queue-card{
      border:1px solid var(--line);
      border-radius:14px;
      padding:14px;
      background:color-mix(in srgb, var(--panel) 96%, transparent);
      display:grid;
      gap:10px;
    }
    .social-queue-card.is-queued{
      border-color:color-mix(in srgb, #2a97d4 48%, var(--line));
      background:color-mix(in srgb, #2a97d4 8%, var(--panel));
    }
    .social-queue-card.is-failed{
      border-color:color-mix(in srgb, #d15353 52%, var(--line));
      background:color-mix(in srgb, #d15353 8%, var(--panel));
    }
    .social-queue-card.is-posted{
      border-color:color-mix(in srgb, #2ea97d 52%, var(--line));
      background:color-mix(in srgb, #2ea97d 8%, var(--panel));
    }
    .social-queue-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
    }
    .social-queue-headmain{
      display:flex;
      gap:12px;
      align-items:flex-start;
      min-width:0;
      flex:1 1 auto;
    }
    .social-queue-thumb{
      width:72px;
      height:72px;
      border-radius:12px;
      border:1px solid var(--line);
      overflow:hidden;
      background:color-mix(in srgb, var(--panel) 88%, transparent);
      flex:0 0 auto;
      display:grid;
      place-items:center;
    }
    .social-queue-thumb img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }
    .social-queue-title{
      display:grid;
      gap:4px;
      min-width:0;
    }
    .social-queue-title strong{
      font-size:16px;
      line-height:1.3;
    }
    .social-queue-meta{
      display:grid;
      gap:6px;
    }
    .social-queue-actions{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      align-items:center;
    }
    .social-queue-pillrow{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      align-items:center;
    }
    .social-queue-link{
      color:var(--accent);
      word-break:break-all;
    }
    .social-queue-empty{
      border:1px dashed var(--line);
      border-radius:14px;
      padding:18px;
      color:var(--muted);
      text-align:center;
    }
    @media (max-width: 720px){
      .social-queue-headmain{
        width:100%;
      }
      .social-queue-thumb{
        width:60px;
        height:60px;
      }
    }
  `;
  document.head.appendChild(style);
}
ensureQueueStyles();
bindFloatingField(queuePlatformField, queuePlatform);
bindFloatingField(queueSortField, queueSort);

function fmtDate(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString();
}

function resolveMediaUrl(raw) {
  const value = String(raw || "").trim().replace(/\\/g, "/");
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("/media/")) return `${API_BASE}${value}`;
  if (value.startsWith("media/")) return `${API_BASE}/${value}`;
  if (!value.startsWith("/")) return `${API_BASE}/media/${value}`;
  return value;
}
function getStatusTone(status) {
  const key = String(status || "").trim().toLowerCase();
  if (key === "queued") return "is-queued";
  if (key === "failed") return "is-failed";
  if (key === "posted") return "is-posted";
  return "";
}

async function copyText(text, label) {
  try {
    if (!navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable.");
    await navigator.clipboard.writeText(String(text || ""));
    showToast(`${label} copied.`, { tone: "success", duration: 2500 });
  } catch (err) {
    showToast(`Copy failed: ${err?.message || err}`, { tone: "error" });
  }
}

function sortRows(rows) {
  const list = rows.slice();
  const rank = (status) => ({ queued: 0, failed: 1, draft: 2, posted: 3, skipped: 4 }[String(status || "").toLowerCase()] ?? 99);
  list.sort((a, b) => {
    if (state.sort === "posted_desc") {
      return String(b.postedAt || b.updatedAt || "").localeCompare(String(a.postedAt || a.updatedAt || ""));
    }
    if (state.sort === "status_priority") {
      return rank(a.status) - rank(b.status) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }
    if (state.sort === "title_asc") {
      return String(a.artworkTitle || "").localeCompare(String(b.artworkTitle || ""));
    }
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
  return list;
}

function applyFilters(rows) {
  const query = String(state.search || "").trim().toLowerCase();
  return sortRows(rows.filter((row) => {
    if (state.statusFilter !== "all" && row.status !== state.statusFilter) return false;
    if (!query) return true;
    const haystack = [
      row.artworkTitle,
      row.artworkId,
      row.artworkStatus,
      row.externalPostId,
      row.postUrl,
      row.errorMessage,
      row.caption
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }));
}

function updateKpis(rows) {
  const countBy = (status) => rows.filter((row) => row.status === status).length;
  if (kQueued) kQueued.textContent = String(countBy("queued"));
  if (kFailed) kFailed.textContent = String(countBy("failed"));
  if (kPosted) kPosted.textContent = String(countBy("posted"));
}

function renderRows() {
  const filtered = applyFilters(state.rows);
  const meta = getActivePlatformMeta();
  if (queueSummary) {
    queueSummary.textContent = `${filtered.length} visible of ${state.rows.length} ${meta.name} post${state.rows.length === 1 ? "" : "s"}`;
  }

  queueList.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "social-queue-empty";
    empty.textContent = state.rows.length
      ? "No posts match the current filters."
      : `No ${meta.name} posts yet. Bind ${meta.name} to an artwork to start tracking posts.`;
    queueList.appendChild(empty);
    return;
  }

  const host = document.createElement("div");
  host.className = "social-queue-grid";

  filtered.forEach((row) => {
    const card = document.createElement("article");
    card.className = `social-queue-card ${getStatusTone(row.status)}`.trim();

    const title = document.createElement("div");
    title.className = "social-queue-title";
    title.append(
      Object.assign(document.createElement("strong"), { textContent: row.artworkTitle || "Untitled" }),
      Object.assign(document.createElement("div"), { className: "sub", textContent: `Artwork ID: ${row.artworkId || "-"}` }),
      Object.assign(document.createElement("div"), { className: "sub", textContent: `Artwork status: ${row.artworkStatus || "-"}` })
    );

    const headMain = document.createElement("div");
    headMain.className = "social-queue-headmain";
    const thumbWrap = document.createElement("div");
    thumbWrap.className = "social-queue-thumb";
    const thumbSrc = resolveMediaUrl(row.artworkThumb || row.artworkImage || "");
    if (thumbSrc) {
      const thumbImg = document.createElement("img");
      thumbImg.src = thumbSrc;
      thumbImg.alt = row.artworkTitle || "Artwork thumbnail";
      thumbImg.loading = "lazy";
      thumbWrap.appendChild(thumbImg);
    } else {
      thumbWrap.appendChild(Object.assign(document.createElement("div"), {
        className: "sub",
        textContent: "No thumb",
        style: "padding:8px; text-align:center;"
      }));
    }
    headMain.append(thumbWrap, title);

    const pills = document.createElement("div");
    pills.className = "social-queue-pillrow";
    pills.append(
      Object.assign(document.createElement("span"), { className: "pill", textContent: `Status: ${row.status || "draft"}` }),
      Object.assign(document.createElement("span"), { className: "pill", textContent: `Updated: ${fmtDate(row.updatedAt)}` })
    );
    if (row.postedAt) {
      pills.append(Object.assign(document.createElement("span"), { className: "pill", textContent: `Posted: ${fmtDate(row.postedAt)}` }));
    }

    const head = document.createElement("div");
    head.className = "social-queue-head";
    head.append(headMain, pills);

    const meta = document.createElement("div");
    meta.className = "social-queue-meta sub";
    if (row.externalPostId) {
      meta.append(Object.assign(document.createElement("div"), { textContent: `External ID: ${row.externalPostId}` }));
    }
    if (row.postUrl) {
      const linkWrap = document.createElement("div");
      linkWrap.append("Live post: ");
      const link = document.createElement("a");
      link.className = "social-queue-link";
      link.href = row.postUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = row.postUrl;
      linkWrap.appendChild(link);
      meta.append(linkWrap);
    }
    if (row.errorMessage) {
      meta.append(Object.assign(document.createElement("div"), { textContent: `Error: ${row.errorMessage}` }));
    }
    if (!row.externalPostId && !row.postUrl && !row.errorMessage) {
      meta.append(Object.assign(document.createElement("div"), { textContent: "No live post metadata saved yet." }));
    }

    const actions = document.createElement("div");
    actions.className = "social-queue-actions";

    const editLink = document.createElement("a");
    editLink.className = "btn mini";
    editLink.href = `edit.html?id=${encodeURIComponent(row.artworkId || "")}`;
    editLink.textContent = "Open edit";
    actions.appendChild(editLink);

    if (row.postUrl) {
      const openPostLink = document.createElement("a");
      openPostLink.className = "btn mini";
      openPostLink.href = row.postUrl;
      openPostLink.target = "_blank";
      openPostLink.rel = "noopener noreferrer";
      openPostLink.textContent = "Open post";
      actions.appendChild(openPostLink);

      const copyUrlBtn = document.createElement("button");
      copyUrlBtn.type = "button";
      copyUrlBtn.className = "btn mini";
      copyUrlBtn.textContent = "Copy URL";
      copyUrlBtn.addEventListener("click", () => copyText(row.postUrl, "Post URL"));
      actions.appendChild(copyUrlBtn);
    }

    if (row.externalPostId) {
      const copyIdBtn = document.createElement("button");
      copyIdBtn.type = "button";
      copyIdBtn.className = "btn mini";
      copyIdBtn.textContent = "Copy ID";
      copyIdBtn.addEventListener("click", () => copyText(row.externalPostId, "External ID"));
      actions.appendChild(copyIdBtn);
    }

    card.append(head, meta, actions);
    host.appendChild(card);
  });

  queueList.appendChild(host);
}

function syncFilterChips() {
  document.querySelectorAll("[data-status-filter]").forEach((chip) => {
    chip.classList.toggle("active", chip.getAttribute("data-status-filter") === state.statusFilter);
  });
}

async function loadQueue() {
  queueList.innerHTML = "";
  queueSummary.textContent = "Loading...";
  syncPlatformUi();
  const meta = getActivePlatformMeta();
  try {
    const rows = await apiFetch(`/api/admin/social/posts?platformId=${encodeURIComponent(state.platformId)}&enabledOnly=1`, { method: "GET" });
    state.rows = Array.isArray(rows) ? rows : [];
    updateKpis(state.rows);
    renderRows();
  } catch (err) {
    queueSummary.textContent = `Failed to load ${meta.name} posts.`;
    showToast(`Failed to load ${meta.name} queue: ${err?.message || err}`, { tone: "error" });
  }
}

document.querySelectorAll("[data-status-filter]").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.statusFilter = chip.getAttribute("data-status-filter") || "all";
    syncFilterChips();
    renderRows();
  });
});

queueSearch?.addEventListener("input", (event) => {
  state.search = String(event.target?.value || "");
  renderRows();
});

queueSort?.addEventListener("change", (event) => {
  state.sort = String(event.target?.value || "updated_desc");
  renderRows();
});

queuePlatform?.addEventListener("change", (event) => {
  state.platformId = String(event.target?.value || "bluesky").trim().toLowerCase() || "bluesky";
  loadQueue();
});

refreshQueueBtn?.addEventListener("click", () => {
  loadQueue();
});

syncFilterChips();
syncPlatformUi();
loadQueue();

