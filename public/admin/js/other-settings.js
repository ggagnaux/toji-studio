import { applyBannerLogoBehavior } from "../../assets/js/header.js";
import { initializeHomeSplash } from "../../assets/js/splash-runtime.js";
import {
  ensureBaseStyles,
  setYearFooter,
  apiFetch,
  API_BASE,
  getAdminToken,
  confirmToast
} from "../admin.js";

ensureBaseStyles();
setYearFooter();
const headerHost = document.querySelector("header.header");
applyBannerLogoBehavior(headerHost);

const SPLASH_MODE_KEY = "toji_splash_animation_mode_v1";
const SPLASH_ANIMATION_ENABLED_KEY = "toji_splash_animation_enabled_v1";
const SPLASH_RANDOM_CYCLE_ENABLED_KEY = "toji_splash_random_cycle_enabled_v1";
const SPLASH_RANDOM_CYCLE_SECONDS_KEY = "toji_splash_random_cycle_seconds_v1";
const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";
const TAG_CAP_KEY = "toji_ai_tag_cap_v1";
const AI_FEATURES_ENABLED_KEY = "toji_ai_features_enabled_v1";

const DEFAULT_IMAGE_VARIANTS = Object.freeze({
  thumbMaxWidth: 560,
  thumbQuality: 78,
  webMaxWidth: 1800,
  webQuality: 84
});

const splashMode = document.getElementById("splashMode");
const splashModeCurrent = document.getElementById("splashModeCurrent");
const splashAnimationEnabled = document.getElementById("splashAnimationEnabled");
const splashAnimationToggleBadge = document.getElementById("splashAnimationToggleBadge");
const splashControlsBlock = document.getElementById("splashControlsBlock");
const splashRandomOptions = document.getElementById("splashRandomOptions");
const splashRandomCycleEnabled = document.getElementById("splashRandomCycleEnabled");
const splashRandomCycleSeconds = document.getElementById("splashRandomCycleSeconds");
const bannerBezierLogoEnabled = document.getElementById("bannerBezierLogoEnabled");
const bannerBezierToggleBadge = document.getElementById("bannerBezierToggleBadge");
const bannerBezierToggleLabel = document.getElementById("bannerBezierToggleLabel");
const bannerLogoAnimationStyle = document.getElementById("bannerLogoAnimationStyle");
const bannerLogoCurrent = document.getElementById("bannerLogoCurrent");
const tagCap = document.getElementById("tagCap");
const tagCapCurrent = document.getElementById("tagCapCurrent");
const aiFeaturesEnabled = document.getElementById("aiFeaturesEnabled");
const aiFeaturesToggleLabel = document.getElementById("aiFeaturesToggleLabel");
const aiFeaturesToggleBadge = document.getElementById("aiFeaturesToggleBadge");
const aiControlsBlock = document.getElementById("aiControlsBlock");
const aiFeaturesCurrent = document.getElementById("aiFeaturesCurrent");
const thumbMaxWidth = document.getElementById("thumbMaxWidth");
const thumbQuality = document.getElementById("thumbQuality");
const webMaxWidth = document.getElementById("webMaxWidth");
const webQuality = document.getElementById("webQuality");
const resetImageVariantsBtn = document.getElementById("resetImageVariantsBtn");
const imageVariantStatus = document.getElementById("imageVariantStatus");
const imageVariantCurrent = document.getElementById("imageVariantCurrent");
const exportDatabaseBtn = document.getElementById("exportDatabaseBtn");
const exportDatabaseStatus = document.getElementById("exportDatabaseStatus");
const splashPreviewBtn = document.getElementById("splashPreviewBtn");
const splashPreviewModal = document.getElementById("splashPreviewModal");
const splashPreviewCloseBtn = document.getElementById("splashPreviewCloseBtn");
const splashPreviewPrevBtn = document.getElementById("splashPreviewPrevBtn");
const splashPreviewNextBtn = document.getElementById("splashPreviewNextBtn");
const splashPreviewModeName = document.getElementById("splashPreviewModeName");
const splashPreviewMount = document.getElementById("splashPreviewMount");
const settingsTabButtons = Array.from(document.querySelectorAll("[data-settings-tab]"));
const settingsTabPanes = Array.from(document.querySelectorAll("[data-settings-pane]"));
const settingsTabContent = document.querySelector(".other-settings-tabcontent");
const SETTINGS_TAB_COLORS = {
  splash: "#2a97d4",
  banner: "#2ea97d",
  aiIntegration: "#cc5f2f",
  variants: "#8a63d2",
  export: "#7d8f34"
};

