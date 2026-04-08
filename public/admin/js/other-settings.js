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
import { syncFloatingFields } from "../../assets/js/floating-fields.js";

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
const BANNER_STATIC_LOGO_SRC_KEY = "toji_banner_static_logo_src_v1";
const BANNER_LOGO_BORDER_ENABLED_KEY = "toji_banner_logo_border_enabled_v1";
const BANNER_LOGO_BORDER_COLOR_KEY = "toji_banner_logo_border_color_v1";
const TAG_CAP_KEY = "toji_ai_tag_cap_v1";
const AI_FEATURES_ENABLED_KEY = "toji_ai_features_enabled_v1";
const DEFAULT_CONTACT_EMAIL = "you@example.com";
let bannerStaticLogoOptions = [];

const DEFAULT_IMAGE_VARIANTS = Object.freeze({
  thumbMaxWidth: 560,
  thumbQuality: 78,
  webMaxWidth: 1800,
  webQuality: 84
});

const splashModeField = document.getElementById("splashModeField");
const splashMode = document.getElementById("splashMode");
const splashModeCurrent = document.getElementById("splashModeCurrent");
const splashAnimationEnabled = document.getElementById("splashAnimationEnabled");
const splashAnimationToggleBadge = document.getElementById("splashAnimationToggleBadge");
const splashControlsBlock = document.getElementById("splashControlsBlock");
const splashRandomOptions = document.getElementById("splashRandomOptions");
const splashRandomCycleEnabled = document.getElementById("splashRandomCycleEnabled");
const splashRandomCycleSecondsField = document.getElementById("splashRandomCycleSecondsField");
const splashRandomCycleSecondsFieldWrapper = splashRandomCycleSecondsField?.closest(".field");
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
const bannerLogoAnimationStyleField = document.getElementById("bannerLogoAnimationStyleField");
const bannerLogoAnimationStyle = document.getElementById("bannerLogoAnimationStyle");
const bannerStaticLogoSrc = document.getElementById("bannerStaticLogoSrc");
const bannerStaticLogoField = bannerStaticLogoSrc?.closest(".field");
const bannerStaticLogoUpload = document.getElementById("bannerStaticLogoUpload");
const bannerStaticLogoUploadBtn = document.getElementById("bannerStaticLogoUploadBtn");
const bannerStaticLogoUploadStatus = document.getElementById("bannerStaticLogoUploadStatus");
const bannerLogoBorderEnabled = document.getElementById("bannerLogoBorderEnabled");
const bannerLogoBorderToggleBadge = document.getElementById("bannerLogoBorderToggleBadge");
const bannerLogoBorderToggleLabel = document.getElementById("bannerLogoBorderToggleLabel");
const bannerLogoBorderColor = document.getElementById("bannerLogoBorderColor");
const bannerLogoBorderColorField = bannerLogoBorderColor?.closest(".field");
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
let splashPreviewModes = [...SPLASH_PREVIEW_MODE_ORDER];

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
  if (style === "circles") return "circles";
  if (style === "plot") return "plot";
  if (style === "radar") return "radar";
  if (style === "sphere") return "sphere";
  return "sphere";
}

function normalizeBannerStaticLogoSrc(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return bannerStaticLogoOptions[0]?.value || "";
  const matchedOption = bannerStaticLogoOptions.find((option) =>
    option.value === normalized || option.label === normalized || option.value.endsWith("/" + normalized)
  );
  if (matchedOption) return matchedOption.value;
  if (/\.(png|jpe?g)$/i.test(normalized) && !normalized.includes("/") && !normalized.includes("\\")) return "/assets/img/logos/" + normalized;
  return bannerStaticLogoOptions[0]?.value || normalized;
}

function normalizeBannerLogoBorderColor(value) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : "#871818";
}

function setBannerStaticLogoUploadStatus(message = "", tone = "") {
  if (!bannerStaticLogoUploadStatus) return;
  bannerStaticLogoUploadStatus.textContent = message;
  bannerStaticLogoUploadStatus.style.color = tone === "error"
    ? "#d15353"
    : tone === "success"
      ? "var(--accent)"
      : "";
}

function flashBannerStaticLogoPicker() {
  if (!bannerStaticLogoUpload) return;
  bannerStaticLogoUpload.classList.remove("other-settings-file-flash");
  void bannerStaticLogoUpload.offsetWidth;
  bannerStaticLogoUpload.classList.add("other-settings-file-flash");
  window.setTimeout(() => {
    bannerStaticLogoUpload.classList.remove("other-settings-file-flash");
  }, 1500);
  if (typeof bannerStaticLogoUpload.focus === "function") bannerStaticLogoUpload.focus();
}

