import { initThemeSystem, initStickyHero } from "../assets/js/site.js";
import { qs, el, slugifySeries } from "../assets/js/content-utils.js";
import { renderPublicFooter } from "../assets/js/footer.js";
import { renderPublicHeader } from "../assets/js/header.js";
import { buildAdminLoginRedirect } from "./js/session-utils.js";

const ADMIN_SESSION_KEY = "toji_admin_session_v1";
const ADMIN_JUST_LOGGED_IN_KEY = "toji_admin_just_logged_in_v1";
export const ADMIN_PASSWORD_KEY = "toji_admin_login_password_v1";
export const ADMIN_DEFAULT_PASSWORD = "toji-admin";
const ADMIN_NAV_ITEMS = Object.freeze([
  { href: "index.html", label: "Image Manager" },
  { href: "upload.html", label: "Upload" },
  { href: "series.html", label: "Series Manager" },
  { href: "linkmanager.html", label: "Link Manager" },
  { href: "HomePageManager.html", label: "Home Page Manager" },
  { href: "SocialMediaManager.html", label: "Social Media Manager" },
  { href: "SocialQueue.html", label: "Social Media Queue" },
  { href: "DataManager.html", label: "Data Manager" },
  { href: "OtherSettings.html", label: "Other Settings" },
  { href: "SecurityManager.html", label: "Security Manager" }
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
  ADMIN_NAV_ITEMS.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (isActiveAdminHref(item.href)) link.classList.add("active");
    sidebar.appendChild(link);
  });
  if (preservedExtra) {
    const sep = document.createElement("hr");
    sep.className = "sep";
    sidebar.appendChild(sep);
    sidebar.appendChild(preservedExtra);
  }
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
      assetPrefix: "../assets/"
    });

    syncAdminHeaderHeight = () => {
      const h = Math.ceil(siteHeader.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty("--admin-header-height", `${h || 84}px`);
    };
    syncAdminStickyOffsets = () => {
      const headerHeight = siteHeader.getBoundingClientRect().height || 0;
      const heroHeight = hero?.getBoundingClientRect().height || 0;
      const compactGap = (window.scrollY || 0) > 8 ? 8 : 0;
      const stickyTop = headerHeight + heroHeight + compactGap;
      document.documentElement.style.setProperty("--admin-sidebar-top", `${stickyTop}px`);
      document.documentElement.style.setProperty("--admin-table-head-top", `${stickyTop}px`);
    };
    syncAdminHeaderHeight();
    syncAdminStickyOffsets();
    window.addEventListener("resize", syncAdminHeaderHeight, { passive: true });
    window.addEventListener("resize", syncAdminStickyOffsets, { passive: true });
    window.addEventListener("scroll", syncAdminStickyOffsets, { passive: true });
    if (dashboardControls && typeof ResizeObserver !== "undefined") {
      const controlsResizeObserver = new ResizeObserver(() => syncAdminStickyOffsets?.());
      controlsResizeObserver.observe(dashboardControls);
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
      siteHeader.querySelectorAll(".navlinks a[data-nav]").forEach((a) => {
        const linkPath = new URL(a.href, window.location.href).pathname;
        const isActive = !!activePath && linkPath === activePath;
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
    .admin-layout{ display:grid; grid-template-columns: 240px 1fr; gap:16px; }
    .sidebar{ position:sticky; top:var(--admin-sidebar-top, 84px); align-self:start; border:1px solid var(--line); border-radius: var(--radius); padding:14px; background: var(--panel); }
    .dashboard-controls{
      position:relative;
      top:auto;
      align-self:start;
      z-index:22;
      margin-bottom:16px;
      padding-bottom:12px;
      background:var(--bg);
      isolation:isolate;
    }
    .sidebar a{ display:block; padding:10px 10px; border-radius:12px; color:var(--muted); border:1px solid transparent; }
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
    .dashboard-controls .filters{ background:var(--bg); }
    .table-scroll-shell{
      position:relative;
      height:calc(100dvh - var(--admin-sidebar-top, 84px) - 32px);
      min-height:420px;
      overflow-y:auto;
      overflow-x:auto;
      scrollbar-gutter:stable both-edges;
      border:1px solid var(--line);
      border-radius:14px;
      background:var(--bg);
    }
    .table-scroll-shell .admin-thumb-grid{
      min-height:100%;
      align-content:start;
      padding:12px;
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
    .admin-toast--error{ border-color: color-mix(in srgb, #d15353 60%, var(--line)); }
    .admin-toast__msg{
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-line;
    }
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
    .sep{ border:0; border-top:1px solid var(--line); margin:14px 0; }
    @media (max-width: 920px){ .admin-layout{ grid-template-columns: 1fr; } .sidebar, .dashboard-controls{ position:relative; top:auto; } .table-scroll-shell{ height:auto; min-height:0; } .kpi{ grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
  initAdminNavMenu();
  initAdminSidebarControls();
}

let toastHost = null;

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

export function showToast(message, opts = {}) {
  const {
    tone = "info",
    duration = 2600,
    dismissible = true,
    actions = [],
    onClose
  } = opts;
  const resolvedDuration = duration === 0 ? 0 : 3000;

  const host = ensureToastHost();
  const toast = document.createElement("article");
  toast.className = `admin-toast admin-toast--${tone}`;
  toast.setAttribute("role", "status");

  const msg = document.createElement("p");
  msg.className = "admin-toast__msg";
  msg.textContent = String(message || "");
  toast.appendChild(msg);

  let bar = null;
  if (actions.length || dismissible || resolvedDuration > 0) {
    bar = document.createElement("div");
    bar.className = "admin-toast__actions";

    const allActions = [...actions];
    if (dismissible) {
      allActions.push({ label: "Close", variant: "ghost", value: null });
    }

    for (const action of allActions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `admin-toast__btn${action.variant === "primary" ? " admin-toast__btn--primary" : ""}`;
      btn.textContent = action.label || "OK";
      btn.addEventListener("click", () => {
        action.onClick?.();
        close(action.value);
      });
      bar.appendChild(btn);
    }
    toast.appendChild(bar);
  }

  host.appendChild(toast);

  let done = false;
  let timer = null;
  let countdownTimer = null;

  if (resolvedDuration > 0 && bar) {
    const countdown = document.createElement("span");
    countdown.className = "admin-toast__countdown";
    bar.prepend(countdown);

    const startedAt = Date.now();
    const updateCountdown = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, resolvedDuration - elapsed);
      countdown.textContent = `Auto close in ${Math.ceil(remaining / 1000)}s`;
    };
    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 200);
  }

  const close = (reason = null) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    if (countdownTimer) clearInterval(countdownTimer);
    toast.classList.add("is-closing");
    window.setTimeout(() => {
      toast.remove();
      onClose?.(reason);
    }, 140);
  };

  if (resolvedDuration > 0) timer = window.setTimeout(() => close("timeout"), resolvedDuration);
  return close;
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