if (splashPreviewModal && splashPreviewModal.parentElement !== document.body) {
  document.body.appendChild(splashPreviewModal);
}

const SPLASH_PREVIEW_MODE_ORDER = Object.freeze([
  "nodes",
  "flock",
  "circles",
  "matrix",
  "life",
  "plot",
  "bounce",
  "turningcircles",
  "asteroids",
  "tempest",
  "missilecommand",
  "radar",
  "mountains",
  "serpentinesphere",
  "orbitalbeams"
]);
let splashPreviewModeIndex = 0;

settingsTabButtons.forEach((btn) => {
  const tab = btn.getAttribute("data-settings-tab");
  const color = SETTINGS_TAB_COLORS[tab] || "var(--accent)";
  btn.style.setProperty("--other-settings-tab-color", color);
});

function normalizeSplashMode(value){
  const mode = String(value || "").toLowerCase();
  if (mode === "random") return "random";
  if (mode === "flock") return "flock";
  if (mode === "circles") return "circles";
  if (mode === "matrix") return "matrix";
  if (mode === "life") return "life";
  if (mode === "plot") return "plot";
  if (mode === "bounce") return "bounce";
  if (mode === "turningcircles") return "turningcircles";
  if (mode === "asteroids") return "asteroids";
  if (mode === "tempest") return "tempest";
  if (mode === "missilecommand") return "missilecommand";
  if (mode === "radar") return "radar";
  if (mode === "mountains") return "mountains";
  if (mode === "serpentinesphere") return "serpentinesphere";
  if (mode === "orbitalbeams") return "orbitalbeams";
  return "nodes";
}

function describeSplashMode(mode){
  if (mode === "random") return "Randomize each visit";
  if (mode === "flock") return "Flocking triangles (mouse follow)";
  if (mode === "circles") return "Outlined circles grid (fill/unfill)";
  if (mode === "matrix") return "Matrix digital rain";
  if (mode === "life") return "Conway's Game of Life";
  if (mode === "plot") return "Random x/y function plot";
  if (mode === "bounce") return "Bouncing ball + logo deflect";
  if (mode === "turningcircles") return "Turning circles + fade trails";
  if (mode === "asteroids") return "Asteroids simulation (auto-play)";
  if (mode === "tempest") return "Tempest simulation (auto-play)";
  if (mode === "missilecommand") return "Missile Command simulation (auto-play)";
  if (mode === "radar") return "Radar screen sweep";
  if (mode === "mountains") return "Mountain night pan";
  if (mode === "serpentinesphere") return "Serpentine sphere sweep";
  if (mode === "orbitalbeams") return "Black Holes vs Bubbles";
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
  if (style === "radar") return "radar";
  return "circles";
}

function normalizeTagCap(value){
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 20;
  return Math.min(120, Math.max(1, n));
}

function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeImageVariantSettings(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    thumbMaxWidth: clampInt(input.thumbMaxWidth, DEFAULT_IMAGE_VARIANTS.thumbMaxWidth, 64, 6000),
    thumbQuality: clampInt(input.thumbQuality, DEFAULT_IMAGE_VARIANTS.thumbQuality, 1, 100),
    webMaxWidth: clampInt(input.webMaxWidth, DEFAULT_IMAGE_VARIANTS.webMaxWidth, 64, 12000),
    webQuality: clampInt(input.webQuality, DEFAULT_IMAGE_VARIANTS.webQuality, 1, 100)
  };
}

