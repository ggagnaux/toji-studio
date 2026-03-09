    import { applyBannerLogoBehavior } from "../../assets/js/header.js";
    import {
      ensureBaseStyles,
      setYearFooter
    } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();
    const headerHost = document.querySelector("header.header");
    applyBannerLogoBehavior(headerHost);

    const SPLASH_MODE_KEY = "toji_splash_animation_mode_v1";
    const SPLASH_RANDOM_CYCLE_ENABLED_KEY = "toji_splash_random_cycle_enabled_v1";
    const SPLASH_RANDOM_CYCLE_SECONDS_KEY = "toji_splash_random_cycle_seconds_v1";
    const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
    const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";
    const splashMode = document.getElementById("splashMode");
    const splashModeCurrent = document.getElementById("splashModeCurrent");
    const splashRandomOptions = document.getElementById("splashRandomOptions");
    const splashRandomCycleEnabled = document.getElementById("splashRandomCycleEnabled");
    const splashRandomCycleSeconds = document.getElementById("splashRandomCycleSeconds");
    const bannerBezierLogoEnabled = document.getElementById("bannerBezierLogoEnabled");
    const bannerLogoAnimationStyle = document.getElementById("bannerLogoAnimationStyle");
    const bannerLogoCurrent = document.getElementById("bannerLogoCurrent");

    function normalizeSplashMode(value){
      const mode = String(value || "").toLowerCase();
      if (mode === "random") return "random";
      if (mode === "bezier") return "bezier";
      if (mode === "flock") return "flock";
      if (mode === "circles") return "circles";
      if (mode === "matrix") return "matrix";
      if (mode === "life") return "life";
      if (mode === "code") return "code";
      if (mode === "plot") return "plot";
      if (mode === "bounce") return "bounce";
      if (mode === "logo3d") return "logo3d";
      if (mode === "turningcircles") return "turningcircles";
      if (mode === "asteroids") return "asteroids";
      if (mode === "tempest") return "tempest";
      if (mode === "pi") return "pi";
      return "nodes";
    }

    function describeSplashMode(mode){
      if (mode === "random") return "Randomize each visit";
      if (mode === "bezier") return "Bezier curves (dense)";
      if (mode === "flock") return "Flocking triangles (mouse follow)";
      if (mode === "circles") return "Outlined circles grid (fill/unfill)";
      if (mode === "matrix") return "Matrix digital rain";
      if (mode === "life") return "Conway's Game of Life";
      if (mode === "code") return "Code writer (neon terminal)";
      if (mode === "plot") return "Random x/y function plot";
      if (mode === "bounce") return "Bouncing ball + logo deflect";
      if (mode === "logo3d") return "Floating logo (3D rotate)";
      if (mode === "turningcircles") return "Turning circles + fade trails";
      if (mode === "asteroids") return "Asteroids simulation (auto-play)";
      if (mode === "tempest") return "Tempest simulation (auto-play)";
      if (mode === "pi") return "Pi digits screen fill";
      return "Nodes and edges (existing)";
    }

    function normalizeCycleSeconds(value){
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n)) return 12;
      return Math.min(600, Math.max(1, n));
    }

    function normalizeBannerLogoAnimationStyle(value){
      const style = String(value || "").toLowerCase();
      if (style === "plot") return "plot";
      return "circles";
    }

    function updateRandomizeControls(){
      const isRandom = normalizeSplashMode(splashMode?.value) === "random";
      if (splashRandomOptions) splashRandomOptions.style.display = isRandom ? "" : "none";
      if (splashRandomCycleEnabled) splashRandomCycleEnabled.disabled = !isRandom;
      if (splashRandomCycleSeconds) {
        splashRandomCycleSeconds.disabled = !isRandom || !splashRandomCycleEnabled?.checked;
      }
      if (bannerLogoAnimationStyle) bannerLogoAnimationStyle.disabled = !bannerBezierLogoEnabled?.checked;
    }

    function ensureStaticBannerIconMarkup(){
      if (!headerHost) return;
      const logoCombo = headerHost.querySelector(".brand-logo-combo");
      if (!logoCombo) return;
      const currentIconStack = logoCombo.querySelector(".brand-logo-icon-stack");
      const currentCanvas = logoCombo.querySelector(".brand-logo-canvas--icon");
      if (currentIconStack) return;

      const iconStack = document.createElement("span");
      iconStack.className = "brand-logo-icon-stack";
      const iconImage = document.createElement("img");
      iconImage.className = "brand-logo-icon-image";
      iconImage.src = "../assets/img/TojiStudios-Logo.png";
      iconImage.alt = "";
      iconStack.appendChild(iconImage);

      if (currentCanvas) {
        currentCanvas.replaceWith(iconStack);
        return;
      }
      logoCombo.insertBefore(iconStack, logoCombo.firstChild || null);
    }

    function syncSplashModeUI(){
      const mode = normalizeSplashMode(localStorage.getItem(SPLASH_MODE_KEY));
      if (splashMode) splashMode.value = mode;
      const cycleEnabled = localStorage.getItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY) === "1";
      const cycleSeconds = normalizeCycleSeconds(localStorage.getItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY));
      const bannerBezierEnabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
      const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(
        localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY)
      );
      if (splashRandomCycleEnabled) splashRandomCycleEnabled.checked = cycleEnabled;
      if (splashRandomCycleSeconds) splashRandomCycleSeconds.value = String(cycleSeconds);
      if (bannerBezierLogoEnabled) bannerBezierLogoEnabled.checked = bannerBezierEnabled;
      if (bannerLogoAnimationStyle) bannerLogoAnimationStyle.value = bannerAnimationStyle;

      if (splashModeCurrent) {
        const cycleText = mode === "random"
          ? ` | Auto change: ${cycleEnabled ? `On (${cycleSeconds}s)` : "Off"}`
          : "";
        splashModeCurrent.textContent = `Current: ${describeSplashMode(mode)}${cycleText}`;
      }
      if (bannerLogoCurrent) {
        if (!bannerBezierEnabled) bannerLogoCurrent.textContent = "Banner: Static image logo";
        else bannerLogoCurrent.textContent = `Banner: Animated ${bannerAnimationStyle === "plot" ? "x/y plot" : "circles"} canvas`;
      }
      updateRandomizeControls();
    }

    syncSplashModeUI();

    function persistSettings({ refreshBanner = false } = {}){
      const mode = normalizeSplashMode(splashMode?.value);
      const cycleEnabled = !!splashRandomCycleEnabled?.checked;
      const cycleSeconds = normalizeCycleSeconds(splashRandomCycleSeconds?.value);
      const bannerBezierEnabled = !!bannerBezierLogoEnabled?.checked;
      const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(bannerLogoAnimationStyle?.value);
      localStorage.setItem(SPLASH_MODE_KEY, mode);
      localStorage.setItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY, cycleEnabled ? "1" : "0");
      localStorage.setItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY, String(cycleSeconds));
      localStorage.setItem(BANNER_BEZIER_LOGO_ENABLED_KEY, bannerBezierEnabled ? "1" : "0");
      localStorage.setItem(BANNER_LOGO_ANIMATION_MODE_KEY, bannerAnimationStyle);
      syncSplashModeUI();
      if (refreshBanner) {
        ensureStaticBannerIconMarkup();
        applyBannerLogoBehavior(headerHost);
      }
    }

    splashMode?.addEventListener("change", () => {
      updateRandomizeControls();
      persistSettings();
    });

    splashRandomCycleEnabled?.addEventListener("change", () => {
      updateRandomizeControls();
      persistSettings();
    });

    splashRandomCycleSeconds?.addEventListener("change", () => {
      persistSettings();
    });

    bannerBezierLogoEnabled?.addEventListener("change", () => {
      updateRandomizeControls();
      persistSettings({ refreshBanner: true });
    });

    bannerLogoAnimationStyle?.addEventListener("change", () => {
      persistSettings({ refreshBanner: true });
    });
  

