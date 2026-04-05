import { initThemeSystem } from "./site.js";

const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";
const BANNER_STATIC_LOGO_SRC_KEY = "toji_banner_static_logo_src_v1";
const BANNER_LOGO_BORDER_ENABLED_KEY = "toji_banner_logo_border_enabled_v1";
const BANNER_LOGO_BORDER_COLOR_KEY = "toji_banner_logo_border_color_v1";
let bannerP5LoadPromise = null;

export function renderPublicHeader({
  active = "home",       // "home" | "gallery" | "series" | "about" | "contact"
  small = "",
  ctaText = "Explore",
  ctaHref = "gallery.html",
  brandLogoSrc = "",
  showThemeControls = true,
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
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("/admin/")) return "studio";
    const explicit = String(active || "").trim().toLowerCase();
    if (explicit && ["home", "gallery", "series", "about", "contact", "studio"].includes(explicit)) {
      return explicit;
    }
    if (path.endsWith("/gallery.html")) return "gallery";
    if (path.endsWith("/series.html")) return "series";
    if (path.endsWith("/about.html")) return "about";
    if (path.endsWith("/contact.html")) return "contact";
    return "home";
  };

  const defaultIconSrc = toAsset("img/TojiStudios-Logo.png");
  const defaultWordmarkDarkSrc = toAsset("img/TojiStudios-Light-TextOnly.png");
  const defaultWordmarkLightSrc = toAsset("img/TojiStudios-Dark-TextOnly.png");
  const brandInner = `
    <span class="brand-logo-combo" aria-hidden="true">
      <span class="brand-logo-icon-stack">
        <img class="brand-logo-icon-image" src="${defaultIconSrc}" alt="" />
      </span>
      <span class="brand-logo-wordmark-stack">
        <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-dark" src="${defaultWordmarkDarkSrc}" alt="" />
        <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-light" src="${defaultWordmarkLightSrc}" alt="" />
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

	      ${showThemeControls ? `
	      <div class="theme-controls">
	        <button class="theme-pill-toggle" type="button" data-theme-toggle aria-label="Toggle theme"></button>
	      </div>` : ""}
	    </div>
	  `;

  const brandLink = headerHost.querySelector(".brand");
  if (brandLink) {
    brandLink.dataset.defaultLogoIconSrc = defaultIconSrc;
    brandLink.dataset.defaultWordmarkDarkSrc = defaultWordmarkDarkSrc;
    brandLink.dataset.defaultWordmarkLightSrc = defaultWordmarkLightSrc;
    brandLink.dataset.defaultStaticLogoSrc = String(brandLogoSrc || "");
  }
  applyBannerLogoBorder(headerHost);

  const activeNav = resolveActiveNav();
  headerHost.querySelectorAll("[data-nav]").forEach(a => {
    const isActive = a.getAttribute("data-nav") === activeNav;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  const syncActiveNavIndicator = () => {
    const navContainer = headerHost.querySelector(".container.nav");
    const navLinksHost = headerHost.querySelector(".navlinks");
    if (!navContainer || !navLinksHost) return;

    const indicator = navContainer.querySelector(".nav-active-indicator");
    if (indicator) indicator.remove();

    if (window.matchMedia("(max-width: 760px)").matches) return;

    let activeLink = navLinksHost.querySelector("a.active, a[aria-current='page']");
    if (!activeLink) {
      const currentPath = String(window.location.pathname || "");
      const allLinks = Array.from(navLinksHost.querySelectorAll("a[data-nav]"));
      activeLink = allLinks.find((link) => {
        try {
          return new URL(link.href, window.location.href).pathname === currentPath;
        } catch {
          return false;
        }
      }) || null;
      if (!activeLink && currentPath.toLowerCase().includes("/admin/")) {
        activeLink = navLinksHost.querySelector("a[data-nav='studio']");
      }
    }
    if (!activeLink) return;

    if (!activeLink.classList.contains("active")) activeLink.classList.add("active");
    if (activeLink.getAttribute("aria-current") !== "page") activeLink.setAttribute("aria-current", "page");

  };

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
    syncActiveNavIndicator();
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
      syncActiveNavIndicator();
      return;
    }
    setMenuOpen(false);
    syncActiveNavIndicator();
  });

  if (mobileQuery.matches) setMenuOpen(false);
  else navLinks?.removeAttribute("aria-hidden");

  syncActiveNavIndicator();
  window.addEventListener("resize", syncActiveNavIndicator);
  window.addEventListener("scroll", syncActiveNavIndicator, { passive: true });

  initThemeSystem();
  applyBannerLogoBehavior(headerHost);
}

