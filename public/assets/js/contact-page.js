import { renderPublicHeader } from "./header.js";
import { bindFloatingFields } from "./floating-fields.js";
import { renderPublicFooter } from "./footer.js";
import { initStickyHero } from "./site.js";
import { qs, el } from "./content-utils.js";

renderPublicHeader({
  active: "contact",
  small: "contact",
  ctaText: "View Gallery",
  ctaHref: "gallery.html"
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

function ensureToastHost() {
  let host = document.querySelector(".contact-toast-stack");
  if (host) return host;

  const style = document.createElement("style");
  style.textContent = `
    .contact-toast-stack{
      position:fixed;
      right:16px;
      bottom:16px;
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
      line-height:1.4;
      white-space:pre-line;
    }
    .contact-toast__msg{
      margin:0;
    }
    .contact-toast__countdown{
      margin-top:8px;
      font-size:11px;
      line-height:1.2;
      letter-spacing:.01em;
      color:color-mix(in srgb, var(--muted, #bcc4d6) 80%, transparent);
      text-align:right;
      font-variant-numeric:tabular-nums;
    }
  `;
  document.head.appendChild(style);

  host = document.createElement("div");
  host.className = "contact-toast-stack";
  host.setAttribute("aria-live", "polite");
  document.body.appendChild(host);
  return host;
}

function setStatus(msg) {
  if (!msg) return;
  const host = ensureToastHost();
  const toast = document.createElement("article");
  toast.className = "contact-toast";

  const body = document.createElement("p");
  body.className = "contact-toast__msg";
  body.textContent = msg;

  const countdown = document.createElement("div");
  countdown.className = "contact-toast__countdown";
  toast.append(body, countdown);
  host.appendChild(toast);

  const duration = 3000;
  const startedAt = Date.now();
  const updateCountdown = () => {
    const remaining = Math.max(0, duration - (Date.now() - startedAt));
    countdown.textContent = `Auto close in ${Math.ceil(remaining / 1000)}s`;
  };

  updateCountdown();
  const intervalId = setInterval(updateCountdown, 200);

  setTimeout(() => {
    clearInterval(intervalId);
    toast.remove();
  }, duration);
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
    setStatus("Prefilled from artwork link.");
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
    setStatus("Email draft created.");
  });
}

const copyEmailButton = document.getElementById("copyEmail");
if (copyEmailButton) {
  copyEmailButton.addEventListener("click", async () => {
    try {
      await copyToClipboard(TO_EMAIL);
      setStatus("Email copied.");
    } catch {
      setStatus("Couldn't copy email (browser blocked).");
    }
  });
}

const copyDraftButton = document.getElementById("copyDraft");
if (copyDraftButton) {
  copyDraftButton.addEventListener("click", async () => {
    try {
      const text = draftPre?.textContent || "";
      if (!text) {
        setStatus("Create a draft first.");
        return;
      }
      await copyToClipboard(text);
      setStatus("Draft copied.");
    } catch {
      setStatus("Couldn't copy draft (browser blocked).");
    }
  });
}

