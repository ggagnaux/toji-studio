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
  const MODE_KEY = "toji_theme_mode";

  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const getSystemTheme = () => (media?.matches ? "dark" : "light");
  const normalizeMode = (value) => {
    const mode = String(value || "").toLowerCase();
    if (mode === "light" || mode === "dark" || mode === "system") return mode;
    return "system";
  };
  const resolveTheme = (mode) => (normalizeMode(mode) === "system" ? getSystemTheme() : normalizeMode(mode));

  const applyTheme = (mode, animate = true) => {
    const themeMode = normalizeMode(mode);
    const theme = resolveTheme(themeMode);

    if (animate) {
      root.classList.add("theme-animate");
      setTimeout(() => root.classList.remove("theme-animate"), 260);
    }

    root.dataset.theme = theme;
    root.dataset.themeMode = themeMode;
    syncUI(theme, themeMode);
  };

  const syncUI = (theme, themeMode = normalizeMode(localStorage.getItem(MODE_KEY))) => {
    const toggleBtn = document.querySelector("[data-theme-toggle]");
    if (toggleBtn) {
      toggleBtn.dataset.theme = theme;
      toggleBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      toggleBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      toggleBtn.setAttribute("title", theme === "dark" ? "Theme: dark" : "Theme: light");
      toggleBtn.innerHTML = `<span class="theme-pill-toggle__dot" aria-hidden="true"></span>`;
    }

    const label = document.querySelector("[data-theme-label]");
    if (label) {
      label.textContent = themeMode[0].toUpperCase() + themeMode.slice(1);
    }

    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      const choice = String(btn.getAttribute("data-theme-choice") || "").toLowerCase();
      const active = choice === themeMode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  const savedMode = normalizeMode(localStorage.getItem(MODE_KEY));
  applyTheme(savedMode, false);
  localStorage.setItem(MODE_KEY, savedMode);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-toggle]");
    if (btn) {
      const currentTheme = root.dataset.theme || getSystemTheme();
      const nextMode = currentTheme === "dark" ? "light" : "dark";
      localStorage.setItem(MODE_KEY, nextMode);
      applyTheme(nextMode, true);
      return;
    }
    const choiceBtn = e.target.closest?.("[data-theme-choice]");
    if (!choiceBtn) return;
    const nextMode = normalizeMode(choiceBtn.getAttribute("data-theme-choice"));
    localStorage.setItem(MODE_KEY, nextMode);
    applyTheme(nextMode, true);
  });

  media?.addEventListener?.("change", () => {
    const mode = normalizeMode(localStorage.getItem(MODE_KEY));
    applyTheme(mode, true);
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
}

export function initStickyHero({
  heroSelector = ".hero--sticky",
  compactClass = "is-scrolled",
  compactThreshold = 8,
} = {}) {
  const root = document.documentElement;
  const header = document.getElementById("siteHeader");
  const hero = document.querySelector(heroSelector);
  if (!header || !hero) return;

  const syncOffsets = () => {
    const headerHeight = header.getBoundingClientRect().height || 0;
    root.style.setProperty("--sticky-hero-top", `${headerHeight}px`);
  };

  hero.classList.remove(compactClass);
  syncOffsets();
  window.addEventListener("resize", syncOffsets);
  window.addEventListener("scroll", syncOffsets, { passive: true });
}
