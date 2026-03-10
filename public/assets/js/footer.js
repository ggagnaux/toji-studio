let siteMetaPromise = null;
const API_BASE = (localStorage.getItem("toji_api_base") || "http://localhost:5179").replace(/\/+$/, "");

async function getSiteVersion() {
  if (!siteMetaPromise) {
    siteMetaPromise = fetch(`${API_BASE}/api/public/site-meta`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  const meta = await siteMetaPromise;
  return String(meta?.version || "").trim();
}

export function renderPublicFooter({
  leftText = "\u00A9 {year} Toji Studios",
  rightHtml = `<a href="gallery.html">Gallery</a> &bull; <a href="about.html">About</a> &bull; <a href="contact.html">Contact</a>`,
} = {}) {
  const host = document.getElementById("siteFooter");
  if (!host) throw new Error('Missing <footer id="siteFooter"></footer>');

  const year = new Date().getFullYear();
  const leftBase = leftText.replace("{year}", String(year));
  const normalizedRightHtml = ensureCompleteFooterMenu(rightHtml);

  host.className = "footer";
  host.innerHTML = `
    <div class="row">
      <div data-footer-left>${escapeHtml(leftBase)}</div>
      <div>${normalizedRightHtml}</div>
    </div>
  `;

  syncFooterActiveLink(host);

  const leftNode = host.querySelector("[data-footer-left]");
  if (!leftNode) return;

  getSiteVersion().then((version) => {
    if (!version) return;
    leftNode.textContent = `${leftBase} [V${version}]`;
  });
}

function ensureCompleteFooterMenu(inputHtml) {
  const inAdmin = /\/admin\//i.test(window.location.pathname);
  const required = inAdmin
    ? [
        { label: "Home", href: "../index.html" },
        { label: "Gallery", href: "../gallery.html" },
        { label: "Series", href: "../series.html" },
        { label: "About", href: "../about.html" },
        { label: "Contact", href: "../contact.html" },
        { label: "Studio", href: "index.html" }
      ]
    : [
        { label: "Home", href: "index.html" },
        { label: "Gallery", href: "gallery.html" },
        { label: "Series", href: "series.html" },
        { label: "About", href: "about.html" },
        { label: "Contact", href: "contact.html" },
        { label: "Studio", href: "admin/index.html" }
      ];

  const wrap = document.createElement("div");
  wrap.innerHTML = String(inputHtml || "");
  const existingAnchors = Array.from(wrap.querySelectorAll("a"));
  const byLabel = new Map(
    existingAnchors.map((a) => [String(a.textContent || "").trim().toLowerCase(), a.getAttribute("href") || ""])
  );

  const merged = required.map((item) => {
    const existingHref = byLabel.get(item.label.toLowerCase());
    const href = String(existingHref || item.href).trim() || item.href;
    return `<a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a>`;
  });

  return merged.join(" &bull; ");
}

function normalizePathFromHref(href) {
  try {
    const u = new URL(href, window.location.href);
    const p = String(u.pathname || "/").replace(/\/+$/, "");
    return p || "/";
  } catch {
    return "";
  }
}

function syncFooterActiveLink(host) {
  const links = Array.from(host.querySelectorAll(".row a"));
  if (!links.length) return;

  links.forEach((a) => {
    a.classList.remove("active");
    a.removeAttribute("aria-current");
  });

  const headerActive = document.querySelector("#siteHeader .navlinks a.active[data-nav]");
  let targetPath = headerActive ? normalizePathFromHref(headerActive.href) : "";
  if (!targetPath) targetPath = normalizePathFromHref(window.location.pathname);

  let active = links.find((a) => normalizePathFromHref(a.href) === targetPath);
  if (!active) {
    active = links.find((a) => {
      const rel = String(a.getAttribute("href") || "").trim().toLowerCase();
      return rel === "index.html" && /\/admin\//i.test(window.location.pathname);
    }) || null;
  }
  if (!active) return;

  active.classList.add("active");
  active.setAttribute("aria-current", "page");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}