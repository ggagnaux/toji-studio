import { renderPublicHeader } from "./header.js";
import { bindFloatingFields } from "./floating-fields.js";
import { renderPublicFooter } from "./footer.js";
import { initStickyHero } from "./site.js";
import { qs, el } from "./content-utils.js";

renderPublicHeader({
  active: "contact",
  small: "contact",
  ctaText: "View Gallery",
  ctaHref: "gallery.html",
  showThemeControls: false
});

renderPublicFooter({
  rightHtml: `<a href="index.html">Home</a> &bull; <a href="gallery.html">Gallery</a> &bull; <a href="series.html">Series</a> &bull; <a href="about.html">About</a> &bull; <a href="admin/index.html">Studio</a>`
});

initStickyHero();

const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
const FALLBACK_URL = "assets/data/admin.sample.json";

function resolvePublicApiBase() {
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

const PUBLIC_API_BASE = resolvePublicApiBase();

async function loadSiteSettings() {
  const defaults = { contactEmail: "you@example.com" };
  const fromState = (data) => {
    const settings = data && typeof data === "object" ? (data.settings || {}) : {};
    return {
      contactEmail: String(settings.contactEmail || defaults.contactEmail)
    };
  };

  try {
    const res = await fetch(`${PUBLIC_API_BASE}/api/public/settings/contact`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    return {
      contactEmail: String(json?.contactEmail || defaults.contactEmail)
    };
  } catch {}

  const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (saved) {
    try {
      return fromState(JSON.parse(saved));
    } catch {}
  }

  try {
    const res = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return fromState(await res.json());
  } catch {
    return defaults;
  }
}
async function loadExternalLinks() {
  try {
    const res = await fetch(`${PUBLIC_API_BASE}/api/public/external-links`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    try {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const settings = parsed && typeof parsed === "object" ? (parsed.settings || {}) : {};
        return Array.isArray(settings.externalLinks) ? settings.externalLinks : [];
      }
    } catch {}
    return [];
  }
}

const settings = await loadSiteSettings();
const externalLinks = await loadExternalLinks();
const TO_EMAIL = settings.contactEmail;
const emailEl = document.getElementById("contactEmail");
const socialLinksEl = document.getElementById("socialLinks");

if (emailEl) {
  emailEl.textContent = TO_EMAIL;
}

function sanitizeLinks(links) {
  const seen = new Set();
  return (Array.isArray(links) ? links : [])
    .map((link) => ({
      label: String(link?.label || "").trim(),
      url: String(link?.url || "").trim(),
      enabled: link?.enabled == null ? true : !!link.enabled
    }))
    .filter((link) => {
      if (!link.enabled || !link.label || !link.url) return false;
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(link.url)) return false;
      const key = `${link.label.toLowerCase()}|${link.url.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderSocialLinks(links) {
  if (!socialLinksEl) return;
  socialLinksEl.innerHTML = "";

  const list = sanitizeLinks(links);
  if (!list.length) {
    socialLinksEl.appendChild(el("span", { class: "sub" }, "No links published yet."));
    return;
  }

  list.forEach((item) => {
    socialLinksEl.appendChild(el("a", {
      href: item.url,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${item.label} link`,
      title: item.label,
      class: "btn"
    }, item.label));
  });
}

renderSocialLinks(externalLinks);

const form = document.getElementById("contactForm");
const draftBox = document.getElementById("draftBox");
const draftPre = document.getElementById("draft");

const nameEl = document.getElementById("name");
const fromEl = document.getElementById("email");
const topicEl = document.getElementById("topic");
const linksEl = document.getElementById("links");
const msgEl = document.getElementById("message");
const floatingFields = Array.from(document.querySelectorAll(".contact-floating-field"));

function syncFloatingFieldState(control) {
  const wrapper = control.closest(".contact-floating-field");
  if (!wrapper) return;
  wrapper.classList.toggle("has-value", !!control.value.trim());
}

floatingFields.forEach((field) => {
  const control = field.querySelector("input, textarea");
  if (!control) return;
  syncFloatingFieldState(control);
  control.addEventListener("input", () => syncFloatingFieldState(control));
  control.addEventListener("change", () => syncFloatingFieldState(control));
  control.addEventListener("blur", () => syncFloatingFieldState(control));
});

let contactToastHost = null;
let activeContactToastState = null;
const CONTACT_TOAST_MESSAGE_LIMIT = 6;
const CONTACT_TOAST_TONE_PRIORITY = Object.freeze({
  info: 0,
  success: 1,
  warn: 2,
  error: 3
});