function mapBannerLogoItems(items) {
  return Array.isArray(items)
    ? items
      .map((item) => ({
        value: String(item?.src || "").trim(),
        label: String(item?.name || item?.src || "").trim()
      }))
      .filter((item) => item.value && item.label)
    : [];
}

function populateBannerStaticLogoOptions(preferredValue = "") {
  if (!bannerStaticLogoSrc) return "";
  const normalizedPreferred = String(preferredValue || "").trim();
  bannerStaticLogoSrc.innerHTML = bannerStaticLogoOptions.length
    ? bannerStaticLogoOptions
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join("")
    : `<option value="">No logo files found</option>`;
  const nextValue = normalizeBannerStaticLogoSrc(
    normalizedPreferred || bannerStaticLogoSrc.value || localStorage.getItem(BANNER_STATIC_LOGO_SRC_KEY)
  );
  bannerStaticLogoSrc.value = nextValue;
  return nextValue;
}

function getBannerStaticLogoLabel(value) {
  const normalized = normalizeBannerStaticLogoSrc(value);
  return bannerStaticLogoOptions.find((option) => option.value === normalized)?.label || "Static image logo";
}

async function loadBannerStaticLogoOptions(preferredValue = "") {
  if (!bannerStaticLogoSrc) return "";
  const localPreferred = String(preferredValue || localStorage.getItem(BANNER_STATIC_LOGO_SRC_KEY) || "").trim();
  try {
    const res = await fetch(API_BASE + "/api/public/banner-logos", { credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    bannerStaticLogoOptions = mapBannerLogoItems(json?.items);
    const selectedValue = populateBannerStaticLogoOptions(localPreferred);
    const statusMessage = bannerStaticLogoOptions.length
      ? (getAdminToken()
          ? bannerStaticLogoOptions.length + " logo file" + (bannerStaticLogoOptions.length === 1 ? "" : "s") + " loaded."
          : "Logo files loaded. Sign in to upload new ones.")
      : "No PNG or JPEG logo files found in assets/img/logos/.";
    setBannerStaticLogoUploadStatus(statusMessage);
    syncAllFloatingFields();
    return selectedValue;
  } catch (error) {
    console.warn("Failed to load banner logo files.", error);
    bannerStaticLogoOptions = [];
    const selectedValue = populateBannerStaticLogoOptions(localPreferred);
    setBannerStaticLogoUploadStatus(`Failed to load logo files: ${error?.message || error}`, "error");
    syncAllFloatingFields();
    return selectedValue;
  }
}

async function uploadBannerStaticLogoFile() {
  const file = bannerStaticLogoUpload?.files?.[0];
  if (!file) {
    flashBannerStaticLogoPicker();
    setBannerStaticLogoUploadStatus("Choose a PNG or JPEG file to upload.", "error");
    return;
  }
  if (!getAdminToken()) {
    setBannerStaticLogoUploadStatus("Sign in to upload logo files.", "error");
    return;
  }
  setBannerStaticLogoUploadStatus(`Uploading ${file.name}...`);
  const body = new FormData();
  body.append("file", file);
  if (bannerStaticLogoUploadBtn) bannerStaticLogoUploadBtn.disabled = true;
  try {
    const json = await apiFetch("/api/admin/banner-logos", { method: "POST", body });
    bannerStaticLogoOptions = mapBannerLogoItems(json?.items);
    const selectedValue = String(json?.item?.src || "").trim();
    populateBannerStaticLogoOptions(selectedValue);
    if (bannerStaticLogoUpload) bannerStaticLogoUpload.value = "";
    persistSettings({ refreshBanner: true });
    setBannerStaticLogoUploadStatus(`Uploaded ${json?.item?.name || file.name}.`, "success");
  } catch (error) {
    setBannerStaticLogoUploadStatus(`Upload failed: ${error?.message || error}`, "error");
  } finally {
    if (bannerStaticLogoUploadBtn) bannerStaticLogoUploadBtn.disabled = false;
  }
}

function normalizeContactEmail(value){
  return String(value || "").trim();
}

function syncFloatingFieldState(field, control) {
  if (!field || !control) return;
  field.classList.toggle("has-value", !!String(control.value ?? "").trim());
}

function bindFloatingField(field, control) {
  if (!field || !control || field.dataset.floatingBound === "1") return;
  const sync = () => syncFloatingFieldState(field, control);
  control.addEventListener("input", sync);
  control.addEventListener("change", sync);
  control.addEventListener("blur", sync);
  field.dataset.floatingBound = "1";
  sync();
}

function syncAllFloatingFields(root = document) {
  syncFloatingFields(root, ".other-settings-floating-field");
}

function enhanceOtherSettingsFloatingFields(root = document) {
  root.querySelectorAll(".other-settings-tabpane .field").forEach((field) => {
    const directChildren = Array.from(field.children || []);
    let floatingField = directChildren.find((node) => node.classList?.contains("other-settings-floating-field"));
    if (!floatingField) {
      const labelNode = directChildren.find((node) => node.classList?.contains("sub"));
      const control = directChildren.find((node) => /^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName || ""));
      if (!labelNode || !control) return;
      const labelText = String(labelNode.textContent || "").trim();
      if (!labelText) return;
      floatingField = document.createElement("div");
      floatingField.className = "other-settings-floating-field";
      if (control.id && !floatingField.id) floatingField.id = control.id + "Field";
      control.setAttribute("aria-label", control.getAttribute("aria-label") || labelText);
      if (control.tagName !== "SELECT") control.setAttribute("placeholder", " ");
      const floatingLabel = document.createElement("label");
      floatingLabel.className = "other-settings-floating-label";
      if (control.id) floatingLabel.htmlFor = control.id;
      floatingLabel.textContent = labelText;
      labelNode.remove();
      field.prepend(floatingField);
      floatingField.append(control, floatingLabel);
    }
    const control = floatingField.querySelector("input, select, textarea");
    if (control) bindFloatingField(floatingField, control);
  });
  syncAllFloatingFields(root);
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

function getEffectiveSplashMode(mode, allowedModes = []) {
  const normalizedMode = normalizeSplashMode(mode);
  const normalizedAllowedModes = normalizeAllowedSplashModes(allowedModes);
  if (normalizedMode === "random") return "random";
  if (normalizedAllowedModes.includes(normalizedMode)) return normalizedMode;
  return normalizedAllowedModes[0] || "random";
}

function populateSplashModeOptions(allowedModes = null, preferredMode = null) {
  if (!splashMode) return "random";
  const normalizedAllowedModes = normalizeAllowedSplashModes(
    allowedModes == null ? getSelectedAllowedSplashModes() : allowedModes
  );
  const currentValue = preferredMode == null
    ? normalizeSplashMode(splashMode.value || localStorage.getItem(SPLASH_MODE_KEY))
    : normalizeSplashMode(preferredMode);
  const availableCatalog = SPLASH_MODE_CATALOG.filter((mode) => normalizedAllowedModes.includes(mode.id));
  splashMode.innerHTML = [
    `<option value="random">Randomize each visit</option>`,
    ...availableCatalog.map((mode) => `<option value="${mode.id}">${mode.label}</option>`)
  ].join("");
  const effectiveMode = getEffectiveSplashMode(currentValue, normalizedAllowedModes);
  splashMode.value = effectiveMode;
  return effectiveMode;
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
  syncAllFloatingFields();
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
  syncAllFloatingFields();
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

function getSplashPreviewModes() {
  const allowedModes = normalizeAllowedSplashModes(getSelectedAllowedSplashModes());
  return allowedModes.length ? allowedModes : [...SPLASH_PREVIEW_MODE_ORDER];
}

async function openSplashPreviewModal() {
  if (!splashPreviewModal) return;
  splashPreviewModal.hidden = false;
  document.body.classList.add("other-settings-modal-open");
  const selectedMode = normalizeSplashMode(splashMode?.value);
  const previewPool = getSplashPreviewModes();
  splashPreviewModes = [...previewPool];
  const preferredMode = selectedMode === "random"
    ? previewPool[Math.floor(Math.random() * previewPool.length)] || "nodes"
    : selectedMode;
  const foundIndex = splashPreviewModes.indexOf(preferredMode);
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
  splashPreviewModes = getSplashPreviewModes();
  const modeCount = splashPreviewModes.length;
  if (!modeCount) return;
  splashPreviewModeIndex = ((Number(index) % modeCount) + modeCount) % modeCount;

  const existingSplash = document.getElementById("splashScreen");
  if (existingSplash) {
    existingSplash.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
  }
  renderSplashPreviewMarkup();

  const previewMode = splashPreviewModes[splashPreviewModeIndex];
  if (splashPreviewModeName) {
    splashPreviewModeName.textContent = `Animation: ${describeSplashMode(previewMode)}`;
  }
  await initializeHomeSplash({
    forceShow: true,
    bindTopLeftBrand: false,
    disableMouseInteraction: true,
    forceMode: previewMode
  });
  document.getElementById("splashLogo")?.remove();
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
  splashRandomCycleSecondsFieldWrapper?.classList.toggle("is-disabled-control", !isRandom || !splashRandomCycleEnabled?.checked);
  if (bannerLogoAnimationStyle) {
    const bannerStyleEnabled = !!bannerBezierLogoEnabled?.checked;
    bannerLogoAnimationStyle.disabled = !bannerStyleEnabled;
    const bannerStyleField = bannerLogoAnimationStyle.closest(".field");
    bannerStyleField?.classList.toggle("is-disabled-control", !bannerStyleEnabled);
  }
  if (bannerStaticLogoSrc) {
    const bannerStaticEnabled = !bannerBezierLogoEnabled?.checked;
    bannerStaticLogoSrc.disabled = !bannerStaticEnabled;
    if (bannerStaticLogoUpload) {
      bannerStaticLogoUpload.disabled = !bannerStaticEnabled;
      if (!bannerStaticEnabled) bannerStaticLogoUpload.value = "";
    }
    if (bannerStaticLogoUploadBtn) bannerStaticLogoUploadBtn.disabled = !bannerStaticEnabled;
    if (!bannerStaticEnabled) setBannerStaticLogoUploadStatus("");
    bannerStaticLogoField?.classList.toggle("is-disabled-control", !bannerStaticEnabled);
  }
  if (bannerLogoBorderColor) {
    const borderEnabled = !!bannerLogoBorderEnabled?.checked;
    bannerLogoBorderColor.disabled = !borderEnabled;
    bannerLogoBorderColorField?.classList.toggle("is-disabled-control", !borderEnabled);
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
  const effectiveMode = populateSplashModeOptions(allowedModes, mode);
  syncFloatingFieldState(splashModeField, splashMode);
  const bannerBezierEnabled = localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) === "1";
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(
    localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY)
  );
  const bannerStaticLogo = normalizeBannerStaticLogoSrc(
    localStorage.getItem(BANNER_STATIC_LOGO_SRC_KEY)
  );
  const bannerBorderEnabled = localStorage.getItem(BANNER_LOGO_BORDER_ENABLED_KEY) !== "0";
  const bannerBorderColor = normalizeBannerLogoBorderColor(localStorage.getItem(BANNER_LOGO_BORDER_COLOR_KEY));
  const savedTagCap = normalizeTagCap(localStorage.getItem(TAG_CAP_KEY));
  const aiEnabled = localStorage.getItem(AI_FEATURES_ENABLED_KEY) !== "0";
  if (splashAnimationEnabled) splashAnimationEnabled.checked = splashEnabled;
  if (splashRandomCycleEnabled) splashRandomCycleEnabled.checked = cycleEnabled;
  if (splashRandomCycleSeconds) splashRandomCycleSeconds.value = String(cycleSeconds);
  syncFloatingFieldState(splashRandomCycleSecondsField, splashRandomCycleSeconds);
  if (splashAllowedModes) {
    const allowedSet = new Set(allowedModes);
    Array.from(splashAllowedModes.querySelectorAll("[data-splash-allowed-mode]")).forEach((input) => {
      input.checked = allowedSet.has(input.value);
    });
  }
  if (bannerBezierLogoEnabled) bannerBezierLogoEnabled.checked = bannerBezierEnabled;
  if (bannerLogoAnimationStyle) bannerLogoAnimationStyle.value = bannerAnimationStyle;
  syncFloatingFieldState(bannerLogoAnimationStyleField, bannerLogoAnimationStyle);
  if (bannerStaticLogoSrc) bannerStaticLogoSrc.value = bannerStaticLogo;
  syncFloatingFieldState(bannerStaticLogoSrc?.closest(".other-settings-floating-field") || bannerStaticLogoField, bannerStaticLogoSrc);
  if (bannerLogoBorderEnabled) bannerLogoBorderEnabled.checked = bannerBorderEnabled;
  if (bannerLogoBorderColor) bannerLogoBorderColor.value = bannerBorderColor;
  if (tagCap) tagCap.value = String(savedTagCap);
  if (aiFeaturesEnabled) aiFeaturesEnabled.checked = aiEnabled;
  syncAllFloatingFields();

  if (splashModeCurrent) {
    const cycleText = effectiveMode === "random"
      ? ` | Auto change: ${cycleEnabled ? `On (${cycleSeconds}s)` : "Off"}`
      : "";
    const allowedText = ` | Allowed: ${allowedModes.length}/${SPLASH_MODE_IDS.length}`;
    splashModeCurrent.textContent = splashEnabled
      ? `Current: ${describeSplashMode(effectiveMode)}${cycleText}${allowedText}`
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
    if (!bannerBezierEnabled) bannerLogoCurrent.textContent = `Banner: Static ${getBannerStaticLogoLabel(bannerStaticLogo)}`;
    else bannerLogoCurrent.textContent = `Banner: Animated ${bannerAnimationStyle === "plot" ? "x/y plot" : bannerAnimationStyle === "radar" ? "radar" : bannerAnimationStyle === "sphere" ? "wireframe sphere" : "circles"} canvas`;
  }
  if (bannerBezierToggleLabel) bannerBezierToggleLabel.style.color = "";
  if (bannerBezierToggleBadge) {
    bannerBezierToggleBadge.textContent = bannerBezierEnabled ? "Enabled" : "Disabled";
    bannerBezierToggleBadge.classList.toggle("is-enabled", bannerBezierEnabled);
    bannerBezierToggleBadge.classList.toggle("is-disabled", !bannerBezierEnabled);
  }
  if (bannerLogoBorderToggleLabel) bannerLogoBorderToggleLabel.style.color = "";
  if (bannerLogoBorderToggleBadge) {
    bannerLogoBorderToggleBadge.textContent = bannerBorderEnabled ? "Enabled" : "Disabled";
    bannerLogoBorderToggleBadge.classList.toggle("is-enabled", bannerBorderEnabled);
    bannerLogoBorderToggleBadge.classList.toggle("is-disabled", !bannerBorderEnabled);
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
    setImageVariantStatus("");
  } catch (error) {
    setImageVariantStatus(`Failed to load backend settings: ${error?.message || error}`, "error");
  }
}

let adminState = await loadState();
ensureAdminStateSettings();

function persistSettings({ refreshBanner = false } = {}){
  const splashEnabled = !!splashAnimationEnabled?.checked;
  const allowedModes = getSelectedAllowedSplashModes();
  const mode = getEffectiveSplashMode(splashMode?.value, allowedModes);
  if (splashMode) splashMode.value = mode;
  const cycleEnabled = !!splashRandomCycleEnabled?.checked;
  const cycleSeconds = normalizeCycleSeconds(splashRandomCycleSeconds?.value);
  const bannerBezierEnabled = !!bannerBezierLogoEnabled?.checked;
  const bannerAnimationStyle = normalizeBannerLogoAnimationStyle(bannerLogoAnimationStyle?.value);
  const bannerStaticLogo = normalizeBannerStaticLogoSrc(bannerStaticLogoSrc?.value);
  const bannerBorderEnabled = !!bannerLogoBorderEnabled?.checked;
  const bannerBorderColor = normalizeBannerLogoBorderColor(bannerLogoBorderColor?.value);
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
  localStorage.setItem(BANNER_STATIC_LOGO_SRC_KEY, bannerStaticLogo);
  localStorage.setItem(BANNER_LOGO_BORDER_ENABLED_KEY, bannerBorderEnabled ? "1" : "0");
  localStorage.setItem(BANNER_LOGO_BORDER_COLOR_KEY, bannerBorderColor);
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



enhanceOtherSettingsFloatingFields();
await loadBannerStaticLogoOptions();
populateSplashModeOptions();
bindFloatingField(splashModeField, splashMode);
bindFloatingField(splashRandomCycleSecondsField, splashRandomCycleSeconds);
bindFloatingField(bannerLogoAnimationStyleField, bannerLogoAnimationStyle);
bindFloatingField(bannerStaticLogoSrc?.closest(".other-settings-floating-field"), bannerStaticLogoSrc);
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

bannerStaticLogoSrc?.addEventListener("change", () => {
  persistSettings({ refreshBanner: true });
});

bannerLogoBorderEnabled?.addEventListener("change", () => {
  updateRandomizeControls();
  persistSettings({ refreshBanner: true });
});

bannerLogoBorderColor?.addEventListener("input", () => {
  persistSettings({ refreshBanner: true });
});

bannerLogoBorderEnabled?.addEventListener("change", () => {
  updateRandomizeControls();
  persistSettings({ refreshBanner: true });
});

bannerLogoBorderColor?.addEventListener("input", () => {
  persistSettings({ refreshBanner: true });
});

bannerStaticLogoUploadBtn?.addEventListener("click", () => {
  if (bannerStaticLogoUploadBtn.disabled || bannerBezierLogoEnabled?.checked) return;
  void uploadBannerStaticLogoFile();
});

bannerStaticLogoUpload?.addEventListener("change", () => {
  const file = bannerStaticLogoUpload.files?.[0];
  setBannerStaticLogoUploadStatus(file ? `Ready to upload ${file.name}` : "");
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