export function applyBannerLogoBehavior(headerHost) {
  if (!headerHost) return;
  applyBannerLogoBorder(headerHost);
  const mode = getBannerLogoAnimationMode();
  if (mode === "circles") {
    ensureDefaultBannerLogoMarkup(headerHost);
    mountBannerBezierLogo(headerHost);
    return;
  }
  if (mode === "plot") {
    ensureDefaultBannerLogoMarkup(headerHost);
    mountBannerPlotLogo(headerHost);
    return;
  }
  if (mode === "radar") {
    ensureDefaultBannerLogoMarkup(headerHost);
    mountBannerRadarLogo(headerHost);
    return;
  }
  if (mode === "sphere") {
    ensureDefaultBannerLogoMarkup(headerHost);
    mountBannerWireframeSphereLogo(headerHost);
    return;
  }
  applyStaticBannerLogo(headerHost);
}

function resolveBannerAssetSrc(src) {
  const value = String(src || "").trim();
  if (!value || !value.startsWith("/")) return value;
  try {
    const current = new URL(String(window.location.origin || ""));
    const isLocalHost = ["localhost", "127.0.0.1"].includes(current.hostname);
    if (isLocalHost && current.port && current.port !== "5179") {
      return `${current.protocol}//${current.hostname}:5179${value}`;
    }
  } catch {}
  return value;
}

function getBannerStaticLogoSrc() {
  try {
    const value = String(localStorage.getItem(BANNER_STATIC_LOGO_SRC_KEY) || "").trim();
    if (!value) return "";
    const normalized = /\.(png|jpe?g)$/i.test(value) && !value.includes("/") && !value.includes("\\")
      ? "/assets/img/logos/" + value
      : value;
    return resolveBannerAssetSrc(normalized);
  } catch {
    return "";
  }
}

function normalizeBannerLogoBorderColor(value) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : "#871818";
}