function ensureToastHost() {
  if (contactToastHost && document.body.contains(contactToastHost)) return contactToastHost;
  let host = document.querySelector(".contact-toast-stack");
  if (host) {
    contactToastHost = host;
    return host;
  }

  const style = document.createElement("style");
  style.textContent = `
    .contact-toast-stack{
      position:fixed;
      left:50%;
      top:16px;
      transform:translateX(-50%);
      display:grid;
      gap:10px;
      width:min(92vw,420px);
      z-index:9999;
      pointer-events:none;
    }
    .contact-toast{
      pointer-events:auto;
      border:1px solid color-mix(in srgb, var(--line, rgba(255,255,255,.22)) 75%, #ffffff 25%);
      border-radius:14px;
      background:color-mix(in srgb, var(--panel, rgba(14,18,28,.94)) 96%, transparent);
      color:var(--text, #f8f7f4);
      box-shadow:0 14px 36px rgba(0,0,0,.2);
      padding:12px;
      display:grid;
      gap:10px;
      line-height:1.4;
    }
    .contact-toast--success{ border-color: color-mix(in srgb, #2ea97d 45%, rgba(255,255,255,.22)); }
    .contact-toast--warn{ border-color: color-mix(in srgb, #e0aa3c 55%, rgba(255,255,255,.22)); }
    .contact-toast--error{ border-color: color-mix(in srgb, #d15353 60%, rgba(255,255,255,.22)); animation: contactToastErrorPulse .9s ease-in-out 3; }
    .contact-toast__messages{
      display:grid;
      gap:8px;
    }
    .contact-toast__entry{
      margin:0;
      white-space:pre-line;
    }
    .contact-toast__entry + .contact-toast__entry{
      padding-top:8px;
      border-top:1px solid color-mix(in srgb, var(--line, rgba(255,255,255,.22)) 82%, transparent);
    }
    .contact-toast__entry--success{ color: color-mix(in srgb, var(--text, #f8f7f4) 88%, #2ea97d 12%); }
    .contact-toast__entry--warn{ color: color-mix(in srgb, var(--text, #f8f7f4) 82%, #e0aa3c 18%); }
    .contact-toast__entry--error{ color: color-mix(in srgb, var(--text, #f8f7f4) 78%, #d15353 22%); }
    .contact-toast__actions{
      display:flex;
      gap:8px;
      justify-content:flex-end;
      flex-wrap:wrap;
    }
    .contact-toast__countdown{
      margin-right:auto;
      font-size:11px;
      line-height:1.2;
      letter-spacing:.01em;
      color:color-mix(in srgb, var(--muted, #bcc4d6) 80%, transparent);
      align-self:center;
      font-variant-numeric:tabular-nums;
    }
    .contact-toast__btn{
      border-radius:10px;
      border:1px solid color-mix(in srgb, var(--line, rgba(255,255,255,.22)) 80%, transparent);
      background:transparent;
      color:var(--text, #f8f7f4);
      font:inherit;
      padding:6px 10px;
      cursor:pointer;
    }
    .contact-toast__btn:hover{
      background:color-mix(in srgb, var(--panel, rgba(14,18,28,.94)) 78%, rgba(255,255,255,.08));
    }
    .contact-toast.is-closing{
      opacity:0;
      transform:translateY(8px);
      transition:opacity .14s ease, transform .14s ease;
    }
    @keyframes contactToastErrorPulse{
      0%, 100%{
        border-color: color-mix(in srgb, #d15353 60%, rgba(255,255,255,.22));
        background:color-mix(in srgb, var(--panel, rgba(14,18,28,.94)) 96%, transparent);
        box-shadow:0 14px 36px rgba(0,0,0,.2);
      }
      50%{
        border-color:#ff8a3d;
        background:color-mix(in srgb, var(--panel, rgba(14,18,28,.94)) 72%, #5a1111 28%);
        box-shadow:0 0 0 2px rgba(255,138,61,.55), 0 14px 36px rgba(0,0,0,.2);
      }
    }
  `;
  document.head.appendChild(style);

  host = document.createElement("div");
  host.className = "contact-toast-stack";
  host.setAttribute("aria-live", "polite");
  document.body.appendChild(host);
  contactToastHost = host;
  return host;
}

function normalizeContactToastTone(tone) {
  const value = String(tone || "info").toLowerCase();
  return Object.prototype.hasOwnProperty.call(CONTACT_TOAST_TONE_PRIORITY, value) ? value : "info";
}

