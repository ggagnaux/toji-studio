import { applyBannerLogoBehavior } from "../../assets/js/header.js";
import { initializeHomeSplash } from "../../assets/js/splash-runtime.js";
import {
  SPLASH_MODE_CATALOG,
  SPLASH_MODE_IDS,
  DEFAULT_ALLOWED_SPLASH_MODES,
  normalizeSplashMode,
  describeSplashMode,
  normalizeAllowedSplashModes
} from "../../assets/js/splash-mode-config.js";
import {
  ensureBaseStyles,
  setYearFooter,
  apiFetch,
  API_BASE,
  getAdminToken,
  confirmToast,
  loadState,
  saveState
} from "../admin.js";

ensureBaseStyles();
setYearFooter();
const headerHost = document.querySelector("header.header");
applyBannerLogoBehavior(headerHost);

const SPLASH_MODE_KEY = "toji_splash_animation_mode_v1";
const SPLASH_ANIMATION_ENABLED_KEY = "toji_splash_animation_enabled_v1";
const SPLASH_RANDOM_CYCLE_ENABLED_KEY = "toji_splash_random_cycle_enabled_v1";
const SPLASH_RANDOM_CYCLE_SECONDS_KEY = "toji_splash_random_cycle_seconds_v1";
const SPLASH_ALLOWED_MODES_KEY = "toji_splash_allowed_modes_v1";
const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";
const TAG_CAP_KEY = "toji_ai_tag_cap_v1";
const AI_FEATURES_ENABLED_KEY = "toji_ai_features_enabled_v1";
const DEFAULT_CONTACT_EMAIL = "you@example.com";

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
const splashAllowedModes = document.getElementById("splashAllowedModes");
const splashAllowedSummary = document.getElementById("splashAllowedSummary");
const splashAllowedWarning = document.getElementById("splashAllowedWarning");
const splashAllowAllBtn = document.getElementById("splashAllowAllBtn");
const splashResetAllowedBtn = document.getElementById("splashResetAllowedBtn");
const splashClearAllowedBtn = document.getElementById("splashClearAllowedBtn");
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
const contactEmailAddress = document.getElementById("contactEmailAddress");
const contactEmailCurrent = document.getElementById("contactEmailCurrent");
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
  contact: "#d15353",
};

if (splashPreviewModal && splashPreviewModal.parentElement !== document.body) {
  document.body.appendChild(splashPreviewModal);
}

const SPLASH_PREVIEW_MODE_ORDER = SPLASH_MODE_IDS;
let splashPreviewModeIndex = 0;

settingsTabButtons.forEach((btn) => {
  const tab = btn.getAttribute("data-settings-tab");
  const color = SETTINGS_TAB_COLORS[tab] || "var(--accent)";
  btn.style.setProperty("--other-settings-tab-color", color);
});

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

function normalizeContactEmail(value){
  return String(value || "").trim();
}

function normalizeTagCap(value){
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 20;
  return Math.min(120, Math.max(1, n));
}

function normalizeBooleanSetting(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized !== "0" && normalized !== "false" && normalized !== "off" && normalized !== "no";
}

function normalizeSplashSettingsPayload(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: normalizeBooleanSetting(input.enabled, true),
    mode: normalizeSplashMode(input.mode),
    randomCycleEnabled: normalizeBooleanSetting(input.randomCycleEnabled, false),
    randomCycleSeconds: normalizeCycleSeconds(input.randomCycleSeconds),
    allowedModes: normalizeAllowedSplashModes(input.allowedModes)
  };
}

function getSplashSettingsFromLocalStorage() {
  return normalizeSplashSettingsPayload({
    enabled: localStorage.getItem(SPLASH_ANIMATION_ENABLED_KEY) !== "0",
    mode: localStorage.getItem(SPLASH_MODE_KEY),
    randomCycleEnabled: localStorage.getItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY) === "1",
    randomCycleSeconds: localStorage.getItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY),
    allowedModes: normalizeAllowedSplashModes(localStorage.getItem(SPLASH_ALLOWED_MODES_KEY))
  });
}

