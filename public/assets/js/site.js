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

export function initThemeToggle(){
  const root = document.documentElement;
  const key = "toji_theme";

  // 1) load saved theme or follow system preference
  const saved = localStorage.getItem(key);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const initial = saved || (prefersDark ? "dark" : "light");

  root.dataset.theme = initial;

  // 2) wire up any button with data-theme-toggle
  const btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;

  const syncLabel = () => {
    const t = root.dataset.theme;
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    btn.textContent = t === "dark" ? "Light" : "Dark";
  };

  syncLabel();

  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem(key, next);
    syncLabel();
  });
}