function bannerLogoBorderEnabled() {
  try {
    return localStorage.getItem(BANNER_LOGO_BORDER_ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

function getBannerLogoBorderColor() {
  try {
    return normalizeBannerLogoBorderColor(localStorage.getItem(BANNER_LOGO_BORDER_COLOR_KEY));
  } catch {
    return "#871818";
  }
}

function applyBannerLogoBorder(headerHost) {
  const brand = headerHost?.querySelector(".brand");
  if (!brand) return;
  brand.style.setProperty("--banner-logo-border-width", bannerLogoBorderEnabled() ? "1px" : "0px");
  brand.style.setProperty("--banner-logo-border-color", getBannerLogoBorderColor());
}

function ensureDefaultBannerLogoMarkup(headerHost) {
  const brand = headerHost?.querySelector(".brand");
  if (!brand) return null;
  let combo = brand.querySelector(".brand-logo-combo");
  brand.querySelector(".brand-logo-image--custom")?.remove();
  if (!combo) {
    combo = document.createElement("span");
    combo.className = "brand-logo-combo";
    combo.setAttribute("aria-hidden", "true");
    const srOnly = brand.querySelector(".sr-only");
    brand.insertBefore(combo, srOnly || brand.firstChild || null);
  }
  combo.innerHTML = `
    <span class="brand-logo-icon-stack">
      <img class="brand-logo-icon-image" src="${brand.dataset.defaultLogoIconSrc || "assets/img/TojiStudios-Logo.png"}" alt="" />
    </span>
    <span class="brand-logo-wordmark-stack">
      <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-dark" src="${brand.dataset.defaultWordmarkDarkSrc || "assets/img/TojiStudios-Light-TextOnly.png"}" alt="" />
      <img class="brand-logo-wordmark-image brand-logo-wordmark-image--for-light" src="${brand.dataset.defaultWordmarkLightSrc || "assets/img/TojiStudios-Dark-TextOnly.png"}" alt="" />
    </span>
  `;
  return combo;
}

function applyStaticBannerLogo(headerHost) {
  const brand = headerHost?.querySelector(".brand");
  if (!brand) return;
  const configuredSrc = getBannerStaticLogoSrc();
  const fallbackSrc = resolveBannerAssetSrc(String(brand.dataset.defaultStaticLogoSrc || "").trim());
  const desiredSrc = configuredSrc || fallbackSrc;
  const combo = ensureDefaultBannerLogoMarkup(headerHost);
  if (!combo || !desiredSrc) return;
  const iconImage = combo.querySelector(".brand-logo-icon-image");
  if (!iconImage) return;
  iconImage.src = desiredSrc;
}

function getBannerLogoAnimationMode() {
  try {
    const enabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
    if (!enabled) return "off";
    const mode = String(localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY) || "").toLowerCase();
    if (mode === "plot") return "plot";
    if (mode === "radar") return "radar";
    if (mode === "sphere") return "sphere";
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

function mountBannerRadarLogo(headerHost) {
  if (getBannerLogoAnimationMode() !== "radar") return;

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
      if (!m) return [255, 84, 84];
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    new window.p5((p) => {
      let cw = 0;
      let ch = 0;
      let sweepAngle = 0;
      let sweepSpeed = 0.025;
      let rotationDirection = 1;
      let nextBlipAt = 0;
      const blips = [];
      const echoes = [];

      const seedRadar = () => {
        blips.length = 0;
        echoes.length = 0;
        sweepAngle = p.random(Math.PI * 2);
        rotationDirection = p.random() < 0.5 ? -1 : 1;
        sweepSpeed = p.random(0.02, 0.032) * rotationDirection;
        nextBlipAt = p.millis() + p.random(120, 260);
        const initialCount = Math.floor(p.random(4, 8));
        for (let i = 0; i < initialCount; i += 1) {
          blips.push({
            angle: p.random(Math.PI * 2),
            radiusRatio: p.random(0.18, 0.94),
            size: p.random(2.2, 5.6),
            alpha: p.random(88, 180),
            pulse: p.random(Math.PI * 2),
            drift: p.random(-0.005, 0.005),
            radialDrift: p.random(-0.0018, 0.0018)
          });
        }
      };

      p.setup = () => {
        cw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        ch = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        const canvas = p.createCanvas(cw, ch);
        canvas.parent(canvasHost);
        seedRadar();
        p.clear();
      };

      p.draw = () => {
        const now = p.millis();
        const nw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        const nh = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        if (nw !== cw || nh !== ch) {
          cw = nw;
          ch = nh;
          p.resizeCanvas(cw, ch);
        }

        const ink = readThemeInk();
        const cx = cw * 0.5;
        const cy = ch * 0.5;
        const radius = Math.max(8, Math.min(cw, ch) * 0.42);

        p.clear();
        p.blendMode(p.BLEND);
        p.background(3, 14, 10, 230);

        p.noStroke();
        p.fill(6, 40, 26, 80);
        p.circle(cx, cy, radius * 2.18);
        p.fill(0, 0, 0, 104);
        p.circle(cx, cy, radius * 1.92);

        p.stroke(184, 40, 40, 82);
        p.strokeWeight(0.8);
        for (let ring = 0.25; ring <= 1; ring += 0.25) {
          p.noFill();
          p.circle(cx, cy, radius * 2 * ring);
        }
        p.line(cx - radius, cy, cx + radius, cy);
        p.line(cx, cy - radius, cx, cy + radius);
        p.line(cx - radius * 0.7, cy - radius * 0.7, cx + radius * 0.7, cy + radius * 0.7);
        p.line(cx + radius * 0.7, cy - radius * 0.7, cx - radius * 0.7, cy + radius * 0.7);

        p.noFill();
        p.stroke(242, 54, 54, 128);
        p.strokeWeight(1.5);
        p.circle(cx, cy, radius * 2);

        sweepAngle += sweepSpeed;

        p.noStroke();
        for (let i = 10; i >= 0; i -= 1) {
          const tailAngle = sweepAngle - (i * 0.1 * rotationDirection);
          const alpha = 8 + i * 7;
          p.fill(255, 58, 58, alpha);
          p.arc(cx, cy, radius * 2, radius * 2, tailAngle - 0.06, tailAngle + 0.06, p.PIE);
        }

        p.stroke(255, 84, 84, 214);
        p.strokeWeight(1.7);
        p.line(cx, cy, cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);

        if (now >= nextBlipAt && blips.length < 10) {
          blips.push({
            angle: p.random(Math.PI * 2),
            radiusRatio: p.random(0.1, 0.96),
            size: p.random(2.2, 5.4),
            alpha: p.random(96, 190),
            pulse: p.random(Math.PI * 2),
            drift: p.random(-0.005, 0.005),
            radialDrift: p.random(-0.0018, 0.0018)
          });
          nextBlipAt = now + p.random(180, 520);
        }

        for (let i = echoes.length - 1; i >= 0; i -= 1) {
          const echo = echoes[i];
          echo.life *= 0.93;
          echo.size *= 1.028;
          if (echo.life < 10) {
            echoes.splice(i, 1);
            continue;
          }
          p.noFill();
          p.stroke(255, 118, 118, echo.life);
          p.strokeWeight(1);
          p.circle(echo.x, echo.y, echo.size);
        }

        for (let i = blips.length - 1; i >= 0; i -= 1) {
          const blip = blips[i];
          blip.angle += blip.drift;
          blip.radiusRatio = p.constrain(blip.radiusRatio + blip.radialDrift, 0.06, 0.97);
          blip.pulse += 0.08;
          const x = cx + Math.cos(blip.angle) * radius * blip.radiusRatio;
          const y = cy + Math.sin(blip.angle) * radius * blip.radiusRatio;
          const delta = Math.atan2(Math.sin(sweepAngle - blip.angle), Math.cos(sweepAngle - blip.angle));
          const nearSweep = Math.abs(delta) < 0.12;
          if (nearSweep && (!blip.lastSweepAt || now - blip.lastSweepAt > 180)) {
            echoes.push({ x, y, size: blip.size * 1.9, life: 150 });
            blip.lastSweepAt = now;
          }
          if (p.random() < 0.0026 && blips.length > 5) {
            blips.splice(i, 1);
            continue;
          }
          const glow = 0.72 + 0.28 * Math.sin(blip.pulse);
          p.noStroke();
          p.fill(255, 72, 72, blip.alpha * glow * (nearSweep ? 1.5 : 0.72));
          p.circle(x, y, blip.size * (nearSweep ? 1.38 : 1));
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

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}







function mountBannerWireframeSphereLogo(headerHost) {
  if (getBannerLogoAnimationMode() !== "sphere") return;

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
      let spin = 0;

      p.setup = () => {
        cw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
        ch = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
        const canvas = p.createCanvas(cw, ch);
        canvas.parent(canvasHost);
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

        const ink = readThemeInk();
        const cx = cw * 0.5;
        const cy = ch * 0.5;
        spin += 0.0048;
        const baseRadius = Math.max(10, Math.min(cw, ch) * 0.35);
        const radius = baseRadius * (0.94 + 0.08 * ((Math.sin(spin * 1.7) + 1) * 0.5));
        const nodeCount = 92;
        if (!p.__wireSphereNodes || p.__wireSphereNodes.length !== nodeCount) {
          p.__wireSphereNodes = Array.from({ length: nodeCount }, (_, index) => {
            const t = index + 0.5;
            const y = 1 - (t / nodeCount) * 2;
            const ring = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = Math.PI * (3 - Math.sqrt(5)) * index;
            return {
              x: Math.cos(theta) * ring,
              y,
              z: Math.sin(theta) * ring,
              size: 1.0 + (((index * 17) % 13) / 13) * 2.1
            };
          });
        }

        p.clear();
        p.blendMode(p.BLEND);

        const spherePoints = p.__wireSphereNodes.map((node, index) => {
          const yaw = spin;
          const pitch = -0.42 + (Math.sin(spin * 0.55) * 0.18);
          const cosYaw = Math.cos(yaw);
          const sinYaw = Math.sin(yaw);
          const cosPitch = Math.cos(pitch);
          const sinPitch = Math.sin(pitch);

          const x1 = node.x * cosYaw - node.z * sinYaw;
          const z1 = node.x * sinYaw + node.z * cosYaw;
          const y2 = node.y * cosPitch - z1 * sinPitch;
          const z2 = node.y * sinPitch + z1 * cosPitch;
          const perspective = 0.7 + ((z2 + 1) * 0.22);
          return {
            sx: cx + x1 * radius * perspective,
            sy: cy + y2 * radius * perspective,
            depth: z2,
            size: node.size * (0.72 + ((z2 + 1) * 0.22)),
            sortKey: z2,
            index
          };
        });

        p.strokeWeight(1);
        for (let i = 0; i < spherePoints.length; i += 1) {
          const a = spherePoints[i];
          for (let j = i + 1; j < spherePoints.length; j += 1) {
            const b = spherePoints[j];
            const dx = a.sx - b.sx;
            const dy = a.sy - b.sy;
            const dist = Math.hypot(dx, dy);
            if (dist > radius * 0.38) continue;
            const depthMix = (a.depth + b.depth + 2) / 4;
            const alpha = Math.max(14, 138 - (dist / (radius * 0.38)) * 104) * (0.35 + depthMix * 0.95);
            if (alpha < 10) continue;
            p.stroke(ink[0], ink[1], ink[2], alpha);
            p.line(a.sx, a.sy, b.sx, b.sy);
          }
        }

        spherePoints.sort((a, b) => a.sortKey - b.sortKey);
        p.noStroke();
        for (const point of spherePoints) {
          const fillAlpha = 90 + ((point.depth + 1) * 70);
          const glowSize = point.size * 1.95;
          p.fill(ink[0], ink[1], ink[2], fillAlpha * 0.12);
          p.circle(point.sx, point.sy, glowSize);
          p.fill(ink[0], ink[1], ink[2], fillAlpha);
          p.circle(point.sx, point.sy, point.size);
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