function applySplashSettingsToLocalStorage(settings) {
  const normalized = normalizeSplashSettingsPayload(settings);
  localStorage.setItem(SPLASH_ANIMATION_ENABLED_KEY, normalized.enabled ? "1" : "0");
  localStorage.setItem(SPLASH_MODE_KEY, normalized.mode);
  localStorage.setItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY, normalized.randomCycleEnabled ? "1" : "0");
  localStorage.setItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY, String(normalized.randomCycleSeconds));
  localStorage.setItem(SPLASH_ALLOWED_MODES_KEY, JSON.stringify(normalized.allowedModes));
  return normalized;
}

function populateSplashModeOptions() {
  if (!splashMode) return;
  const currentValue = normalizeSplashMode(splashMode.value || localStorage.getItem(SPLASH_MODE_KEY));
  splashMode.innerHTML = [
    `<option value="random">Randomize each visit</option>`,
    ...SPLASH_MODE_CATALOG.map((mode) => `<option value="${mode.id}">${mode.label}</option>`)
  ].join("");
  splashMode.value = currentValue;
}

function getSelectedAllowedSplashModes() {
  if (!splashAllowedModes) return normalizeAllowedSplashModes(localStorage.getItem(SPLASH_ALLOWED_MODES_KEY));
  return Array.from(splashAllowedModes.querySelectorAll("[data-splash-allowed-mode]"))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function renderSplashAllowedModes() {
  if (!splashAllowedModes) return;
  const active = new Set(getSplashSettingsFromLocalStorage().allowedModes);
  splashAllowedModes.innerHTML = "";
  SPLASH_MODE_CATALOG.forEach((mode) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = mode.id;
    input.checked = active.has(mode.id);
    input.setAttribute("data-splash-allowed-mode", mode.id);
    const slider = document.createElement("span");
    slider.className = "slider";
    slider.setAttribute("aria-hidden", "true");
    const switchWrap = document.createElement("span");
    switchWrap.className = "switch";
    switchWrap.append(input, slider);
    const toggle = document.createElement("label");
    toggle.className = "setting-toggle";
    toggle.style.cursor = "pointer";
    toggle.append(switchWrap, document.createTextNode(mode.label));
    const card = document.createElement("div");
    card.className = "splash-allowed-card";
    card.append(toggle);
    splashAllowedModes.appendChild(card);
    input.addEventListener("change", () => {
      void persistSplashSettings();
    });
  });
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

function ensureAdminStateSettings() {
  adminState ||= {};
  adminState.settings ||= {};
  return adminState.settings;
}

function renderContactSettings(note = "") {
  const settings = ensureAdminStateSettings();
  const email = normalizeContactEmail(settings.contactEmail) || DEFAULT_CONTACT_EMAIL;
  if (contactEmailAddress) contactEmailAddress.value = email;
  if (contactEmailCurrent) {
    contactEmailCurrent.textContent = note
      ? `Contact email: ${email} (${note})`
      : `Contact email: ${email}`;
  }
}

async function loadContactSettings() {
  const settings = ensureAdminStateSettings();
  renderContactSettings();

  if (!getAdminToken()) {
    renderContactSettings("local cache only");
    return;
  }

  try {
    const saved = await apiFetch("/api/admin/settings/contact", { method: "GET" });
    settings.contactEmail = normalizeContactEmail(saved?.contactEmail) || DEFAULT_CONTACT_EMAIL;
    saveState(adminState);
    renderContactSettings("backend");
  } catch (error) {
    console.warn("Failed to load backend contact settings; using local cache.", error);
    renderContactSettings("local cache only");
  }
}

async function persistContactSettings() {
  const settings = ensureAdminStateSettings();
  const email = normalizeContactEmail(contactEmailAddress?.value) || DEFAULT_CONTACT_EMAIL;
  settings.contactEmail = email;
  saveState(adminState);
  renderContactSettings(getAdminToken() ? "saving..." : "local cache only");

  if (!getAdminToken()) {
    renderContactSettings("local cache only");
    return;
  }

  try {
    const saved = await apiFetch("/api/admin/settings/contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: email })
    });
    settings.contactEmail = normalizeContactEmail(saved?.contactEmail) || DEFAULT_CONTACT_EMAIL;
    saveState(adminState);
    renderContactSettings("backend");
  } catch (error) {
    console.warn("Failed to save backend contact settings; kept local cache.", error);
    renderContactSettings("local cache only");
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
  if (splashAllowedModes) {
    const controls = splashAllowedModes.querySelectorAll("input");
    controls.forEach((control) => {
      control.disabled = !splashEnabled;
    });
  }
  [splashAllowAllBtn, splashResetAllowedBtn, splashClearAllowedBtn].forEach((btn) => {
    if (btn) btn.disabled = !splashEnabled;
  });

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
  const splashSettings = getSplashSettingsFromLocalStorage();
  const { enabled: splashEnabled, mode, randomCycleEnabled: cycleEnabled, randomCycleSeconds: cycleSeconds, allowedModes } = splashSettings;
  if (splashMode) splashMode.value = mode;
  const bannerBezierEnabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(
    localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY)
  );
  const savedTagCap = normalizeTagCap(localStorage.getItem(TAG_CAP_KEY));
  const aiEnabled = localStorage.getItem(AI_FEATURES_ENABLED_KEY) !== "0";
  if (splashAnimationEnabled) splashAnimationEnabled.checked = splashEnabled;
  if (splashRandomCycleEnabled) splashRandomCycleEnabled.checked = cycleEnabled;
  if (splashRandomCycleSeconds) splashRandomCycleSeconds.value = String(cycleSeconds);
  if (splashAllowedModes) {
    const allowedSet = new Set(allowedModes);
    Array.from(splashAllowedModes.querySelectorAll("[data-splash-allowed-mode]")).forEach((input) => {
      input.checked = allowedSet.has(input.value);
    });
  }
  if (bannerBezierLogoEnabled) bannerBezierLogoEnabled.checked = bannerBezierEnabled;
  if (bannerLogoAnimationStyle) bannerLogoAnimationStyle.value = bannerAnimationStyle;
  if (tagCap) tagCap.value = String(savedTagCap);
  if (aiFeaturesEnabled) aiFeaturesEnabled.checked = aiEnabled;

  if (splashModeCurrent) {
    const cycleText = mode === "random"
      ? ` | Auto change: ${cycleEnabled ? `On (${cycleSeconds}s)` : "Off"}`
      : "";
    const allowedText = ` | Allowed: ${allowedModes.length}/${SPLASH_MODE_IDS.length}`;
    splashModeCurrent.textContent = splashEnabled
      ? `Current: ${describeSplashMode(mode)}${cycleText}${allowedText}`
      : "Current: Disabled";
  }
  if (splashAllowedSummary) {
    splashAllowedSummary.textContent = `${allowedModes.length} of ${SPLASH_MODE_IDS.length} animations allowed`;
  }
  if (splashAllowedWarning) {
    let warning = "";
    if (!allowedModes.length) {
      warning = splashEnabled
        ? "No splash animations are currently allowed. Visitors will only see the static splash logo until at least one animation is enabled here."
        : "No splash animations are currently allowed.";
    } else if (mode !== "random" && !allowedModes.includes(mode)) {
      warning = `The selected active animation (${describeSplashMode(mode)}) is currently disallowed, so visitors will see a static splash until it is re-enabled or you choose another active mode.`;
    }
    splashAllowedWarning.textContent = warning;
    splashAllowedWarning.classList.toggle("is-warn", !!warning);
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

async function loadSplashSettings() {
  const fallback = getSplashSettingsFromLocalStorage();
  if (!getAdminToken()) {
    applySplashSettingsToLocalStorage(fallback);
    syncSplashModeUI();
    return;
  }
  try {
    const saved = await apiFetch("/api/admin/settings/splash", { method: "GET" });
    applySplashSettingsToLocalStorage(saved);
  } catch (error) {
    console.warn("Failed to load backend splash settings; using local cache.", error);
    applySplashSettingsToLocalStorage(fallback);
  }
  syncSplashModeUI();
}

async function loadImageVariantSettings() {
  renderImageVariantSettings(DEFAULT_IMAGE_VARIANTS);
  if (!getAdminToken()) {
    setImageVariantStatus("Sign in to the admin to load backend variant settings.");
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

let adminState = await loadState();
ensureAdminStateSettings();

function persistSettings({ refreshBanner = false } = {}){
  const splashEnabled = !!splashAnimationEnabled?.checked;
  const mode = normalizeSplashMode(splashMode?.value);
  const cycleEnabled = !!splashRandomCycleEnabled?.checked;
  const cycleSeconds = normalizeCycleSeconds(splashRandomCycleSeconds?.value);
  const allowedModes = getSelectedAllowedSplashModes();
  const bannerBezierEnabled = !!bannerBezierLogoEnabled?.checked;
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(bannerLogoAnimationStyle?.value);
  const savedTagCap = normalizeTagCap(tagCap?.value);
  const aiEnabled = !!aiFeaturesEnabled?.checked;
  applySplashSettingsToLocalStorage({
    enabled: splashEnabled,
    mode,
    randomCycleEnabled: cycleEnabled,
    randomCycleSeconds: cycleSeconds,
    allowedModes
  });
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

async function persistSplashSettings() {
  persistSettings();
  if (!getAdminToken()) return;
  try {
    const saved = await apiFetch("/api/admin/settings/splash", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getSplashSettingsFromLocalStorage())
    });
    applySplashSettingsToLocalStorage(saved);
    syncSplashModeUI();
  } catch (error) {
    console.warn("Failed to save backend splash settings; kept local cache.", error);
  }
}

async function saveImageVariantSettings() {
  if (!getAdminToken()) {
    setImageVariantStatus("Sign in to the admin to save backend variant settings.", "error");
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



populateSplashModeOptions();
renderSplashAllowedModes();
syncSplashModeUI();
await loadSplashSettings();
await loadContactSettings();
await loadImageVariantSettings();
setSettingsTab("splash");

splashAnimationEnabled?.addEventListener("change", () => {
  updateRandomizeControls();
  void persistSplashSettings();
});

splashMode?.addEventListener("change", () => {
  updateRandomizeControls();
  void persistSplashSettings();
});

splashRandomCycleEnabled?.addEventListener("change", () => {
  updateRandomizeControls();
  void persistSplashSettings();
});

splashRandomCycleSeconds?.addEventListener("change", () => {
  void persistSplashSettings();
});

splashAllowAllBtn?.addEventListener("click", () => {
  Array.from(splashAllowedModes?.querySelectorAll("[data-splash-allowed-mode]") || []).forEach((input) => {
    input.checked = true;
  });
  void persistSplashSettings();
});

splashResetAllowedBtn?.addEventListener("click", () => {
  const defaults = new Set(DEFAULT_ALLOWED_SPLASH_MODES);
  Array.from(splashAllowedModes?.querySelectorAll("[data-splash-allowed-mode]") || []).forEach((input) => {
    input.checked = defaults.has(input.value);
  });
  void persistSplashSettings();
});

splashClearAllowedBtn?.addEventListener("click", () => {
  Array.from(splashAllowedModes?.querySelectorAll("[data-splash-allowed-mode]") || []).forEach((input) => {
    input.checked = false;
  });
  void persistSplashSettings();
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

contactEmailAddress?.addEventListener("change", () => {
  persistContactSettings();
});

contactEmailAddress?.addEventListener("blur", () => {
  persistContactSettings();
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






