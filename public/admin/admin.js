import { initThemeSystem, initStickyHero } from "../assets/js/site.js";
import { qs, el, slugifySeries } from "../assets/js/content-utils.js";
import { renderPublicFooter } from "../assets/js/footer.js";
import { renderPublicHeader } from "../assets/js/header.js";
import { buildAdminLoginRedirect } from "./js/session-utils.js";

const ADMIN_SESSION_KEY = "toji_admin_session_v1";
const ADMIN_JUST_LOGGED_IN_KEY = "toji_admin_just_logged_in_v1";
export const ADMIN_PASSWORD_KEY = "toji_admin_login_password_v1";
export const ADMIN_DEFAULT_PASSWORD = "toji-admin";
const ADMIN_NAV_GROUPS = Object.freeze([
  Object.freeze([
    { href: "index.html", label: "Image Manager" },
    { href: "upload.html", label: "Upload" },
    { href: "series.html", label: "Series Manager" }
  ]),
  Object.freeze([
    { href: "linkmanager.html", label: "Link Manager" },
    { href: "HomePageManager.html", label: "Homepage Manager" }
  ]),
  Object.freeze([
    { href: "SocialMediaManager.html", label: "Social Media Manager" },
    { href: "SocialQueue.html", label: "Social Queue" }
  ]),
  Object.freeze([
    { href: "OtherSettings.html", label: "Other Settings" }
  ]),
  Object.freeze([
    { href: "DataManager.html", label: "Data Manager" },
    { href: "SecurityManager.html", label: "Security Manager" }
  ])
]);
// GVG
// const ADMIN_QUICK_NAV_ITEMS = Object.freeze([
//   { href: "index.html", label: "Admin Home" },
//   { href: "SocialMediaManager.html", label: "Social Media Manager" },
//   { href: "SocialQueue.html", label: "Bluesky Queue" },
//   { href: "DataManager.html", label: "Data Manager" }
// ]);

function normalizeAdminPathname(pathname) {
  return String(pathname || "").replace(/\\/g, "/").toLowerCase();
}

function isActiveAdminHref(href) {
  const current = normalizeAdminPathname(window.location.pathname || "");
  return current.endsWith("/admin/" + String(href || "").toLowerCase());
}

function renderAdminSidebarNav() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  const extra = sidebar.querySelector("[data-admin-sidebar-extra]");
  const preservedExtra = extra ? extra.cloneNode(true) : null;
  sidebar.innerHTML = "";
  ADMIN_NAV_GROUPS.forEach((group, groupIndex) => {
    group.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href;
      link.textContent = item.label;
      if (isActiveAdminHref(item.href)) link.classList.add("active");
      sidebar.appendChild(link);
    });
    if (groupIndex < ADMIN_NAV_GROUPS.length - 1) {
      const sep = document.createElement("hr");
      sep.className = "sep";
      sidebar.appendChild(sep);
    }
  });
  if (preservedExtra) {
    const sep = document.createElement("hr");
    sep.className = "sep";
    sidebar.appendChild(sep);
    sidebar.appendChild(preservedExtra);
  }
}

function getActiveAdminNavGroup() {
  return (
    ADMIN_NAV_GROUPS.find((group) => group.some((item) => isActiveAdminHref(item.href))) ||
    ADMIN_NAV_GROUPS[0]
  );
}

