import { initThemeSystem } from "./site.js";

const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";
let bannerP5LoadPromise = null;

export function renderPublicHeader({
  active = "home",       // "home" | "gallery" | "series" | "about" | "contact"
  small = "",
  ctaText = "Explore",
  ctaHref = "gallery.html",
  brandLogoSrc = "",
  linkPrefix = "",
  studioHref = "admin/index.html",
  assetPrefix = "assets/",
} = {}) {
  const headerHost = document.getElementById("siteHeader");
  if (!headerHost) throw new Error('Missing <header id="siteHeader"></header>');

  const normPrefix = String(linkPrefix || "");
  const normAssetPrefix = String(assetPrefix || "assets/").replace(/\\/g, "/");
  const toHref = (path) => `${normPrefix}${path}`;
  const toAsset = (path) => `${normAssetPrefix}${path}`;
  const resolveActiveNav = () => {
    const explicit = String(active || "").trim().toLowerCase();
    if (explicit && ["home", "gallery", "series", "about", "contact", "studio"].includes(explicit)) {
      return explicit;
    }
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("/admin/")) return "studio";
    if (path.endsWith("/gallery.html")) return "gallery";
    if (path.endsWith("/series.html")) return "series";
    if (path.endsWith("/about.html")) return "about";
    if (path.endsWith("/contact.html")) return "contact";
    return "home";
  };

  const brandInner = `
    <span class="brand-logo-combo" aria-hidden="true">
      <span class="brand-logo-icon-stack">
        <img class="brand-logo-icon-image" src="${toAsset("img/TojiStudios-Logo.png")}" alt="" />
      </span>
      <span class="brand-logo-wordmark-stack">
        <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-dark" src="${toAsset("img/TojiStudios-Light-TextOnly.png")}" alt="" />
        <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-light" src="${toAsset("img/TojiStudios-Dark-TextOnly.png")}" alt="" />
      </span>
    </span>
    <span class="sr-only">Toji Studios</span>
  `;

  headerHost.className = "header";
  headerHost.innerHTML = `
    <div class="container nav">
      <a class="brand" href="${toHref("index.html")}">${brandInner}</a>

      <button
        class="icon-btn nav-toggle"
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded="false"
        aria-controls="sitePrimaryNav"
        data-nav-toggle
      >
        <span aria-hidden="true">&#9776;</span>
      </button>

      <nav class="navlinks" id="sitePrimaryNav" aria-label="Primary">
        <a href="${toHref("index.html")}" data-nav="home">Home</a>
        <a href="${toHref("gallery.html")}" data-nav="gallery">Gallery</a>
        <a href="${toHref("series.html")}" data-nav="series">Series</a>
        <a href="${toHref("about.html")}" data-nav="about">About</a>
        <a href="${toHref("contact.html")}" data-nav="contact">Contact</a>
        <a href="${toHref(studioHref)}" data-nav="studio">Studio</a>
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

  const activeNav = resolveActiveNav();
  headerHost.querySelectorAll("[data-nav]").forEach(a => {
    const isActive = a.getAttribute("data-nav") === activeNav;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  const navRoot = headerHost.querySelector(".nav");
  const navLinks = headerHost.querySelector(".navlinks");
  const navToggle = headerHost.querySelector("[data-nav-toggle]");
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const setMenuOpen = (open) => {
    if (!navRoot || !navToggle || !navLinks) return;
    navRoot.classList.toggle("nav-open", !!open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.firstElementChild.innerHTML = open ? "&#10005;" : "&#9776;";
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
      if (navToggle?.firstElementChild) navToggle.firstElementChild.innerHTML = "&#9776;";
      navLinks?.removeAttribute("aria-hidden");
      return;
    }
    setMenuOpen(false);
  });

  if (mobileQuery.matches) setMenuOpen(false);
  else navLinks?.removeAttribute("aria-hidden");

  initThemeSystem();
  applyBannerLogoBehavior(headerHost);
}

export function applyBannerLogoBehavior(headerHost) {
  if (!headerHost) return;
  const mode = getBannerLogoAnimationMode();
  if (mode === "circles") {
    mountBannerBezierLogo(headerHost);
    return;
  }
  if (mode === "plot") {
    mountBannerPlotLogo(headerHost);
  }
}

function getBannerLogoAnimationMode() {
  try {
    const enabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
    if (!enabled) return "off";
    const mode = String(localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY) || "").toLowerCase();
    if (mode === "plot") return "plot";
    return "circles";
  } catch {
    return "off";
  }
}

function bannerBezierLogoEnabled() {
  return getBannerLogoAnimationMode() === "circles";
}

function ensureBannerP5() {
  if (window.p5) return Promise.resolve();
  if (bannerP5LoadPromise) return bannerP5LoadPromise;
  bannerP5LoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-p5-banner-logo]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js";
    s.async = true;
    s.setAttribute("data-p5-banner-logo", "1");
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return bannerP5LoadPromise;
}

function mountBannerBezierLogo(headerHost) {
  if (!bannerBezierLogoEnabled()) return;

  const brand = headerHost.querySelector(".brand");
  const logoCombo = brand?.querySelector(".brand-logo-combo");
  const iconStack = logoCombo?.querySelector(".brand-logo-icon-stack");
  if (!brand || !logoCombo || !iconStack) return;

  const iconLogo = iconStack.querySelector(".brand-logo-icon-image");
  const run = async () => {
    if (!iconStack.isConnected) return;
    const rect = iconStack.getBoundingClientRect();
    const ratioFromRect = (rect.width > 1 && rect.height > 1) ? (rect.width / rect.height) : 0;
    const ratioFromImage = (iconLogo?.naturalWidth > 1 && iconLogo?.naturalHeight > 1)
      ? (iconLogo.naturalWidth / iconLogo.naturalHeight)
      : 0;
    const ratio = Math.max(0.6, Math.min(1.8, ratioFromRect || ratioFromImage || 1));

    const canvasHost = document.createElement("span");
    canvasHost.className = "brand-logo-canvas brand-logo-canvas--icon";
    canvasHost.setAttribute("aria-hidden", "true");
    canvasHost.style.setProperty("--brand-logo-ratio", String(ratio));
    iconStack.replaceWith(canvasHost);

    try {
      await ensureBannerP5();
    } catch {
      return;
    }
    if (!window.p5 || !canvasHost.isConnected) return;
    const textFontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";

    const readThemeInk = () => {
      const raw = getComputedStyle(document.body).color || "";
      const m = raw.match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (!m) return [255, 255, 255];
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };

    new window.p5((p) => {
      let cw = 0;
      let ch = 0;
      let frame = 0;
      const cycleFrames = 380;
      const ringCount = 10;
      const ringDelay = 28;

      p.setup = () => {
        cw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        ch = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        const canvas = p.createCanvas(cw, ch);
        canvas.parent(canvasHost);
        p.textFont(textFontFamily);
        p.clear();
      };

      p.draw = () => {
        frame += 1;
        const nw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        const nh = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        if (nw !== cw || nh !== ch) {
          cw = nw;
          ch = nh;
          p.resizeCanvas(cw, ch);
        }

        p.clear();
        p.blendMode(p.BLEND);
        p.noFill();
        const ink = readThemeInk();

        const circleZoneW = Math.max(52, Math.floor(cw * 0.34));
        const cx = Math.max(18, Math.min(cw - 18, circleZoneW * 0.52));
        const cy = ch * 0.5;
        const minR = Math.max(4, Math.min(cw, ch) * 0.05);
        const maxR = Math.max(minR + 8, Math.min(ch * 0.46, circleZoneW * 0.46));

        for (let i = 0; i < ringCount; i += 1) {
          const localFrame = frame - (i * ringDelay);
          if (localFrame <= 0) continue;
          const cyclePos = (localFrame % cycleFrames) / cycleFrames;
          const radius = minR + (maxR - minR) * cyclePos;
          const alpha = 200 * Math.pow(1 - cyclePos, 1.15);
          const weight = 2.2 - (1.4 * cyclePos);
          p.stroke(ink[0], ink[1], ink[2], alpha);
          p.strokeWeight(Math.max(0.8, weight));
          p.circle(cx, cy, radius * 2);
        }

      };
    });
  };

  if (iconLogo && !iconLogo.complete) {
    iconLogo.addEventListener("load", run, { once: true });
    iconLogo.addEventListener("error", run, { once: true });
    return;
  }
  run();
}

function mountBannerPlotLogo(headerHost) {
  if (getBannerLogoAnimationMode() !== "plot") return;

  const brand = headerHost.querySelector(".brand");
  const logoCombo = brand?.querySelector(".brand-logo-combo");
  const iconStack = logoCombo?.querySelector(".brand-logo-icon-stack");
  if (!brand || !logoCombo || !iconStack) return;

  const iconLogo = iconStack.querySelector(".brand-logo-icon-image");
  const run = async () => {
    if (!iconStack.isConnected) return;
    const rect = iconStack.getBoundingClientRect();
    const ratioFromRect = (rect.width > 1 && rect.height > 1) ? (rect.width / rect.height) : 0;
    const ratioFromImage = (iconLogo?.naturalWidth > 1 && iconLogo?.naturalHeight > 1)
      ? (iconLogo.naturalWidth / iconLogo.naturalHeight)
      : 0;
    const ratio = Math.max(0.6, Math.min(1.8, ratioFromRect || ratioFromImage || 1));

    const canvasHost = document.createElement("span");
    canvasHost.className = "brand-logo-canvas brand-logo-canvas--icon";
    canvasHost.setAttribute("aria-hidden", "true");
    canvasHost.style.setProperty("--brand-logo-ratio", String(ratio));
    iconStack.replaceWith(canvasHost);

    try {
      await ensureBannerP5();
    } catch {
      return;
    }
    if (!window.p5 || !canvasHost.isConnected) return;

    const readThemeInk = () => {
      const raw = getComputedStyle(document.body).color || "";
      const m = raw.match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (!m) return [220, 236, 255];
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };

    new window.p5((p) => {
      let cw = 0;
      let ch = 0;
      let startAtMs = 0;
      let plotFreq = 1.2;
      let plotPhase = 0;
      let plotAmp = 0.75;
      let plotFamily = 0;
      const ghostFrames = [];

      const reseed = () => {
        plotFreq = p.random(0.6, 2.4);
        plotPhase = p.random(0, p.TWO_PI);
        plotAmp = p.random(0.45, 1.15);
        plotFamily = Math.floor(p.random(0, 5));
        ghostFrames.length = 0;
      };

      const evalPlot = (xNorm, t) => {
        if (plotFamily === 0) return plotAmp * Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.7));
        if (plotFamily === 1) return plotAmp * Math.exp(-0.7 * Math.abs(xNorm)) * Math.sin((plotFreq * Math.PI * xNorm) + (xNorm * xNorm * 2.1) + plotPhase + (t * 0.6));
        if (plotFamily === 2) return plotAmp * Math.tanh(2.1 * xNorm) * Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.85));
        if (plotFamily === 3) return plotAmp * ((2 / (1 + Math.exp(-2.3 * xNorm))) - 1) + (0.35 * Math.sin((plotFreq * 2 * Math.PI * xNorm) + plotPhase + (t * 0.5)));
        return plotAmp * (Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.55)) + (0.45 * Math.cos((plotFreq * 1.7 * Math.PI * xNorm) - (t * 0.35)))) / (1 + (0.8 * xNorm * xNorm));
      };

      p.setup = () => {
        cw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        ch = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        const canvas = p.createCanvas(cw, ch);
        canvas.parent(canvasHost);
        startAtMs = p.millis();
        reseed();
        p.clear();
      };

      p.draw = () => {
        const nw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        const nh = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        if (nw !== cw || nh !== ch) {
          cw = nw;
          ch = nh;
          p.resizeCanvas(cw, ch);
        }

        if ((p.millis() - startAtMs) > 9200) {
          startAtMs = p.millis();
          reseed();
        }

        const ink = readThemeInk();
        p.clear();
        p.blendMode(p.BLEND);
        const centerX = cw * 0.5;
        const centerY = ch * 0.5;

        p.stroke(ink[0], ink[1], ink[2], 64);
        p.strokeWeight(1);
        p.line(0, centerY, cw, centerY);
        p.line(centerX, 0, centerX, ch);

        for (let i = ghostFrames.length - 1; i >= 0; i -= 1) {
          const ghost = ghostFrames[i];
          ghost.alpha -= 6.4;
          if (ghost.alpha <= 2) ghostFrames.splice(i, 1);
        }

        for (const ghost of ghostFrames) {
          if (!ghost.points?.length) continue;
          p.noFill();
          p.stroke(ink[0], ink[1], ink[2], ghost.alpha);
          p.strokeWeight(1.05);
          p.beginShape();
          for (const pt of ghost.points) p.vertex(pt.x, pt.y);
          p.endShape();
        }

        p.noFill();
        p.stroke(ink[0], ink[1], ink[2], 224);
        p.strokeWeight(1.8);
        p.beginShape();
        const points = [];
        const steps = Math.max(46, Math.floor(cw / 2));
        const t = p.millis() / 1000;
        for (let i = 0; i <= steps; i += 1) {
          const u = i / steps;
          const x = p.lerp(0, cw, u);
          const xNorm = (u * 2) - 1;
          const y = centerY - evalPlot(xNorm, t) * (ch * 0.33);
          points.push({ x, y });
          p.vertex(x, y);
        }
        p.endShape();

        ghostFrames.push({ points, alpha: 118 });
        if (ghostFrames.length > 18) ghostFrames.splice(0, ghostFrames.length - 18);
      };
    });
  };

  if (iconLogo && !iconLogo.complete) {
    iconLogo.addEventListener("load", run, { once: true });
    iconLogo.addEventListener("error", run, { once: true });
    return;
  }
  run();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}
