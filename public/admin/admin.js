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
