export { qs, el } from "./content-utils.js";

export async function loadGallery() {
  const res = await fetch("assets/data/gallery.sample.json");
  return res.json();
}

export function uniqTags(items){
  const set = new Set();
  items.forEach(i => (i.tags||[]).forEach(t => set.add(t)));
  return ["all", ...Array.from(set).sort()];
}

export function initThemeSystem(){
  const root = document.documentElement;

  // mode: "system" | "light" | "dark"
  const MODE_KEY = "toji_theme_mode";

  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const getSystemTheme = () => (media?.matches ? "dark" : "light");

  const applyTheme = (mode, animate = true) => {
    const theme = (mode === "system") ? getSystemTheme() : mode;

    if (animate) {
      root.classList.add("theme-animate");
      setTimeout(() => root.classList.remove("theme-animate"), 260);
    }

    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    syncUI(mode, theme);
  };

  const syncUI = (mode, theme) => {
    const iconBtn = document.querySelector("[data-theme-icon]");
    if (iconBtn) {
      iconBtn.dataset.themeMode = mode;
      iconBtn.dataset.theme = theme;
      iconBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      iconBtn.setAttribute("title", mode === "system" ? `Theme: System (${theme})` : `Theme: ${mode}`);
      iconBtn.innerHTML = theme === "dark" ? moonSVG() : sunSVG();
    }

    document.querySelectorAll("[data-theme-mode]").forEach(btn => {
      const v = btn.getAttribute("data-theme-mode");
      btn.classList.toggle("active", v === mode);
      btn.setAttribute("aria-pressed", v === mode ? "true" : "false");
    });

    const label = document.querySelector("[data-theme-label]");
    if (label) {
      label.textContent = (mode === "system") ? `System (${theme})` : mode[0].toUpperCase() + mode.slice(1);
    }
  };

  const savedMode = localStorage.getItem(MODE_KEY) || "system";
  applyTheme(savedMode, false);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-mode]");
    if (!btn) return;
    const mode = btn.getAttribute("data-theme-mode");
    localStorage.setItem(MODE_KEY, mode);
    applyTheme(mode, true);
  });

  // Icon cycles light<->dark (exits system mode on first click)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-icon]");
    if (!btn) return;

    const currentMode = root.dataset.themeMode || "system";
    const currentTheme = root.dataset.theme || getSystemTheme();

    const nextMode =
      currentMode === "system"
        ? (currentTheme === "dark" ? "light" : "dark")
        : (currentMode === "dark" ? "light" : "dark");

    localStorage.setItem(MODE_KEY, nextMode);
    applyTheme(nextMode, true);
  });

  media?.addEventListener?.("change", () => {
    const mode = root.dataset.themeMode || "system";
    if (mode === "system") applyTheme("system", true);
  });

  if (!window.__tojiNavCompactInit) {
    window.__tojiNavCompactInit = true;
    let isCompact = false;
    const ENTER_COMPACT_Y = 36;
    const EXIT_COMPACT_Y = 12;

    const syncCompactNav = () => {
      const y = window.scrollY || 0;
      if (!isCompact && y >= ENTER_COMPACT_Y) {
        isCompact = true;
        root.classList.add("nav-compact");
        return;
      }
      if (isCompact && y <= EXIT_COMPACT_Y) {
        isCompact = false;
        root.classList.remove("nav-compact");
      }
    };
    syncCompactNav();
    window.addEventListener("scroll", syncCompactNav, { passive: true });
  }

  function sunSVG(){
    return `
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="currentColor"></circle>
        <g stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <line x1="12" y1="1.8" x2="12" y2="4.5"></line>
          <line x1="12" y1="19.5" x2="12" y2="22.2"></line>
          <line x1="1.8" y1="12" x2="4.5" y2="12"></line>
          <line x1="19.5" y1="12" x2="22.2" y2="12"></line>
          <line x1="4.1" y1="4.1" x2="6.1" y2="6.1"></line>
          <line x1="17.9" y1="17.9" x2="19.9" y2="19.9"></line>
          <line x1="4.1" y1="19.9" x2="6.1" y2="17.9"></line>
          <line x1="17.9" y1="6.1" x2="19.9" y2="4.1"></line>
        </g>
      </svg>
    `;
  }

  function moonSVG(){
    return `
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M15.9 2.1a9.95 9.95 0 0 0 0 19.8c3.14 0 5.96-1.45 7.8-3.7-5.46.6-10.36-3.3-10.96-8.76-.4-3.55 1.14-6.88 3.16-9.34Z"></path>
      </svg>
    `;
  }
}