function renderAdminTopToolbar() {
  const mainHost = document.querySelector("main.container");
  if (!mainHost) return;

  document.querySelector("[data-admin-page-toolbar]")?.remove();

  const toolbar = document.createElement("section");
  toolbar.className = "page-toolbar admin-page-toolbar";
  toolbar.setAttribute("data-admin-page-toolbar", "");
  toolbar.setAttribute("aria-label", "Studio section tools");

  const shell = document.createElement("div");
  shell.className = "container page-toolbar__shell";

  const left = document.createElement("div");
  left.className = "page-toolbar__left";
  getActiveAdminNavGroup().forEach((item) => {
    const link = document.createElement("a");
    link.className = "page-toolbar__pill";
    link.href = item.href;
    link.textContent = item.label;
    if (isActiveAdminHref(item.href)) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
    left.appendChild(link);
  });

  const right = document.createElement("div");
  right.className = "page-toolbar__right";

  const themeGroup = document.createElement("div");
  themeGroup.className = "segmented page-toolbar__theme";
  themeGroup.setAttribute("role", "group");
  themeGroup.setAttribute("aria-label", "Theme mode");
  [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ].forEach(([choice, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-theme-choice", choice);
    btn.textContent = label;
    const activeChoice = String(document.documentElement.dataset.themeMode || "system").toLowerCase();
    const isActive = choice === activeChoice;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    themeGroup.appendChild(btn);
  });
  right.appendChild(themeGroup);

  shell.append(left, right);
  toolbar.appendChild(shell);
  mainHost.before(toolbar);
}

// GVG
// function renderAdminQuickNav() {
//   const host = document.querySelector("[data-admin-quicknav]");
//   if (!host) return;
//   host.innerHTML = "";
//   ADMIN_QUICK_NAV_ITEMS.forEach((item) => {
//     const link = document.createElement("a");
//     link.className = "btn mini";
//     link.href = item.href;
//     link.textContent = item.label;
//     if (isActiveAdminHref(item.href)) link.classList.add("active");
//     host.appendChild(link);
//   });
// }

function enforceAdminSession() {
  if (typeof window === "undefined") return;
  const path = String(window.location.pathname || "").toLowerCase();
  if (!path.includes("/admin/")) return;
  if (path.endsWith("/admin/login.html")) return;
  if (window.__tojiAdminSessionBootstrapPromise) return;
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") return;

  window.location.replace(
    buildAdminLoginRedirect(window.location.pathname, window.location.search, window.location.hash)
  );
}

export function setAdminSessionAuthenticated(value = true) {
  if (typeof window === "undefined") return;
  if (value) sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminSessionAuthenticated() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function clearAdminSession() {
  setAdminSessionAuthenticated(false);
}

export function getExpectedAdminPassword() {
  if (typeof window === "undefined") return ADMIN_DEFAULT_PASSWORD;
  const saved = localStorage.getItem(ADMIN_PASSWORD_KEY);
  return String(saved || ADMIN_DEFAULT_PASSWORD);
}

export function setAdminPassword(nextPassword) {
  if (typeof window === "undefined") return;
  const value = String(nextPassword || "").trim();
  if (!value) {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
    return;
  }
  localStorage.setItem(ADMIN_PASSWORD_KEY, value);
}

enforceAdminSession();
initThemeSystem();

export { qs, el, slugifySeries };

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
  document.body.classList.add("admin-shell");

  const mainHost = document.querySelector("main.container");
  if (mainHost) mainHost.classList.add("page-with-sticky-hero");

  const hero = document.querySelector("main.container .hero");
  const dashboardControls = document.querySelector(".dashboard-controls");
  if (hero) {
    hero.classList.add("hero--sticky");
    initStickyHero({ heroSelector: "main.container .hero--sticky" });
  }

  const siteHeader = document.getElementById("siteHeader");
  let syncAdminHeaderHeight = null;
  let syncAdminStickyOffsets = null;
  if (siteHeader) {
    renderPublicHeader({
      active: "studio",
      linkPrefix: "../",
      studioHref: "admin/index.html",
      assetPrefix: "../assets/",
      showThemeControls: false
    });
    renderAdminTopToolbar();
    const adminToolbar = document.querySelector("[data-admin-page-toolbar]");

    syncAdminHeaderHeight = () => {
      const h = Math.ceil(siteHeader.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty("--admin-header-height", `${h || 84}px`);
    };
    syncAdminStickyOffsets = () => {
      const headerHeight = siteHeader.getBoundingClientRect().height || 0;
      const toolbarHeight = adminToolbar?.getBoundingClientRect().height || 0;
      const compactGap = (window.scrollY || 0) > 8 ? 8 : 0;
      const stickyTop = headerHeight + toolbarHeight + compactGap;
      document.documentElement.style.setProperty("--admin-sidebar-top", `${stickyTop}px`);
      document.documentElement.style.setProperty("--admin-table-head-top", `${stickyTop}px`);
    };
    syncAdminHeaderHeight();
    syncAdminStickyOffsets();
    window.addEventListener("resize", syncAdminHeaderHeight, { passive: true });
    window.addEventListener("scroll", syncAdminHeaderHeight, { passive: true });
    window.addEventListener("resize", syncAdminStickyOffsets, { passive: true });
    window.addEventListener("scroll", syncAdminStickyOffsets, { passive: true });
    if (dashboardControls && typeof ResizeObserver !== "undefined") {
      const controlsResizeObserver = new ResizeObserver(() => syncAdminStickyOffsets?.());
      controlsResizeObserver.observe(dashboardControls);
    }
    if (adminToolbar && typeof ResizeObserver !== "undefined") {
      const toolbarResizeObserver = new ResizeObserver(() => {
        syncAdminHeaderHeight?.();
        syncAdminStickyOffsets?.();
      });
      toolbarResizeObserver.observe(adminToolbar);
    }
  }

  const siteFooter = document.getElementById("siteFooter");
  if (siteFooter) {
    // Keep admin footer anchored to the page container, not a shifted grid column.
    const mainHost = document.querySelector("main.container");
    if (mainHost && siteFooter.parentElement !== mainHost) {
      mainHost.appendChild(siteFooter);
    }
    renderPublicFooter({
      rightHtml: `<a href="../index.html">Home</a> &bull; <a href="../gallery.html">Gallery</a> &bull; <a href="../series.html">Series</a> &bull; <a href="../contact.html">Contact</a> &bull; <a href="index.html" class="active" aria-current="page">Studio</a>`
    });
    siteFooter.classList.add("footer--full-bleed");

    // Keep top and bottom nav active states aligned.
    if (siteHeader) {
      const activeFooterLink = siteFooter.querySelector(".row a[aria-current='page'], .row a.active");
      const activePath = activeFooterLink ? new URL(activeFooterLink.href, window.location.href).pathname : "";
      const currentPath = String(window.location.pathname || "");
      const isAdminPath = currentPath.toLowerCase().includes("/admin/");
      siteHeader.querySelectorAll(".navlinks a[data-nav]").forEach((a) => {
        const linkPath = new URL(a.href, window.location.href).pathname;
        const isStudioLink = a.getAttribute("data-nav") === "studio";
        const isActive = isStudioLink ? isAdminPath : (!!activePath && linkPath === activePath);
        a.classList.toggle("active", isActive);
        if (isActive) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      syncAdminHeaderHeight?.();
      syncAdminStickyOffsets?.();
    }
    return;
  }
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
}

export function ensureBaseStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .admin-page-toolbar{
      position:sticky;
      top:var(--admin-header-height, 84px);
      z-index:24;
      margin:0;
      padding:0;
      background:transparent;
      border-bottom:0;
      backdrop-filter:none;
    }
    .admin-page-toolbar .page-toolbar__pill{
      text-decoration:none;
      white-space:nowrap;
    }
    .admin-layout{ display:grid; grid-template-columns: 216px 1fr; gap:16px; }
    .admin-layout > section{ min-width:0; }
    .sidebar{
      position:sticky;
      top:var(--admin-sidebar-top, 84px);
      align-self:start;
      width:216px;
      max-width:216px;
      border:1px solid var(--line);
      border-radius: var(--radius);
      padding:14px;
      background: var(--panel);
      overflow:visible;
    }
    .dashboard-controls{
      position:relative;
      top:auto;
      align-self:start;
      z-index:22;
      margin-bottom:16px;
      margin-top:16px;
      padding:10px;
      padding-bottom: 0;
      border:1px solid var(--line);
      border-radius:16px;
      /*background:color-mix(in srgb, var(--bg) 72%, #020307 28%);*/
      background: var(--panel);
      isolation:isolate;
    }
    .sidebar a{ display:block; padding:5px 10px; border-radius:12px; color:var(--muted); border:1px solid transparent; }
    .sidebar a.active{ color:var(--text); border-color: var(--accent-border); background: var(--accent-soft); }
    .sidebar .logout-btn{
      width: 100%;
      margin-top: 6px;
    }
    .sidebar .logout-btn.logout-btn--pulse{
      border-color: color-mix(in srgb, var(--accent) 72%, var(--line));
      color: var(--text);
      background: color-mix(in srgb, var(--accent) 20%, var(--panel));
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 38%, transparent);
      animation: adminLogoutPulse 1s ease-in-out infinite;
    }
    .kpi{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
    .kpi .card{ box-shadow:none; background:var(--panel); }
    .kpi .meta{ padding:8px 12px 9px; }
    .kpi b{ font-size:22px; display:block; margin-top:2px; line-height:1.05; }
    .dashboard-controls .filters{ background:var(--panel); }
    .table-scroll-shell{
      position:relative;
      width:100%;
      max-width:100%;
      height:calc(100dvh - var(--admin-sidebar-top, 84px) - 32px);
      min-height:420px;
      overflow-y:auto;
      overflow-x:auto;
      border:1px solid var(--line);
      border-radius:14px;
      background:var(--panel);
    }
    .table-scroll-shell .admin-thumb-grid{
      min-height:100%;
      align-content:start;
      padding:5x;
      margin-top:0;
    }
    .table{ width:100%; min-width:100%; border-collapse: separate; border-spacing:0; overflow:visible; border-radius:0; border:0; }
    .table th, .table td{ padding:10px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }
    .table th{
      color:var(--muted);
      font-weight:600;
      font-size:18px;
      position:sticky;
      top:0;
      z-index:21;
      background:var(--bg);
    }
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
    .pill{
      border:1px solid var(--chip-border);
      border-radius:999px;
      padding:7px 10px;
      color:var(--text);
      background: var(--chip-bg);
    }
	    .admin-toast-stack{
	      position: fixed;
	      left: 50%;
	      top: 16px;
	      transform: translateX(-50%);
	      display: grid;
	      gap: 10px;
	      width: min(92vw, 420px);
      z-index: 9999;
      pointer-events: none;
    }
    .admin-toast{
      pointer-events: auto;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: color-mix(in srgb, var(--panel) 96%, transparent);
      color: var(--text);
      box-shadow: 0 14px 36px rgba(0,0,0,.18);
      padding: 12px;
      display: grid;
      gap: 10px;
      opacity: 0;
      transform: translateY(8px);
      animation: adminToastIn .18s ease-out forwards;
      backdrop-filter: blur(10px);
    }
    .admin-toast--success{ border-color: color-mix(in srgb, #2ea97d 45%, var(--line)); }
    .admin-toast--warn{ border-color: color-mix(in srgb, #e0aa3c 55%, var(--line)); }
    .admin-toast--error{ border-color: color-mix(in srgb, #d15353 60%, var(--line)); animation: adminToastIn .18s ease-out forwards, adminToastErrorPulse .9s ease-in-out 3; }
    .admin-toast__messages{
      display:grid;
      gap:8px;
    }
    .admin-toast__entry{
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-line;
    }
    .admin-toast__entry + .admin-toast__entry{
      padding-top:8px;
      border-top:1px solid color-mix(in srgb, var(--line) 82%, transparent);
    }
    .admin-toast__entry--success{ color: color-mix(in srgb, var(--text) 88%, #2ea97d 12%); }
    .admin-toast__entry--warn{ color: color-mix(in srgb, var(--text) 82%, #e0aa3c 18%); }
    .admin-toast__entry--error{ color: color-mix(in srgb, var(--text) 78%, #d15353 22%); }
    .admin-toast__actions{
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .admin-toast__countdown{
      margin-right: auto;
      color: var(--muted);
      font-size: 11px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      align-self: center;
    }
    .admin-toast__btn{
      border-radius: 10px;
      border: 1px solid var(--line);
      background: transparent;
      color: var(--text);
      font: inherit;
      padding: 6px 10px;
      cursor: pointer;
    }
    .admin-toast__btn:hover{
      border-color: var(--accent-border);
      background: var(--accent-soft);
    }
    .admin-toast__btn--primary{
      border-color: var(--accent-border);
      background: var(--accent-soft);
    }
    .admin-toast.is-closing{
      animation: adminToastOut .14s ease-in forwards;
    }
    .admin-confirm-backdrop{
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.42);
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 16px;
    }
    .admin-confirm{
      width: min(92vw, 480px);
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--panel);
      color: var(--text);
      box-shadow: 0 20px 46px rgba(0,0,0,.28);
      padding: 16px;
      display: grid;
      gap: 14px;
    }
    .admin-confirm--warn{ border-color: color-mix(in srgb, #e0aa3c 55%, var(--line)); }
    .admin-confirm--error{ border-color: color-mix(in srgb, #d15353 60%, var(--line)); }
    .admin-confirm__msg{
      margin: 0;
      white-space: pre-line;
      line-height: 1.55;
      font-size: 15px;
    }
    .admin-confirm__note{
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, #e0aa3c 58%, var(--line));
      background: color-mix(in srgb, #e0aa3c 18%, var(--panel));
      color: var(--text);
      font-size: 14px;
      line-height: 1.45;
      font-weight: 700;
    }
    .admin-confirm__actions{
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .admin-confirm__btn{
      border-radius: 10px;
      border: 1px solid var(--line);
      background: transparent;
      color: var(--text);
      font: inherit;
      padding: 7px 11px;
      cursor: pointer;
    }
    .admin-confirm__btn:hover{
      border-color: var(--accent-border);
      background: var(--accent-soft);
    }
	    .admin-confirm__btn--primary{
	      border-color: var(--accent-border);
	      background: var(--accent-soft);
	    }
	    .admin-confirm__btn--danger{
	      border-color: rgba(255,80,80,.35);
	      background: rgba(255,80,80,.12);
	      color: #ffd6d6;
	    }
	    .admin-confirm__btn--danger:hover{
	      border-color: rgba(255,80,80,.52);
	      background: rgba(255,80,80,.2);
	    }
    @keyframes adminToastIn{
      from{ opacity:0; transform:translateY(8px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes adminLogoutPulse{
      0%{
        background: color-mix(in srgb, var(--accent) 18%, var(--panel));
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 38%, transparent);
      }
      50%{
        background: color-mix(in srgb, var(--accent) 34%, var(--panel));
      }
      70%{
        box-shadow: 0 0 0 12px color-mix(in srgb, var(--accent) 0%, transparent);
      }
      100%{
        background: color-mix(in srgb, var(--accent) 18%, var(--panel));
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
      }
    }
    @keyframes adminToastOut{
      from{ opacity:1; transform:translateY(0); }
      to{ opacity:0; transform:translateY(8px); }
    }
    @keyframes adminToastErrorPulse{
      0%, 100%{
        border-color: color-mix(in srgb, #d15353 60%, var(--line));
        background: color-mix(in srgb, var(--panel) 96%, transparent);
        box-shadow: 0 14px 36px rgba(0,0,0,.18);
      }
      50%{
        border-color: #ff8a3d;
        background: color-mix(in srgb, var(--panel) 72%, #5a1111 28%);
        box-shadow: 0 0 0 2px rgba(255,138,61,.55), 0 14px 36px rgba(0,0,0,.18);
      }
    }
    .sep{ border:0; border-top:1px solid var(--line); margin:8px 0; }
    @media (max-width: 920px){
      .admin-layout{ grid-template-columns: 1fr; }
      .sidebar, .dashboard-controls{ position:relative; top:auto; width:auto; max-width:none; }
      .table-scroll-shell{ height:auto; min-height:0; }
      .kpi{ grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
  initAdminNavMenu();
  initAdminSidebarControls();
}

let toastHost = null;
let activeToastState = null;
const TOAST_MESSAGE_LIMIT = 6;
const TOAST_TONE_PRIORITY = Object.freeze({
  info: 0,
  success: 1,
  warn: 2,
  error: 3
});

function ensureToastHost() {
  if (toastHost && document.body.contains(toastHost)) return toastHost;
  toastHost = document.querySelector(".admin-toast-stack");
  if (toastHost) return toastHost;

  toastHost = document.createElement("div");
  toastHost.className = "admin-toast-stack";
  toastHost.setAttribute("aria-live", "polite");
  toastHost.setAttribute("aria-atomic", "false");
  document.body.appendChild(toastHost);
  return toastHost;
}

function normalizeToastTone(tone) {
  const value = String(tone || "info").toLowerCase();
  return Object.prototype.hasOwnProperty.call(TOAST_TONE_PRIORITY, value) ? value : "info";
}

function resolveToastDuration(duration) {
  if (duration === 0) return 0;
  const parsed = Number(duration);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
}

function toneDisablesAutoClose(tone) {
  return tone === "warn" || tone === "error";
}

function getHigherPriorityTone(left, right) {
  const a = normalizeToastTone(left);
  const b = normalizeToastTone(right);
  return TOAST_TONE_PRIORITY[b] > TOAST_TONE_PRIORITY[a] ? b : a;
}

function stopToastTimers(state) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function setToastTone(state, tone) {
  const resolved = normalizeToastTone(tone);
  state.tone = resolved;
  state.toast.classList.remove("admin-toast--info", "admin-toast--success", "admin-toast--warn", "admin-toast--error");
  if (resolved !== "info") state.toast.classList.add(`admin-toast--${resolved}`);
}

function trimToastMessages(state) {
  while (state.messages.childElementCount > TOAST_MESSAGE_LIMIT) {
    state.messages.firstElementChild?.remove();
  }
}

function renderToastActions(state) {
  state.bar.innerHTML = "";
  const showCountdown = !state.autoCloseDisabled && state.duration > 0;
  if (showCountdown) {
    const countdown = document.createElement("span");
    countdown.className = "admin-toast__countdown";
    state.countdownEl = countdown;
    state.bar.appendChild(countdown);
  } else {
    state.countdownEl = null;
  }

  const actions = [...state.actions];
  if (state.dismissible || state.autoCloseDisabled) {
    actions.push({ label: "Close", variant: "ghost", value: null });
  }

  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `admin-toast__btn${action.variant === "primary" ? " admin-toast__btn--primary" : ""}`;
    btn.textContent = action.label || "OK";
    btn.addEventListener("click", () => {
      action.onClick?.();
      state.close(action.value);
    });
    state.bar.appendChild(btn);
  }

  state.bar.style.display = state.bar.childElementCount ? "flex" : "none";
}

function startToastTimer(state) {
  stopToastTimers(state);
  if (state.autoCloseDisabled || state.duration <= 0 || !state.countdownEl) return;

  state.timerStartedAt = Date.now();
  const updateCountdown = () => {
    if (!state.countdownEl) return;
    const elapsed = Date.now() - state.timerStartedAt;
    const remaining = Math.max(0, state.duration - elapsed);
    state.countdownEl.textContent = `Auto close in ${Math.ceil(remaining / 1000)}s`;
  };

  updateCountdown();
  state.countdownTimer = window.setInterval(updateCountdown, 200);
  state.timer = window.setTimeout(() => state.close("timeout"), state.duration);
}

function ensureActiveToastState() {
  if (activeToastState && document.body.contains(activeToastState.toast) && !activeToastState.done) {
    return activeToastState;
  }

  const host = ensureToastHost();
  const toast = document.createElement("article");
  toast.className = "admin-toast";
  toast.setAttribute("role", "status");

  const messages = document.createElement("div");
  messages.className = "admin-toast__messages";
  toast.appendChild(messages);

  const bar = document.createElement("div");
  bar.className = "admin-toast__actions";
  toast.appendChild(bar);

  host.appendChild(toast);

  const state = {
    toast,
    messages,
    bar,
    countdownEl: null,
    timer: null,
    countdownTimer: null,
    timerStartedAt: 0,
    done: false,
    tone: "info",
    duration: 3000,
    autoCloseDisabled: false,
    dismissible: true,
    actions: [],
    onCloseCallbacks: [],
    close(reason = null) {
      if (state.done) return;
      state.done = true;
      stopToastTimers(state);
      state.toast.classList.add("is-closing");
      window.setTimeout(() => {
        state.toast.remove();
        const callbacks = state.onCloseCallbacks.slice();
        activeToastState = activeToastState === state ? null : activeToastState;
        callbacks.forEach((fn) => fn?.(reason));
      }, 140);
    }
  };

  activeToastState = state;
  return state;
}

export function showToast(message, opts = {}) {
  const {
    tone = "info",
    duration = 2600,
    dismissible = true,
    actions = [],
    onClose
  } = opts;

  const state = ensureActiveToastState();
  const resolvedTone = normalizeToastTone(tone);
  const resolvedDuration = resolveToastDuration(duration);

  const entry = document.createElement("p");
  entry.className = `admin-toast__entry admin-toast__entry--${resolvedTone}`;
  entry.textContent = String(message || "");
  state.messages.appendChild(entry);
  trimToastMessages(state);

  state.tone = getHigherPriorityTone(state.tone, resolvedTone);
  setToastTone(state, state.tone);

  state.duration = resolvedDuration;
  state.actions = Array.isArray(actions) ? actions.slice() : [];
  state.dismissible = dismissible !== false;
  state.autoCloseDisabled = state.autoCloseDisabled || resolvedDuration === 0 || toneDisablesAutoClose(resolvedTone);
  if (typeof onClose === "function") state.onCloseCallbacks.push(onClose);

  renderToastActions(state);
  startToastTimer(state);

  return state.close;
}

export function confirmToast(message, opts = {}) {
  const {
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "warn",
    highlightText = "",
    destructive = false
  } = opts;

  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "admin-confirm-backdrop";

    const modal = document.createElement("div");
    modal.className = `admin-confirm admin-confirm--${tone}`;
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Confirmation");

    const msg = document.createElement("p");
    msg.className = "admin-confirm__msg";
    msg.textContent = String(message || "");
    if (highlightText) {
      const note = document.createElement("div");
      note.className = "admin-confirm__note";
      note.textContent = String(highlightText);
      msg.appendChild(note);
    }

    const actions = document.createElement("div");
    actions.className = "admin-confirm__actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-confirm__btn";
    cancelBtn.textContent = cancelLabel;

    const destructiveConfirm = destructive || /delete|remove|reset|cleanup|replace|unbind|destroy/i.test(String(confirmLabel || ""));

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = `admin-confirm__btn ${destructiveConfirm ? "admin-confirm__btn--danger" : "admin-confirm__btn--primary"}`;
    confirmBtn.textContent = confirmLabel;

    actions.append(cancelBtn, confirmBtn);
    modal.append(msg, actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let settled = false;
    const cleanup = () => {
      document.body.style.overflow = previousOverflow;
      backdrop.remove();
      document.removeEventListener("keydown", onKeyDown);
    };
    const settle = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(!!value);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        settle(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) settle(false);
    });
    cancelBtn.addEventListener("click", () => settle(false));
    confirmBtn.addEventListener("click", () => settle(true));

    confirmBtn.focus();
  });
}

function initAdminNavMenu() {
  const navRoot = document.querySelector(".header .nav");
  const navLinks = navRoot?.querySelector(".navlinks");
  if (!navRoot || !navLinks) return;
  if (navRoot.dataset.navMenuReady === "1") return;
  navRoot.dataset.navMenuReady = "1";

  navLinks.id ||= "adminPrimaryNav";

  let navToggle = navRoot.querySelector("[data-nav-toggle]");
  if (!navToggle) {
    navToggle = document.createElement("button");
    navToggle.type = "button";
    navToggle.className = "icon-btn nav-toggle";
    navToggle.setAttribute("aria-label", "Toggle navigation menu");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-controls", navLinks.id);
    navToggle.setAttribute("data-nav-toggle", "");

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "☰";
    navToggle.appendChild(icon);

    navRoot.insertBefore(navToggle, navLinks);
  }

  const mobileQuery = window.matchMedia("(max-width: 760px)");

  const setMenuOpen = (open) => {
    navRoot.classList.toggle("nav-open", !!open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (navToggle.firstElementChild) navToggle.firstElementChild.textContent = open ? "✕" : "☰";
    navLinks.setAttribute("aria-hidden", open ? "false" : "true");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) setMenuOpen(false);
    });
  });

  const onModeChange = (e) => {
    if (!e.matches) {
      navRoot.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      if (navToggle.firstElementChild) navToggle.firstElementChild.textContent = "☰";
      navLinks.removeAttribute("aria-hidden");
      return;
    }
    setMenuOpen(false);
  };

  mobileQuery.addEventListener("change", onModeChange);

  if (mobileQuery.matches) setMenuOpen(false);
  else navLinks.removeAttribute("aria-hidden");
}

function initAdminSidebarControls() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) {
    // GVG
    //renderAdminQuickNav();
    return;
  }

  renderAdminSidebarNav();
  // GVG
  //renderAdminQuickNav();
  if (sidebar.querySelector("[data-admin-logout]")) return;

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "btn logout-btn";
  logoutBtn.setAttribute("data-admin-logout", "1");
  logoutBtn.textContent = "Log out";
  logoutBtn.addEventListener("click", async () => {
    await logoutAdminSession();
    window.location.href = "login.html";
  });

  const logoutSep = document.createElement("hr");
  logoutSep.className = "sep";
  sidebar.appendChild(logoutSep);
  sidebar.appendChild(logoutBtn);

  const path = String(window.location.pathname || "").toLowerCase();
  const shouldHighlightLogout =
    path.endsWith("/admin/index.html") &&
    sessionStorage.getItem(ADMIN_JUST_LOGGED_IN_KEY) === "1";

  if (shouldHighlightLogout) {
    sessionStorage.removeItem(ADMIN_JUST_LOGGED_IN_KEY);
    logoutBtn.classList.add("logout-btn--pulse");
    window.setTimeout(() => {
      logoutBtn.classList.remove("logout-btn--pulse");
    }, 10000);
  }
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

export function ensureSeriesMeta(state, options = {}){
  const includeDerived = options.includeDerived !== false;
  state.seriesMeta ||= {};
  const normalized = {};

  const ingest = (key, row, fallbackName = "") => {
    const slug = slugifySeries((row && row.slug) || (row && row.name) || key || fallbackName);
    if (!slug) return;

    const prior = normalized[slug] || {};
    const name =
      String((row && row.name) || prior.name || fallbackName || key || slug).trim() || slug;

    normalized[slug] = {
      slug,
      name,
      description: String((row && row.description) || prior.description || ""),
      sortOrder: Number(
        row?.sortOrder ?? prior.sortOrder ?? 0
      ),
      isPublic:
        row?.isPublic != null
          ? !!row.isPublic
          : (prior.isPublic != null ? !!prior.isPublic : true),
      coverArtworkId: String((row && row.coverArtworkId) || prior.coverArtworkId || ""),
      imageOrder: Array.isArray(row?.imageOrder) ? row.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : (Array.isArray(prior.imageOrder) ? prior.imageOrder : []),
      coverThumb: (row && row.coverThumb) || prior.coverThumb || ""
    };
  };

  for (const [key, row] of Object.entries(state.seriesMeta || {})) {
    ingest(key, row);
  }

  if (includeDerived) {
    (state.series || []).forEach((name) => ingest("", null, name));
    (state.artworks || []).forEach((a) => {
      if (a && a.series) ingest("", null, String(a.series));
    });
  }

  state.seriesMeta = normalized;
}









// --------------------
// API helpers (local-first)
// --------------------

// Same-origin by default; localStorage override is kept for local/dev edge cases.
function resolveApiBase() {
  const override = String(localStorage.getItem("toji_api_base") || "").trim().replace(/\/+$/, "");
  if (override) return override;

  const origin = String(window.location.origin || "").replace(/\/+$/, "");
  if (!origin) return "";

  try {
    const current = new URL(origin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(current.hostname);
    if (isLocalHost && current.port && current.port !== "5179") {
      return `${current.protocol}//${current.hostname}:5179`;
    }
  } catch {}

  return origin;
}

export const API_BASE = resolveApiBase();

const SESSION_SENTINEL_TOKEN = "__session__";

export function getAdminToken() {
  return isAdminSessionAuthenticated() ? SESSION_SENTINEL_TOKEN : "";
}

export function setAdminToken() {
  return "";
}

export async function logoutAdminSession() {
  try {
    await fetch(`${API_BASE}/api/admin/session/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch {}
  clearAdminSession();
}

export async function apiFetch(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  console.log("[apiFetch] start", url, opts);

  const headers = {
    ...(opts.headers || {})
  };
  const hasBody = opts.body != null;
  const contentTypeKey = Object.keys(headers).find((key) => key.toLowerCase() === "content-type");
  if (hasBody && !contentTypeKey && typeof opts.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers
  });

  console.log("[apiFetch] response", res.status, res.statusText);

  const text = await res.text();
  console.log("[apiFetch] body", text.slice(0, 500));

  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    if (res.status === 401) clearAdminSession();
    throw new Error(json?.error || `${res.status} ${res.statusText}`);
  }
  return json;
}








// Loads local state immediately, then (if token exists) syncs from backend.
// Use this in Studio pages instead of loadState().
export async function loadStateAutoSync() {
  const state = await loadState();

  // No token => keep local-only UX (useful offline)
  if (!getAdminToken()) return state;

  try {
    await syncFromBackend(state); // this should also call syncSeriesFromBackend inside it (as we set up)
  } catch (e) {
    // Silent-ish fallback: keep local cache if backend is unavailable
    // (Optionally log)
    console.warn("Auto-sync failed; using local cache.", e);
  }

  return state;
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

  // Treat backend series as authoritative when a token is present.
  // This prevents deleted series from persisting in local cache.
  const rebuiltSeriesMeta = {};
  const rebuiltSeriesNames = [];

  for (const r of (rows || [])) {
    const slug = r.slug;
    rebuiltSeriesMeta[slug] = {
      slug,
      name: r.name,
      description: r.description || "",
      sortOrder: Number(r.sortOrder || 0),
      isPublic: !!r.isPublic,
      coverArtworkId: r.coverArtworkId || "",
      coverThumb: normalize(r.coverThumb),
      imageOrder: Array.isArray(r.imageOrder) ? r.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
    };

    // Keep a convenient display list too (names)
    if (r.name && !rebuiltSeriesNames.includes(r.name)) rebuiltSeriesNames.push(r.name);
  }

  // Preserve artwork-attached series labels as convenience values.
  for (const a of (state.artworks || [])) {
    const name = String(a?.series || "").trim();
    if (!name) continue;
    if (!rebuiltSeriesNames.includes(name)) rebuiltSeriesNames.push(name);
  }

  state.seriesMeta = rebuiltSeriesMeta;
  state.series = rebuiltSeriesNames;

  saveState(state);
  return rows;
}


export async function deleteArtworkFromBackend(id){
  return apiFetch(`/api/admin/artworks/${encodeURIComponent(id)}`, { method: "DELETE" });
}










