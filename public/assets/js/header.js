import { initThemeSystem } from "./site.js";

export function renderPublicHeader({
  active = "home",       // "home" | "gallery" | "series" | "about" | "contact"
  small = "",
  ctaText = "Explore",
  ctaHref = "gallery.html",
} = {}) {
  const headerHost = document.getElementById("siteHeader");
  if (!headerHost) throw new Error('Missing <header id="siteHeader"></header>');

  headerHost.className = "header";
  headerHost.innerHTML = `
    <div class="container nav">
      <a class="brand" href="index.html">Toji Studios <small>${escapeHtml(small)}</small></a>

      <nav class="navlinks" aria-label="Primary">
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

      <a class="btn" href="${escapeAttr(ctaHref)}">${escapeHtml(ctaText)}</a>
    </div>
  `;

  headerHost.querySelectorAll("[data-nav]").forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-nav") === active);
  });

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