function resolveContactToastDuration(duration) {
  if (duration === 0) return 0;
  const parsed = Number(duration);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
}

function contactToneDisablesAutoClose(tone) {
  return tone === "warn" || tone === "error";
}

function getHigherPriorityContactTone(left, right) {
  const a = normalizeContactToastTone(left);
  const b = normalizeContactToastTone(right);
  return CONTACT_TOAST_TONE_PRIORITY[b] > CONTACT_TOAST_TONE_PRIORITY[a] ? b : a;
}

function stopContactToastTimers(state) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function setContactToastTone(state, tone) {
  const resolved = normalizeContactToastTone(tone);
  state.tone = resolved;
  state.toast.classList.remove("contact-toast--info", "contact-toast--success", "contact-toast--warn", "contact-toast--error");
  if (resolved !== "info") state.toast.classList.add(`contact-toast--${resolved}`);
}

function trimContactToastMessages(state) {
  while (state.messages.childElementCount > CONTACT_TOAST_MESSAGE_LIMIT) {
    state.messages.firstElementChild?.remove();
  }
}

function renderContactToastActions(state) {
  state.bar.innerHTML = "";
  const showCountdown = !state.autoCloseDisabled && state.duration > 0;
  if (showCountdown) {
    const countdown = document.createElement("span");
    countdown.className = "contact-toast__countdown";
    state.countdownEl = countdown;
    state.bar.appendChild(countdown);
  } else {
    state.countdownEl = null;
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "contact-toast__btn";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => state.close("manual"));
  state.bar.appendChild(closeBtn);
}

function startContactToastTimer(state) {
  stopContactToastTimers(state);
  if (state.autoCloseDisabled || state.duration <= 0 || !state.countdownEl) return;

  state.timerStartedAt = Date.now();
  const updateCountdown = () => {
    if (!state.countdownEl) return;
    const remaining = Math.max(0, state.duration - (Date.now() - state.timerStartedAt));
    state.countdownEl.textContent = `Auto close in ${Math.ceil(remaining / 1000)}s`;
  };

  updateCountdown();
  state.countdownTimer = window.setInterval(updateCountdown, 200);
  state.timer = window.setTimeout(() => state.close("timeout"), state.duration);
}

function ensureActiveContactToastState() {
  if (activeContactToastState && document.body.contains(activeContactToastState.toast) && !activeContactToastState.done) {
    return activeContactToastState;
  }

  const host = ensureToastHost();
  const toast = document.createElement("article");
  toast.className = "contact-toast";
  toast.setAttribute("role", "status");

  const messages = document.createElement("div");
  messages.className = "contact-toast__messages";
  toast.appendChild(messages);

  const bar = document.createElement("div");
  bar.className = "contact-toast__actions";
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
    close(reason = null) {
      if (state.done) return;
      state.done = true;
      stopContactToastTimers(state);
      state.toast.classList.add("is-closing");
      window.setTimeout(() => {
        state.toast.remove();
        if (activeContactToastState === state) activeContactToastState = null;
      }, 140);
    }
  };

  activeContactToastState = state;
  return state;
}

function setStatus(msg, opts = {}) {
  if (!msg) return;
  const state = ensureActiveContactToastState();
  const resolvedTone = normalizeContactToastTone(opts.tone || "info");
  const resolvedDuration = resolveContactToastDuration(opts.duration);

  const entry = document.createElement("p");
  entry.className = `contact-toast__entry contact-toast__entry--${resolvedTone}`;
  entry.textContent = String(msg);
  state.messages.appendChild(entry);
  trimContactToastMessages(state);

  state.tone = getHigherPriorityContactTone(state.tone, resolvedTone);
  setContactToastTone(state, state.tone);
  state.duration = resolvedDuration;
  state.autoCloseDisabled = state.autoCloseDisabled || resolvedDuration === 0 || contactToneDisablesAutoClose(resolvedTone);

  renderContactToastActions(state);
  startContactToastTimer(state);
}

function prefillFromQuery() {

  const topic = qs("topic");
  const title = qs("title");
  const id = qs("id");
  const url = qs("url");

  if (topic && topicEl) {
    const options = Array.from(topicEl.options).map((option) => option.value);
    topicEl.value = options.includes(topic) ? topic : "Other";
  }

  const linkParts = [];
  if (url) linkParts.push(url);
  if (id && !url) linkParts.push(`artwork.html?id=${encodeURIComponent(id)}`);
  if (linkParts.length && linksEl && !linksEl.value.trim()) {
    linksEl.value = linkParts.join("\n");
  }

  if (title && msgEl && !msgEl.value.trim()) {
    msgEl.value = [
      "Hi Greg,",
      "",
      `I'm interested in: ${title}${id ? ` (ID: ${id})` : ""}.`,
      "",
      "Use case:",
      "Timeline:",
      "Budget range (optional):",
      "",
      "Notes:"
    ].join("\n");
  }

  if (topic || title || id || url) {
    setStatus("Prefilled from artwork link.", { tone: "info" });
  }
}