function setImageVariantStatus(message, tone = "") {
  if (!imageVariantStatus) return;
  imageVariantStatus.textContent = message || "";
  imageVariantStatus.style.color = tone === "error"
    ? "#d15353"
    : tone === "success"
      ? "var(--accent)"
      : "";
}

function setExportDatabaseStatus(message, tone = "") {
  if (!exportDatabaseStatus) return;
  exportDatabaseStatus.textContent = message || "";
  exportDatabaseStatus.style.color = tone === "error"
    ? "#d15353"
    : tone === "success"
      ? "var(--accent)"
      : "";
}

function buildExportTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function renderImageVariantSettings(settings) {
  const normalized = normalizeImageVariantSettings(settings);
  if (thumbMaxWidth) thumbMaxWidth.value = String(normalized.thumbMaxWidth);
  if (thumbQuality) thumbQuality.value = String(normalized.thumbQuality);
  if (webMaxWidth) webMaxWidth.value = String(normalized.webMaxWidth);
  if (webQuality) webQuality.value = String(normalized.webQuality);
  if (imageVariantCurrent) {
    imageVariantCurrent.textContent =
      `Variants: thumb ${normalized.thumbMaxWidth}px @ q${normalized.thumbQuality}, web ${normalized.webMaxWidth}px @ q${normalized.webQuality}`;
  }
}

