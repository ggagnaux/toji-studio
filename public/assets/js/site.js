export async function loadGallery() {
  const res = await fetch("assets/data/gallery.sample.json");
  return res.json();
}

export function qs(name){
  return new URLSearchParams(location.search).get(name);
}

export function el(tag, attrs={}, ...children){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if(k === "class") n.className = v;
    else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if(c == null) return;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
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
      // remove after transition window
      setTimeout(() => root.classList.remove("theme-animate"), 260);
    }

    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    syncUI(mode, theme);
  };

  const syncUI = (mode, theme) => {
    // Icon button
    const iconBtn = document.querySelector("[data-theme-icon]");
    if (iconBtn) {
      iconBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      iconBtn.setAttribute("title", mode === "system" ? `Theme: System (${theme})` : `Theme: ${mode}`);
      iconBtn.innerHTML = theme === "dark" ? moonSVG() : sunSVG();
    }

    // Segmented mode buttons
    document.querySelectorAll("[data-theme-mode]").forEach(btn => {
      const v = btn.getAttribute("data-theme-mode");
      btn.classList.toggle("active", v === mode);
      btn.setAttribute("aria-pressed", v === mode ? "true" : "false");
    });

    // Optional: display label
    const label = document.querySelector("[data-theme-label]");
    if (label) {
      label.textContent = (mode === "system") ? `System (${theme})` : mode[0].toUpperCase() + mode.slice(1);
    }
  };

  const savedMode = localStorage.getItem(MODE_KEY) || "system";
  applyTheme(savedMode, false);

  // Mode picker (System/Light/Dark)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-mode]");
    if (!btn) return;
    const mode = btn.getAttribute("data-theme-mode");
    localStorage.setItem(MODE_KEY, mode);
    applyTheme(mode, true);
  });

  // Icon cycles Light <-> Dark quickly (does not set system; it toggles explicit mode)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-theme-icon]");
    if (!btn) return;

    const currentMode = root.dataset.themeMode || "system";
    const currentTheme = root.dataset.theme || getSystemTheme();

    // If in system mode, first click flips to the opposite explicit theme
    const nextMode =
      currentMode === "system"
        ? (currentTheme === "dark" ? "light" : "dark")
        : (currentMode === "dark" ? "light" : "dark");

    localStorage.setItem(MODE_KEY, nextMode);
    applyTheme(nextMode, true);
  });

  // If user is in system mode and OS theme changes, update automatically
  media?.addEventListener?.("change", () => {
    const mode = root.dataset.themeMode || "system";
    if (mode === "system") applyTheme("system", true);
  });

  function sunSVG(){
    return `
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-16h0Zm0 20h0ZM4.22 5.64l1.42 1.42L4.22 5.64Zm14.14 14.14 1.42 1.42-1.42-1.42ZM2 12h2H2Zm18 0h2-2ZM4.22 18.36l1.42-1.42-1.42 1.42Zm14.14-14.14 1.42-1.42-1.42 1.42ZM12 2v2-2Zm0 18v2-2Z"/>
      </svg>
    `;
  }

  function moonSVG(){
    return `
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 14.7A8.1 8.1 0 0 1 9.3 3a7 7 0 1 0 11.7 11.7Z"/>
      </svg>
    `;
  }
}
