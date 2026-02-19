import { initThemeSystem } from "./site.js";

export function renderPublicHeader({
  active = "home",       // "home" | "gallery" | "series" | "about" | "contact"
  small = "",
  ctaText = "Explore",
  ctaHref = "gallery.html",
  brandLogoSrc = "",
} = {}) {
  const headerHost = document.getElementById("siteHeader");
  if (!headerHost) throw new Error('Missing <header id="siteHeader"></header>');

  const brandInner = brandLogoSrc
    ? `<img class="brand-logo-image" src="${escapeAttr(brandLogoSrc)}" alt="Toji Studios" />`
    : `Toji Studios <small>${escapeHtml(small)}</small>`;

  headerHost.className = "header";
  headerHost.innerHTML = `
    <div class="container nav">
      <a class="brand" href="index.html">${brandInner}</a>

      <button
        class="icon-btn nav-toggle"
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded="false"
        aria-controls="sitePrimaryNav"
        data-nav-toggle
      >
        <span aria-hidden="true">☰</span>
      </button>

      <nav class="navlinks" id="sitePrimaryNav" aria-label="Primary">
        <a href="index.html" data-nav="home">Home</a>
        <a href="gallery.html" data-nav="gallery">Gallery</a>
        <a href="series.html" data-nav="series">Series</a>
        <a href="about.html" data-nav="about">About</a>
        <a href="contact.html" data-nav="contact">Contact</a>
        <a href="admin/index.html" data-nav="studio">Studio</a>
      </nav>

      <div class="theme-controls">
        <div class="segmented" role="group" aria-label="Theme mode">
          <button type="button" data-theme-mode="system">System</button>
          <button type="button" data-theme-mode="light">Light</button>
          <button type="button" data-theme-mode="dark">Dark</button>
        </div>
        <button class="icon-btn" type="button" data-theme-icon aria-label="Toggle theme"></button>
      </div>
    </div>
  `;

  headerHost.querySelectorAll("[data-nav]").forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-nav") === active);
  });

  const navRoot = headerHost.querySelector(".nav");
  const navLinks = headerHost.querySelector(".navlinks");
  const navToggle = headerHost.querySelector("[data-nav-toggle]");
  const mobileQuery = window.matchMedia("(max-width: 760px)");

  const setMenuOpen = (open) => {
    if (!navRoot || !navToggle || !navLinks) return;
    navRoot.classList.toggle("nav-open", !!open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.firstElementChild.textContent = open ? "✕" : "☰";
    navLinks.setAttribute("aria-hidden", open ? "false" : "true");
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!open);
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) setMenuOpen(false);
    });
  });

  mobileQuery.addEventListener("change", (e) => {
    if (!e.matches) {
      navRoot?.classList.remove("nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
      if (navToggle?.firstElementChild) navToggle.firstElementChild.textContent = "☰";
      navLinks?.removeAttribute("aria-hidden");
      return;
    }
    setMenuOpen(false);
  });

  if (mobileQuery.matches) setMenuOpen(false);
  else navLinks?.removeAttribute("aria-hidden");

  initThemeSystem();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