function setSettingsTab(tab) {
  const nextTab = String(tab || "splash");
  const activeColor = SETTINGS_TAB_COLORS[nextTab] || "var(--accent)";
  settingsTabButtons.forEach((btn) => {
    const active = btn.getAttribute("data-settings-tab") === nextTab;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  settingsTabPanes.forEach((pane) => {
    const active = pane.getAttribute("data-settings-pane") === nextTab;
    pane.hidden = !active;
  });
  if (settingsTabContent) {
    settingsTabContent.style.setProperty("--other-settings-active-color", activeColor);
  }
}

function collectImageVariantSettings() {
  return normalizeImageVariantSettings({
    thumbMaxWidth: thumbMaxWidth?.value,
    thumbQuality: thumbQuality?.value,
    webMaxWidth: webMaxWidth?.value,
    webQuality: webQuality?.value
  });
}

function renderSplashPreviewMarkup() {
  if (!splashPreviewMount) return;
  splashPreviewMount.innerHTML = `
    <div id="splashScreen" class="splash-screen hidden" aria-label="Splash preview animation">
      <div id="splashP5" class="splash-p5" aria-hidden="true"></div>
      <div id="splashCountdown" class="splash-countdown hidden" aria-live="polite"></div>
    </div>
  `;
}

async function openSplashPreviewModal() {
  if (!splashPreviewModal) return;
  splashPreviewModal.hidden = false;
  document.body.classList.add("other-settings-modal-open");
  const selectedMode = normalizeSplashMode(splashMode?.value);
  const preferredMode = selectedMode === "random" ? "nodes" : selectedMode;
  const foundIndex = SPLASH_PREVIEW_MODE_ORDER.indexOf(preferredMode);
  splashPreviewModeIndex = foundIndex >= 0 ? foundIndex : 0;
  await showSplashPreviewMode(splashPreviewModeIndex);
}

function closeSplashPreviewModal() {
  const splashScreen = document.getElementById("splashScreen");
  if (splashScreen) {
    splashScreen.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
  }
  if (splashPreviewModal) splashPreviewModal.hidden = true;
  if (splashPreviewMount) splashPreviewMount.innerHTML = "";
  document.body.classList.remove("other-settings-modal-open");
}

async function showSplashPreviewMode(index) {
  const modeCount = SPLASH_PREVIEW_MODE_ORDER.length;
  if (!modeCount) return;
  splashPreviewModeIndex = ((Number(index) % modeCount) + modeCount) % modeCount;

  const existingSplash = document.getElementById("splashScreen");
  if (existingSplash) {
    existingSplash.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
  }
  renderSplashPreviewMarkup();

  const previewMode = SPLASH_PREVIEW_MODE_ORDER[splashPreviewModeIndex];
  localStorage.setItem(SPLASH_MODE_KEY, previewMode);
  if (splashMode) splashMode.value = previewMode;
  syncSplashModeUI();
  if (splashPreviewModeName) {
    splashPreviewModeName.textContent = `Animation: ${describeSplashMode(previewMode)}`;
  }
  await initializeHomeSplash({
    forceShow: true,
    bindTopLeftBrand: false,
    disableMouseInteraction: true,
    forceMode: previewMode
  });
}

function cycleSplashPreviewMode(delta) {
  if (!splashPreviewModal || splashPreviewModal.hidden) return;
  void showSplashPreviewMode(splashPreviewModeIndex + Number(delta || 0));
}

function updateRandomizeControls(){
  const splashEnabled = !!splashAnimationEnabled?.checked;
  const isRandom = normalizeSplashMode(splashMode?.value) === "random";
  if (splashPreviewBtn) {
    splashPreviewBtn.disabled = !splashEnabled;
  }
  if (!splashEnabled && splashPreviewModal && !splashPreviewModal.hidden) {
    closeSplashPreviewModal();
  }
  if (splashControlsBlock) splashControlsBlock.classList.toggle("is-disabled", !splashEnabled);
  if (splashControlsBlock) splashControlsBlock.classList.add("other-settings-controls-block");
  if (splashRandomOptions) splashRandomOptions.style.display = isRandom ? "" : "none";
  if (bannerLogoAnimationStyle) {
    const bannerStyleEnabled = !!bannerBezierLogoEnabled?.checked;
    bannerLogoAnimationStyle.disabled = !bannerStyleEnabled;
    const bannerStyleField = bannerLogoAnimationStyle.closest(".field");
    bannerStyleField?.classList.toggle("is-disabled-control", !bannerStyleEnabled);
  }

  const aiEnabled = !!aiFeaturesEnabled?.checked;
  if (aiControlsBlock) aiControlsBlock.classList.toggle("is-disabled", !aiEnabled);
  if (aiControlsBlock) {
    const controls = aiControlsBlock.querySelectorAll("input, select, textarea, button");
    controls.forEach((control) => {
      control.disabled = !aiEnabled;
    });
  }

  // Hard gate: when splash animation is disabled, every control beneath the toggle is disabled.
  if (splashControlsBlock) {
    const controls = splashControlsBlock.querySelectorAll("input, select, textarea, button");
    controls.forEach((control) => {
      if (control === splashAnimationEnabled) return;
      control.disabled = !splashEnabled;
    });
  }

  // When enabled, restore per-control logic inside the splash block.
  if (splashEnabled) {
    if (splashMode) splashMode.disabled = false;
    if (splashRandomCycleEnabled) splashRandomCycleEnabled.disabled = !isRandom;
    if (splashRandomCycleSeconds) {
      splashRandomCycleSeconds.disabled = !isRandom || !splashRandomCycleEnabled?.checked;
    }
  }
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
  const splashEnabled = localStorage.getItem(SPLASH_ANIMATION_ENABLED_KEY) !== "0";
  if (splashMode) splashMode.value = mode;
  const cycleEnabled = localStorage.getItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY) === "1";
  const cycleSeconds = normalizeCycleSeconds(localStorage.getItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY));
  const bannerBezierEnabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(
    localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY)
  );
  const savedTagCap = normalizeTagCap(localStorage.getItem(TAG_CAP_KEY));
  const aiEnabled = localStorage.getItem(AI_FEATURES_ENABLED_KEY) !== "0";
  if (splashAnimationEnabled) splashAnimationEnabled.checked = splashEnabled;
  if (splashRandomCycleEnabled) splashRandomCycleEnabled.checked = cycleEnabled;
  if (splashRandomCycleSeconds) splashRandomCycleSeconds.value = String(cycleSeconds);
  if (bannerBezierLogoEnabled) bannerBezierLogoEnabled.checked = bannerBezierEnabled;
  if (bannerLogoAnimationStyle) bannerLogoAnimationStyle.value = bannerAnimationStyle;
  if (tagCap) tagCap.value = String(savedTagCap);
  if (aiFeaturesEnabled) aiFeaturesEnabled.checked = aiEnabled;

  if (splashModeCurrent) {
    const cycleText = mode === "random"
      ? ` | Auto change: ${cycleEnabled ? `On (${cycleSeconds}s)` : "Off"}`
      : "";
    splashModeCurrent.textContent = splashEnabled
      ? `Current: ${describeSplashMode(mode)}${cycleText}`
      : "Current: Disabled";
  }
  if (splashAnimationToggleBadge) {
    splashAnimationToggleBadge.textContent = splashEnabled ? "Enabled" : "Disabled";
    splashAnimationToggleBadge.classList.toggle("is-enabled", splashEnabled);
    splashAnimationToggleBadge.classList.toggle("is-disabled", !splashEnabled);
  }
  if (bannerLogoCurrent) {
    if (!bannerBezierEnabled) bannerLogoCurrent.textContent = "Banner: Static image logo";
    else bannerLogoCurrent.textContent = `Banner: Animated ${bannerAnimationStyle === "plot" ? "x/y plot" : bannerAnimationStyle === "radar" ? "radar" : "circles"} canvas`;
  }
  if (bannerBezierToggleLabel) bannerBezierToggleLabel.style.color = "";
  if (bannerBezierToggleBadge) {
    bannerBezierToggleBadge.textContent = bannerBezierEnabled ? "Enabled" : "Disabled";
    bannerBezierToggleBadge.classList.toggle("is-enabled", bannerBezierEnabled);
    bannerBezierToggleBadge.classList.toggle("is-disabled", !bannerBezierEnabled);
  }
  if (tagCapCurrent) tagCapCurrent.textContent = `Tag cap: ${savedTagCap}`;
  if (aiFeaturesCurrent) aiFeaturesCurrent.textContent = `AI features: ${aiEnabled ? "Enabled" : "Disabled"}`;
  if (aiFeaturesToggleLabel) aiFeaturesToggleLabel.style.color = "";
  if (aiFeaturesToggleBadge) {
    aiFeaturesToggleBadge.textContent = aiEnabled ? "Enabled" : "Disabled";
    aiFeaturesToggleBadge.classList.toggle("is-enabled", aiEnabled);
    aiFeaturesToggleBadge.classList.toggle("is-disabled", !aiEnabled);
  }
  updateRandomizeControls();
}

