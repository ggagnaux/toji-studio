import { initThemeSystem } from "../assets/js/site.js";

initThemeSystem();

const STORAGE_KEY = "toji_admin_state_v1";
const DATA_URL = "../assets/data/admin.sample.json";

export async function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  saveState(json);
  return json;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "style") n.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) n.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

export function formatStatus(s) {
  if (s === "published") return "Published";
  if (s === "draft") return "Draft";
  if (s === "hidden") return "Hidden";
  return s;
}

export function statusChip(status) {
  const base = "chip";
  const extra = status === "published" ? " active" : "";
  return el("span", { class: base + extra }, formatStatus(status));
}

export function setYearFooter() {
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
}

export function ensureBaseStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .admin-layout{ display:grid; grid-template-columns: 240px 1fr; gap:16px; }
    .sidebar{ position:sticky; top:84px; align-self:start; border:1px solid var(--line); border-radius: var(--radius); padding:14px; background: var(--panel); }
    .sidebar a{ display:block; padding:10px 10px; border-radius:12px; color:var(--muted); border:1px solid transparent; }
    .sidebar a.active{ color:var(--text); border-color: var(--line); background: rgba(138,167,255,.08); }
    [data-theme="light"] .sidebar a.active{ background: rgba(47,91,255,.08); }
    .kpi{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
    .kpi .card{ box-shadow:none; }
    .kpi .meta{ padding:12px; }
    .kpi b{ font-size:22px; display:block; margin-top:4px; }
    .table{ width:100%; border-collapse: collapse; overflow:hidden; border-radius: 14px; border:1px solid var(--line); }
    .table th, .table td{ padding:10px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }
    .table th{ color:var(--muted); font-weight:600; font-size:13px; }
    .row-actions{ display:flex; gap:8px; flex-wrap:wrap; }
    .mini{ padding:8px 10px; font-size:13px; }
    .thumbSm{ width:56px; height:44px; border-radius:10px; overflow:hidden; border:1px solid var(--line); background: rgba(255,255,255,.03); }
    .thumbSm img{ width:100%; height:100%; object-fit:cover; }
    .field input, .field textarea, .field select{
      width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--line);
      background: transparent; color: var(--text);
    }
    .field textarea{ min-height: 120px; resize: vertical; }
    .field .sub{ margin-bottom:6px; }
    .pillrow{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .pill{ border:1px solid var(--line); border-radius:999px; padding:7px 10px; color:var(--muted); }
    .sep{ border:0; border-top:1px solid var(--line); margin:14px 0; }
    @media (max-width: 920px){ .admin-layout{ grid-template-columns: 1fr; } .sidebar{ position:relative; top:auto; } .kpi{ grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

export function upsertTag(state, tagName) {
  const t = tagName.trim().toLowerCase();
  if (!t) return;
  if (!state.tags.includes(t)) state.tags.push(t);
  state.tags.sort();
}

export function uniqueId(prefix = "a") {
  return `${prefix}${Math.random().toString(16).slice(2, 8)}`;
}

/* ---- Ordering helpers ---- */
export function getSortKey(a){
  const so = Number(a.sortOrder || 0);
  const date = a.publishedAt || a.createdAt || "";
  return { so, date };
}

export function sortArtworksManualFirst(items){
  return items.slice().sort((a,b) => {
    const A = getSortKey(a), B = getSortKey(b);
    if (B.so !== A.so) return B.so - A.so;
    return (B.date || "").localeCompare(A.date || "");
  });
}

export function ensureSeriesMeta(state){
  state.seriesMeta ||= {};
  (state.series || []).forEach(s => {
    state.seriesMeta[s] ||= { description: "", sortOrder: 0 };
  });
}









// --------------------
// API helpers (local-first)
// --------------------

// Local dev default. For same-origin deployment later, set to "".
export const API_BASE = localStorage.getItem("toji_api_base") || "http://localhost:5179";

const TOKEN_KEY = "toji_admin_token_v1";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, String(token || "").trim());
}

export async function apiFetch(path, options = {}) {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Don't set Content-Type for FormData; browser will set boundary.
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  // Handle empty responses safely
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}











// --------------------
// Backend sync helpers
// --------------------

function mergeById(existing, incoming) {
  const map = new Map((existing || []).map(a => [a.id, a]));
  for (const a of (incoming || [])) map.set(a.id, a);
  return Array.from(map.values());
}

export async function syncFromBackend(state) {
  // Fetch all artworks from backend and merge into local state cache
  const rows = await apiFetch("/api/admin/artworks", { method: "GET" });

  // Ensure media URLs are usable when front-end is on a different origin
  const normalize = (p) => {
    if (!p) return p;
    if (p.startsWith("http")) return p;
    if (p.startsWith("/")) return `${API_BASE}${p}`;
    return p;
  };

  const normalized = (rows || []).map(a => ({
    ...a,
    featured: !!a.featured,
    tags: Array.isArray(a.tags) ? a.tags : (typeof a.tags === "string" ? safeJson(a.tags, []) : []),
    thumb: normalize(a.thumb),
    image: normalize(a.image)
  }));

  state.artworks = mergeById(state.artworks || [], normalized);

  // Optional: rebuild tags list from artworks if your state keeps one
  // (If you already have helper functions for tags/series, keep using them.)
  // Here’s a safe minimal:
  state.tags = state.tags || [];
  for (const a of state.artworks) {
    for (const t of (a.tags || [])) {
      if (!state.tags.includes(t)) state.tags.push(t);
    }
  }

  state.series = state.series || [];
  for (const a of state.artworks) {
    if (a.series && !state.series.includes(a.series)) state.series.push(a.series);
  }

  await syncSeriesFromBackend(state);

  saveState(state);
  return state.artworks;
}

export async function patchArtworkToBackend(id, patch) {
  // patch: {title, year, series, description, alt, tags, status, featured, sortOrder}
  const updated = await apiFetch(`/api/admin/artworks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch || {})
  });

  // normalize media
  const normalize = (p) => {
    if (!p) return p;
    if (p.startsWith("http")) return p;
    if (p.startsWith("/")) return `${API_BASE}${p}`;
    return p;
  };

  updated.thumb = normalize(updated.thumb);
  updated.image = normalize(updated.image);
  updated.featured = !!updated.featured;
  if (!Array.isArray(updated.tags)) updated.tags = safeJson(updated.tags, []);

  return updated;
}

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}










export function slugifySeries(name){
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function apiGetSeries(){
  return apiFetch("/api/admin/series", { method:"GET" });
}

export async function apiUpsertSeries(slug, payload){
  return apiFetch(`/api/admin/series/${encodeURIComponent(slug)}`, {
    method:"PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
}

export async function apiDeleteSeries(slug){
  return apiFetch(`/api/admin/series/${encodeURIComponent(slug)}`, { method:"DELETE" });
}

// Extend your existing syncFromBackend(state) to also sync series meta
// Add this inside syncFromBackend after artworks merge:
export async function syncSeriesFromBackend(state){
  const rows = await apiGetSeries();

  const normalize = (p) => {
    if (!p) return p;
    if (p.startsWith("http")) return p;
    if (p.startsWith("/")) return `${API_BASE}${p}`;
    return p;
  };

  state.seriesMeta = state.seriesMeta || {};
  state.series = state.series || [];

  for (const r of (rows || [])) {
    const slug = r.slug;
    state.seriesMeta[slug] = {
      slug,
      name: r.name,
      description: r.description || "",
      sortOrder: Number(r.sortOrder || 0),
      isPublic: !!r.isPublic,
      coverArtworkId: r.coverArtworkId || "",
      coverThumb: normalize(r.coverThumb)
    };

    // Keep a convenient display list too (names)
    if (r.name && !state.series.includes(r.name)) state.series.push(r.name);
  }

  saveState(state);
  return rows;
}