prefillFromQuery();

function buildDraft() {
  const name = String(nameEl?.value || "").trim();
  const from = String(fromEl?.value || "").trim();
  const topic = String(topicEl?.value || "General");
  const links = String(linksEl?.value || "").trim();
  const message = String(msgEl?.value || "").trim();

  const subject = `[Toji Studios] ${topic} - ${name || "Inquiry"}`;
  const bodyLines = [
    "Hi Greg,",
    "",
    `Topic: ${topic}`,
    name ? `From: ${name}${from ? ` <${from}>` : ""}` : (from ? `From: ${from}` : null),
    links ? `Links:\n${links}` : null,
    "",
    message,
    "",
    "-",
    name || ""
  ].filter(Boolean);

  return { subject, body: bodyLines.join("\n") };
}

function mailtoLink(subject, body) {
  return `mailto:${encodeURIComponent(TO_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

if (form && draftBox && draftPre) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { subject, body } = buildDraft();
    draftPre.textContent = `To: ${TO_EMAIL}\nSubject: ${subject}\n\n${body}`;
    draftBox.style.display = "block";
    window.location.href = mailtoLink(subject, body);
    setStatus("Email draft created.", { tone: "success" });
  });
}

const copyEmailButton = document.getElementById("copyEmail");
const directContactPanel = document.getElementById("contactEmailPanel");
if (copyEmailButton) {
  copyEmailButton.addEventListener("click", async () => {
    try {
      await copyToClipboard(TO_EMAIL);
      setStatus("Email copied to clipboard.", { tone: "success" });
    } catch {
      setStatus("Couldn't copy email (browser blocked).", { tone: "warn" });
    }
    if (emailEl) {
      emailEl.classList.remove("element-flash");
      void emailEl.offsetWidth;
      emailEl.classList.add("element-flash");
    }
    if (directContactPanel) {
      directContactPanel.classList.remove("panel-flash");
      void directContactPanel.offsetWidth;
      directContactPanel.classList.add("panel-flash");
    }
  });
}

const getInTouchPill = document.querySelector('.page-toolbar__pill[href="#contactFormPanel"]');
const formPanel = document.getElementById("contactFormPanel");
if (getInTouchPill && formPanel) {
  getInTouchPill.addEventListener("click", () => {
    formPanel.classList.remove("panel-flash");
    void formPanel.offsetWidth;
    formPanel.classList.add("panel-flash");
  });
  formPanel.addEventListener("animationend", () => {
    formPanel.classList.remove("panel-flash");
  });
}

const emailPill = document.querySelector('.page-toolbar__pill[href="#contactEmailPanel"]');
if (emailPill && directContactPanel) {
  emailPill.addEventListener("click", () => {
    directContactPanel.classList.remove("panel-flash");
    void directContactPanel.offsetWidth;
    directContactPanel.classList.add("panel-flash");
  });
  directContactPanel.addEventListener("animationend", () => {
    directContactPanel.classList.remove("panel-flash");
  });
}

const linksPill = document.querySelector('.page-toolbar__pill[href="#contactLinksPanel"]');
const linksPanel = document.getElementById("contactLinksPanel");
if (linksPill && linksPanel) {
  linksPill.addEventListener("click", () => {
    linksPanel.classList.remove("panel-flash");
    void linksPanel.offsetWidth;
    linksPanel.classList.add("panel-flash");
  });
  linksPanel.addEventListener("animationend", () => {
    linksPanel.classList.remove("panel-flash");
  });
}

const copyDraftButton = document.getElementById("copyDraft");
if (copyDraftButton) {
  copyDraftButton.addEventListener("click", async () => {
    try {
      const text = draftPre?.textContent || "";
      if (!text) {
        setStatus("Create a draft first.", { tone: "warn" });
        return;
      }
      await copyToClipboard(text);
      setStatus("Draft copied.", { tone: "success" });
    } catch {
      setStatus("Couldn't copy draft (browser blocked).", { tone: "warn" });
    }
  });
}