async function loadImageVariantSettings() {
  renderImageVariantSettings(DEFAULT_IMAGE_VARIANTS);
  if (!getAdminToken()) {
    setImageVariantStatus("Set admin token in Upload page to load backend variant settings.");
    return;
  }
  try {
    const settings = await apiFetch("/api/admin/settings/image-variants", { method: "GET" });
    renderImageVariantSettings(settings);
    setImageVariantStatus("Loaded from backend.", "success");
  } catch (error) {
    setImageVariantStatus(`Failed to load backend settings: ${error?.message || error}`, "error");
  }
}

function persistSettings({ refreshBanner = false } = {}){
  const splashEnabled = !!splashAnimationEnabled?.checked;
  const mode = normalizeSplashMode(splashMode?.value);
  const cycleEnabled = !!splashRandomCycleEnabled?.checked;
  const cycleSeconds = normalizeCycleSeconds(splashRandomCycleSeconds?.value);
  const bannerBezierEnabled = !!bannerBezierLogoEnabled?.checked;
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(bannerLogoAnimationStyle?.value);
  const savedTagCap = normalizeTagCap(tagCap?.value);
  const aiEnabled = !!aiFeaturesEnabled?.checked;
  localStorage.setItem(SPLASH_ANIMATION_ENABLED_KEY, splashEnabled ? "1" : "0");
  localStorage.setItem(SPLASH_MODE_KEY, mode);
  localStorage.setItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY, cycleEnabled ? "1" : "0");
  localStorage.setItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY, String(cycleSeconds));
  localStorage.setItem(BANNER_BEZIER_LOGO_ENABLED_KEY, bannerBezierEnabled ? "1" : "0");
  localStorage.setItem(BANNER_LOGO_ANIMATION_MODE_KEY, bannerAnimationStyle);
  localStorage.setItem(TAG_CAP_KEY, String(savedTagCap));
  localStorage.setItem(AI_FEATURES_ENABLED_KEY, aiEnabled ? "1" : "0");
  syncSplashModeUI();
  if (refreshBanner) {
    ensureStaticBannerIconMarkup();
    applyBannerLogoBehavior(headerHost);
  }
}

async function saveImageVariantSettings() {
  if (!getAdminToken()) {
    setImageVariantStatus("Set admin token in Upload page to save backend variant settings.", "error");
    return;
  }
  const payload = collectImageVariantSettings();
  renderImageVariantSettings(payload);
  setImageVariantStatus("Saving...");
  try {
    const saved = await apiFetch("/api/admin/settings/image-variants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderImageVariantSettings(saved);
    setImageVariantStatus("Saved to backend.", "success");
  } catch (error) {
    setImageVariantStatus(`Save failed: ${error?.message || error}`, "error");
  }
}

async function exportDatabaseJson() {
  if (!getAdminToken()) {
    setExportDatabaseStatus("Set admin token in Upload page to export the database.", "error");
    return;
  }

  setExportDatabaseStatus("Preparing export...");
  try {
    const res = await fetch(`${API_BASE}/api/admin/export/database.json`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getAdminToken()}`
      }
    });

    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const payload = await res.json();
        if (payload?.error) message = payload.error;
      } catch {}
      throw new Error(message);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `toji-database-export-${buildExportTimestamp()}.json`;
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    setExportDatabaseStatus(`Downloaded ${filename}.`, "success");
  } catch (error) {
    setExportDatabaseStatus(`Export failed: ${error?.message || error}`, "error");
  }
}

syncSplashModeUI();
await loadImageVariantSettings();
setSettingsTab("splash");

splashAnimationEnabled?.addEventListener("change", () => {
  updateRandomizeControls();
  persistSettings();
});

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

tagCap?.addEventListener("change", () => {
  persistSettings();
});

aiFeaturesEnabled?.addEventListener("change", () => {
  persistSettings();
});

[thumbMaxWidth, thumbQuality, webMaxWidth, webQuality].forEach((input) => {
  input?.addEventListener("change", () => {
    renderImageVariantSettings(collectImageVariantSettings());
    void saveImageVariantSettings();
  });
});

settingsTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setSettingsTab(btn.getAttribute("data-settings-tab"));
  });
});

resetImageVariantsBtn?.addEventListener("click", async () => {
  const ok = await confirmToast(
    "Reset image variant settings to their default values?",
    { confirmLabel: "Reset", cancelLabel: "Cancel", tone: "warn" }
  );
  if (!ok) return;
  renderImageVariantSettings(DEFAULT_IMAGE_VARIANTS);
  void saveImageVariantSettings();
});

exportDatabaseBtn?.addEventListener("click", () => {
  void exportDatabaseJson();
});

splashPreviewBtn?.addEventListener("click", () => {
  void openSplashPreviewModal();
});

splashPreviewCloseBtn?.addEventListener("click", closeSplashPreviewModal);

splashPreviewModal?.querySelector("[data-splash-preview-close]")?.addEventListener("click", closeSplashPreviewModal);

splashPreviewModal?.querySelector(".other-settings-modal__dialog")?.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("#splashPreviewPrevBtn, #splashPreviewNextBtn, #splashPreviewCloseBtn")) {
    return;
  }
  closeSplashPreviewModal();
});

splashPreviewPrevBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  cycleSplashPreviewMode(-1);
});

splashPreviewNextBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  cycleSplashPreviewMode(1);
});

window.addEventListener("keydown", (event) => {
  if (!splashPreviewModal || splashPreviewModal.hidden) return;

  if (event.key === "Escape") {
    closeSplashPreviewModal();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    cycleSplashPreviewMode(-1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    cycleSplashPreviewMode(1);
  }
});
