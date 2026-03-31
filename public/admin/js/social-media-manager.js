import { ensureBaseStyles, setYearFooter, showToast, apiFetch, confirmToast, el } from "../admin.js";
import {
  categoryOptions,
  cleanSlug,
  cleanText,
  getPlatformFormMeta,
  normalizePlatformIconLocation,
  parseTagsInput,
  resolvePlatformIconSrc
} from "./social-platform-utils.js";

ensureBaseStyles();
setYearFooter();

const platformList = document.getElementById("platformList");
const platformSummary = document.getElementById("platformSummary");
const openPlatformCreateDialogBtn = document.getElementById("openPlatformCreateDialogBtn");
const closePlatformCreateDialogBtn = document.getElementById("closePlatformCreateDialogBtn");
const cancelPlatformCreateDialogBtn = document.getElementById("cancelPlatformCreateDialogBtn");
const platformCreateDialog = document.getElementById("platformCreateDialog");
const platformCreateForm = document.getElementById("platformCreateForm");
const platformNewId = document.getElementById("platformNewId");
const platformNewName = document.getElementById("platformNewName");
const platformNewIconLocation = document.getElementById("platformNewIconLocation");
const platformCreateStatus = document.getElementById("platformCreateStatus");
const platformCreateDialogPanel = platformCreateDialog?.querySelector('[role="dialog"]');
let lastFocusedBeforeDialog = null;
let allowedPlatformOptions = [];
let platforms = [];
let activePlatformId = "";
const TAB_BORDER_PALETTE = ["#2a97d4", "#2ea97d", "#d18b2e", "#d15353", "#8a63d2", "#cf5ea8", "#3aa5a0", "#7e8c2b"];

function getPlatformTabIconSrc(platform) {
  return resolvePlatformIconSrc(platform?.iconLocation || platform?.config?.iconLocation, String(window.location.pathname || ""));
}

function ensureSocialManagerStyles() {
  if (document.getElementById("social-manager-tabs-styles")) return;
  const style = document.createElement("style");
  style.id = "social-manager-tabs-styles";
  style.textContent = `
    .smm-tabbar{
      display:flex;
      gap:0;
      flex-wrap:wrap;
      margin-top:8px;
      border-bottom:1px solid var(--line);
    }
    .smm-tab{
      border:1px solid transparent;
      border-bottom:1px solid color-mix(in srgb, var(--smm-tab-color, var(--accent)) 38%, var(--line));
      background: transparent;
      color: var(--muted);
      border-radius:10px 10px 0 0;
      padding:8px 12px;
      cursor:pointer;
      font-size:13px;
      margin-bottom:-1px;
      display:inline-flex;
      align-items:center;
      gap:8px;
    }
    .smm-tab-icon{
      width:16px;
      height:16px;
      border-radius:4px;
      background: color-mix(in srgb, var(--smm-tab-color, var(--accent)) 14%, transparent);
      flex:0 0 auto;
      display:inline-block;
    }
    .smm-tab-icon img{
      display:block;
      width:100%;
      height:100%;
      object-fit:contain;
    }
    .smm-tab[aria-selected="true"]{
      border-color: color-mix(in srgb, var(--smm-tab-color, var(--accent)) 88%, var(--line));
      border-bottom-color: transparent;
      background: color-mix(in srgb, var(--smm-tab-color, var(--accent)) 16%, var(--panel));
      color: var(--text);
    }
    .smm-tabs-shell{
      display:grid;
      gap:0;
      margin-top:0;
    }
    .smm-panel{
      border-radius:0 0 14px 14px;
      margin-top:0;
      padding:16px 14px 18px;
      border:1px solid color-mix(in srgb, var(--smm-active-color, var(--accent)) 80%, var(--line));
      border-top-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 92%, var(--line));
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--smm-active-color, var(--accent)) 9%, var(--panel)) 0%, color-mix(in srgb, var(--smm-active-color, var(--accent)) 5%, var(--panel)) 100%);
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--smm-active-color, var(--accent)) 24%, transparent);
    }
    .smm-header-copy{
      display:grid;
      gap:8px;
      margin-bottom:14px;
    }
    .smm-title-row{
      display:flex;
      align-items:baseline;
      gap:10px;
      flex-wrap:wrap;
    }
    .smm-title-row h3{
      margin:0;
      font-size: 18px;
    }
    .smm-slug{
      color:var(--muted);
      font-size:13px;
    }
    .smm-toggle-row{
      display:flex;
      align-items:center;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:18px;
    }
    .smm-switch{
      position:relative;
      display:inline-flex;
      align-items:center;
      cursor:pointer;
    }
    .smm-switch input{
      position:absolute;
      opacity:0;
      pointer-events:none;
    }
    .smm-switch-track{
      width:56px;
      height:30px;
      border-radius:999px;
      border:1px solid color-mix(in srgb, var(--smm-active-color, var(--accent)) 44%, var(--line));
      background: color-mix(in srgb, var(--smm-active-color, var(--accent)) 8%, var(--panel));
      position:relative;
      transition:background .18s ease, border-color .18s ease;
      box-shadow: inset 0 1px 2px rgba(0,0,0,.18);
    }
    .smm-switch-thumb{
      position:absolute;
      top:3px;
      left:3px;
      width:22px;
      height:22px;
      border-radius:50%;
      background: #eef3ff;
      transition:transform .18s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,.24);
    }
    .smm-switch input:checked + .smm-switch-track{
      background: color-mix(in srgb, var(--smm-active-color, var(--accent)) 24%, var(--panel));
      border-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 76%, var(--line));
    }
    .smm-switch input:checked + .smm-switch-track .smm-switch-thumb{
      transform:translateX(26px);
    }
    .smm-state{
      display:inline-flex;
      align-items:center;
      min-height:30px;
      padding:0 22px;
      border-radius:999px;
      border:1px solid color-mix(in srgb, #36b67e 44%, var(--line));
      background: color-mix(in srgb, #36b67e 16%, var(--panel));
      color: color-mix(in srgb, #6ce7ae 72%, var(--text));
      font-size:13px;
      font-weight:600;
      cursor:pointer;
      user-select:none;
      transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease;
    }
    .smm-state[data-enabled="false"]{
      border-color: color-mix(in srgb, #aa6370 48%, var(--line));
      background: color-mix(in srgb, #aa6370 14%, var(--panel));
      color: color-mix(in srgb, #f2d2d9 78%, var(--text));
    }
    .smm-state:hover{
      transform:translateY(-1px);
      box-shadow:0 6px 16px rgba(0,0,0,.18);
    }
    .smm-state:focus-visible{
      outline:2px solid color-mix(in srgb, var(--smm-active-color, var(--accent)) 72%, white);
      outline-offset:2px;
    }
    .smm-text-stack{
      display:grid;
      gap:16px;
    }
    .smm-divider{
      height:1px;
      margin:18px 0;
      background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--line) 88%, var(--smm-active-color, var(--accent))) 12%, color-mix(in srgb, var(--line) 88%, var(--smm-active-color, var(--accent))) 88%, transparent 100%);
      opacity:.55;
    }
    .smm-grid{
      display:grid;
      gap:14px 12px;
    }
    .smm-grid--details{
      grid-template-columns:repeat(auto-fit, minmax(190px, 1fr));
    }
    .smm-grid--auth{
      grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));
    }
    .smm-span-all{
      grid-column:1 / -1;
    }
    .smm-panel .field{
      margin-top:0;
      min-width:0;
    }
    .smm-panel .field > label:first-child,
    .smm-panel .field > .sub:first-child{
      display:block;
      margin-bottom:8px;
    }
    .smm-panel input,
    .smm-panel select,
    .smm-panel textarea{
      font-size:15px;
      background: color-mix(in srgb, var(--bg) 34%, var(--panel));
      border-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 34%, var(--line));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 8px 18px rgba(0,0,0,.12);
    }
    .smm-panel input:hover,
    .smm-panel select:hover,
    .smm-panel textarea:hover{
      border-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 52%, var(--line));
      background: color-mix(in srgb, var(--bg) 28%, var(--panel));
    }
    .smm-panel input:focus,
    .smm-panel select:focus,
    .smm-panel textarea:focus{
      outline:none;
      border-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 72%, white);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--smm-active-color, var(--accent)) 18%, transparent), 0 10px 22px rgba(0,0,0,.18);
      background: color-mix(in srgb, var(--bg) 22%, var(--panel));
    }
    .smm-panel input[readonly],
    .smm-panel select:disabled{
      background: color-mix(in srgb, var(--bg) 18%, var(--panel));
      color: color-mix(in srgb, var(--muted) 82%, var(--text));
      border-color: color-mix(in srgb, var(--line) 92%, var(--smm-active-color, var(--accent)));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
    }
    .smm-panel textarea{
      min-height:84px;
    }
    .smm-text-stack textarea{
      min-height:44px;
    }
    .smm-grid--auth textarea{
      min-height:44px;
    }
    .smm-actions{
      display:flex;
      align-items:center;
      gap:12px;
      flex-wrap:wrap;
      margin-top:14px;
    }
    .smm-actions .sub{
      margin:0;
    }
    .smm-body{
      border:0;
      padding:0;
      margin:0;
      min-width:0;
      display:grid;
      gap:0;
    }
    .smm-body[disabled]{
      opacity:.6;
      filter:saturate(.72);
    }
    @media (max-width: 900px){
      .smm-grid--details{
        grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));
      }
    }
    @media (max-width: 640px){
      .smm-panel{
        padding:14px 12px 16px;
      }
      .smm-grid--details,
      .smm-grid--auth{
        grid-template-columns:1fr;
      }
      .smm-title-row{
        gap:6px;
      }
    }
  `;
  document.head.appendChild(style);
}

function setDialogOpen(open) {
  if (!platformCreateDialog) return;
  platformCreateDialog.hidden = !open;
  platformCreateDialog.style.display = open ? "flex" : "none";
  platformCreateDialog.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    lastFocusedBeforeDialog = document.activeElement;
    platformNewId?.focus();
  } else if (lastFocusedBeforeDialog && typeof lastFocusedBeforeDialog.focus === "function") {
    lastFocusedBeforeDialog.focus();
  }
}

function setCreateStatus(message = "", tone = "info") {
  if (!platformCreateStatus) return;
  platformCreateStatus.textContent = String(message || "");
  platformCreateStatus.className = tone === "error" ? "sub error" : "sub";
}

function syncCreateDialogFields() {
  const selectedId = cleanSlug(platformNewId?.value);
  const option = allowedPlatformOptions.find((item) => cleanSlug(item?.id) === selectedId) || null;
  if (platformNewName) platformNewName.value = cleanText(option?.name || selectedId);
  if (platformNewIconLocation) {
    const iconLocation = normalizePlatformIconLocation(option?.iconLocation || "");
    platformNewIconLocation.value = iconLocation;
  }
}

function paletteColorForId(id) {
  const source = cleanSlug(id) || "platform";
  let total = 0;
  for (let i = 0; i < source.length; i += 1) total += source.charCodeAt(i);
  return TAB_BORDER_PALETTE[total % TAB_BORDER_PALETTE.length];
}

function parseJsonObject(raw, fallback = {}) {
  if (raw == null) return { ...fallback };
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  const text = cleanText(raw);
  if (!text) return { ...fallback };
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return { ...fallback };
}

function toPlatformRecord(row) {
  const config = parseJsonObject(row?.config, parseJsonObject(row?.configJson, {}));
  const auth = parseJsonObject(row?.auth, parseJsonObject(row?.authJson, {}));
  const iconLocation = normalizePlatformIconLocation(row?.iconLocation || config?.iconLocation || "");
  return {
    ...row,
    id: cleanSlug(row?.id),
    name: cleanText(row?.name),
    category: cleanText(row?.category) || "social",
    enabled: !!row?.enabled,
    iconLocation,
    config: { ...config, iconLocation },
    auth
  };
}

function selectOption(options, fallback = "") {
  const cleanFallback = cleanText(fallback).toLowerCase();
  return options.find((option) => cleanText(option).toLowerCase() === cleanFallback) || options[0] || fallback;
}

function field(label, input, hint = "") {
  const nodes = [el("label", {}, label), input];
  if (hint) nodes.push(el("div", { class: "sub" }, hint));
  return el("div", { class: "field" }, ...nodes);
}

function fieldSpanAll(label, input, hint = "") {
  const node = field(label, input, hint);
  node.classList.add("smm-span-all");
  return node;
}

function saveIndicator() {
  return el("div", { class: "sub", "aria-live": "polite" }, "");
}

function inputValue(input, fallback = "") {
  return cleanText(input?.value || fallback);
}

function setSummary(message = "") {
  if (platformSummary) platformSummary.textContent = message;
}

function buildPlatformPayload(platform, inputs) {
  const meta = getPlatformFormMeta(platform);
  const hashtags = parseTagsInput(inputs.hashtags?.value);
  return {
    name: cleanText(platform?.name || inputs.name?.value),
    category: selectOption(categoryOptions, cleanText(inputs.category?.value) || "social"),
    enabled: !!inputs.enabled?.checked,
    iconLocation: normalizePlatformIconLocation(inputs.iconLocation?.value || ""),
    config: {
      postingMode: cleanText(inputs.postingMode?.value) || meta.postingModeDefault || "manual",
      accountHandle: inputValue(inputs.handle),
      profileUrl: inputValue(inputs.profileUrl),
      accountId: inputValue(inputs.accountId),
      defaultHashtags: hashtags,
      defaultCaptionSuffix: inputValue(inputs.captionSuffix),
      notes: inputValue(inputs.notes)
    },
    auth: {
      clientId: inputValue(inputs.clientId),
      clientSecret: inputValue(inputs.clientSecret),
      accessToken: inputValue(inputs.accessToken),
      refreshToken: inputValue(inputs.refreshToken)
    }
  };
}

function createTextInput(value = "", placeholder = "") {
  return el("input", { type: "text", value: cleanText(value), placeholder });
}

function createTextarea(value = "", placeholder = "", rows = 2) {
  const node = el("textarea", { rows: String(rows), placeholder });
  node.value = cleanText(value);
  return node;
}

function createSelect(options, value = "") {
  const select = el("select", {});
  options.forEach((optionValue) => {
    const option = el("option", { value: optionValue }, optionValue);
    if (optionValue === value) option.selected = true;
    select.appendChild(option);
  });
  if (![...select.options].some((option) => option.value === value) && select.options.length) {
    select.value = select.options[0].value;
  }
  return select;
}

function renderPlatformPanel(platform) {
  const record = toPlatformRecord(platform);
  const meta = getPlatformFormMeta(record);
  const color = paletteColorForId(record.id);
  const panel = el("div", { class: "card smm-panel", style: `--smm-active-color:${color};` });
  const title = el("h3", {}, record.name || record.id || "Platform");
  const slug = el("span", { class: "smm-slug" }, `[slug: ${record.id || "platform"}]`);
  const intro = el("div", { class: "sub" }, meta.intro);
  const status = saveIndicator();

  const nameInput = createTextInput(record.name, "Platform name");
  nameInput.readOnly = true;
  nameInput.title = "Display name is fixed by the configured platform.";
  const categoryInput = createSelect(categoryOptions, selectOption(categoryOptions, record.category || "social"));
  categoryInput.disabled = true;
  categoryInput.title = "Category is fixed by the configured platform.";
  const iconLocationInput = createTextInput(record.iconLocation, "/assets/... or https://...");
  const postingModeInput = createSelect(["manual", "api"], cleanText(record.config?.postingMode || meta.postingModeDefault || "manual"));
  const handleInput = createTextInput(record.config?.accountHandle, meta.handlePlaceholder);
  const profileUrlInput = createTextInput(record.config?.profileUrl, meta.profilePlaceholder);
  const accountIdInput = createTextInput(record.config?.accountId, meta.accountIdPlaceholder);
  const hashtagsInput = createTextInput((record.config?.defaultHashtags || []).join(", "), meta.hashtagsPlaceholder);
  const captionSuffixInput = createTextarea(record.config?.defaultCaptionSuffix, meta.suffixPlaceholder, 1);
  const notesInput = createTextarea(record.config?.notes, meta.notesPlaceholder, 1);
  const clientIdInput = createTextInput(record.auth?.clientId, meta.clientIdPlaceholder);
  const clientSecretInput = createTextInput(record.auth?.clientSecret, meta.clientSecretPlaceholder);
  const accessTokenInput = createTextarea(record.auth?.accessToken, "", 1);
  const refreshTokenInput = createTextarea(record.auth?.refreshToken, "", 1);
  const enabledInput = el("input", { type: "checkbox" });
  enabledInput.checked = !!record.enabled;
  const enabledTrack = el("span", { class: "smm-switch-track", "aria-hidden": "true" }, el("span", { class: "smm-switch-thumb" }));
  const enabledToggle = el("label", { class: "smm-switch", "aria-label": "Toggle platform enabled" }, enabledInput, enabledTrack);
  const stateBadge = el("span", {
    class: "smm-state",
    "data-enabled": enabledInput.checked ? "true" : "false",
    role: "button",
    tabindex: "0",
    "aria-pressed": enabledInput.checked ? "true" : "false",
    title: "Toggle enabled state"
  }, enabledInput.checked ? "Enabled" : "Disabled");

  const deleteBtn = el("button", { class: "btn danger", type: "button" }, "Delete");
  const bodyFieldset = el("fieldset", { class: "smm-body" });
  const autosaveInputs = [
    nameInput,
    categoryInput,
    iconLocationInput,
    postingModeInput,
    handleInput,
    profileUrlInput,
    accountIdInput,
    hashtagsInput,
    captionSuffixInput,
    notesInput,
    clientIdInput,
    clientSecretInput,
    accessTokenInput,
    refreshTokenInput,
    enabledInput
  ];
  let autosaveTimer = null;
  let savingNow = false;
  let queuedSave = false;

  function syncEnabledState() {
    const label = enabledInput.checked ? "Enabled" : "Disabled";
    stateBadge.textContent = label;
    stateBadge.dataset.enabled = enabledInput.checked ? "true" : "false";
    stateBadge.setAttribute("aria-pressed", enabledInput.checked ? "true" : "false");
    bodyFieldset.disabled = !enabledInput.checked;
  }

  function toggleEnabledState() {
    enabledInput.checked = !enabledInput.checked;
    syncEnabledState();
    scheduleAutosave();
  }

  enabledInput.addEventListener("change", syncEnabledState);
  stateBadge.addEventListener("click", toggleEnabledState);
  stateBadge.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleEnabledState();
  });

  async function savePlatform() {
    if (savingNow) {
      queuedSave = true;
      return;
    }
    savingNow = true;
    deleteBtn.disabled = true;
    status.textContent = "Saving...";
    try {
      const payload = buildPlatformPayload(record, {
        name: nameInput,
        category: categoryInput,
        enabled: enabledInput,
        iconLocation: iconLocationInput,
        postingMode: postingModeInput,
        handle: handleInput,
        profileUrl: profileUrlInput,
        accountId: accountIdInput,
        hashtags: hashtagsInput,
        captionSuffix: captionSuffixInput,
        notes: notesInput,
        clientId: clientIdInput,
        clientSecret: clientSecretInput,
        accessToken: accessTokenInput,
        refreshToken: refreshTokenInput
      });
      const saved = await apiFetch(`/api/admin/social/platforms/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const nextRecord = toPlatformRecord(saved);
      platforms = platforms.map((item) => (item.id === nextRecord.id ? nextRecord : item));
      Object.assign(record, nextRecord);
      syncEnabledState();
      status.textContent = `Auto-saved ${String(nextRecord.updatedAt || "").slice(11, 19) || ""}`.trim();
    } catch (err) {
      status.textContent = String(err?.message || err || "Failed to save platform.");
      showToast(status.textContent, { tone: "error" });
    } finally {
      savingNow = false;
      deleteBtn.disabled = false;
      if (queuedSave) {
        queuedSave = false;
        savePlatform();
      }
    }
  }

  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    status.textContent = "Auto-save pending...";
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      savePlatform();
    }, 450);
  }

  autosaveInputs.forEach((input) => {
    input.addEventListener("input", scheduleAutosave);
    input.addEventListener("change", scheduleAutosave);
  });
  syncEnabledState();
  status.textContent = "Auto-save enabled";
  deleteBtn.addEventListener("click", async () => {
    if (!(await confirmToast(`Delete ${record.name || record.id}?`, { confirmText: "Delete", tone: "danger" }))) return;
    deleteBtn.disabled = true;
    try {
      await apiFetch(`/api/admin/social/platforms/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      platforms = platforms.filter((item) => item.id !== record.id);
      if (activePlatformId === record.id) activePlatformId = platforms[0]?.id || "";
      showToast(`Deleted ${record.name || record.id}.`);
      render();
    } catch (err) {
      deleteBtn.disabled = false;
      showToast(String(err?.message || err || "Failed to delete platform."), { tone: "error" });
    }
  });

  bodyFieldset.append(
    el("div", { class: "smm-text-stack" },
      fieldSpanAll(meta.suffixLabel, captionSuffixInput),
      fieldSpanAll(meta.notesLabel, notesInput)
    ),
    el("div", { class: "smm-divider", "aria-hidden": "true" }),
    el("div", { class: "smm-grid smm-grid--details" },
      field("Display name", nameInput),
      field("Category", categoryInput),
      field("Posting mode", postingModeInput),
      field(meta.handleLabel, handleInput),
      field(meta.profileLabel, profileUrlInput),
      field("Icon location", iconLocationInput),
      field(meta.hashtagsLabel, hashtagsInput),
      field(meta.accountIdLabel, accountIdInput)
    ),
    el("div", { class: "smm-divider", "aria-hidden": "true" }),
    el("div", { class: "smm-grid smm-grid--auth" },
      field(meta.clientIdLabel, clientIdInput),
      field(meta.clientSecretLabel, clientSecretInput),
      field(meta.accessTokenLabel, accessTokenInput),
      field(meta.refreshTokenLabel, refreshTokenInput)
    )
  );

  panel.append(
    el("div", { class: "smm-header-copy" },
      el("div", { class: "smm-title-row" }, title, slug),
      intro
    ),
    el("div", { class: "smm-toggle-row" }, enabledToggle, stateBadge),
    bodyFieldset,
    el("div", { class: "smm-actions" }, deleteBtn, status)
  );

  return panel;
}

function renderTabs() {
  if (!platformList) return;
  platformList.innerHTML = "";
  if (!platforms.length) {
    platformList.appendChild(el("div", { class: "sub" }, "No platforms configured."));
    setSummary("No platforms available.");
    return;
  }
  if (!activePlatformId || !platforms.some((platform) => platform.id === activePlatformId)) {
    activePlatformId = platforms[0].id;
  }

  const tabbar = el("div", { class: "smm-tabbar", role: "tablist", "aria-label": "Social platforms" });
  const shell = el("div", { class: "smm-tabs-shell" });
  const active = platforms.find((platform) => platform.id === activePlatformId) || platforms[0];
  setSummary(`${platforms.length} platform${platforms.length === 1 ? "" : "s"} configured.`);

  platforms.forEach((platform) => {
    const color = paletteColorForId(platform.id);
    const selected = platform.id === active.id;
    const iconSrc = getPlatformTabIconSrc(platform);
    const icon = el("span", { class: "smm-tab-icon", "aria-hidden": "true", style: `--smm-tab-color:${color};` });
    if (iconSrc) icon.appendChild(el("img", { src: iconSrc, alt: "", loading: "lazy" }));
    const tab = el("button", {
      class: "smm-tab",
      type: "button",
      role: "tab",
      "aria-selected": selected ? "true" : "false",
      style: `--smm-tab-color:${color};`
    }, icon, platform.name || platform.id);
    tab.addEventListener("click", () => {
      activePlatformId = platform.id;
      render();
    });
    tabbar.appendChild(tab);
  });

  shell.appendChild(tabbar);
  shell.appendChild(renderPlatformPanel(active));
  platformList.appendChild(shell);
}

function render() {
  ensureSocialManagerStyles();
  renderTabs();
}

async function loadData() {
  try {
    const [platformRows, optionRows] = await Promise.all([
      apiFetch("/api/admin/social/platforms", { method: "GET" }),
      apiFetch("/api/admin/social/platform-options", { method: "GET" })
    ]);
    platforms = (Array.isArray(platformRows) ? platformRows : []).map(toPlatformRecord);
    allowedPlatformOptions = Array.isArray(optionRows) ? optionRows : [];
    if (!activePlatformId) activePlatformId = platforms[0]?.id || "";
    render();
  } catch (err) {
    setSummary(String(err?.message || err || "Failed to load social platforms."));
    showToast(String(err?.message || err || "Failed to load social platforms."), { tone: "error" });
  }
}

openPlatformCreateDialogBtn?.addEventListener("click", () => {
  setCreateStatus("");
  syncCreateDialogFields();
  setDialogOpen(true);
});
platformNewId?.addEventListener("change", () => {
  syncCreateDialogFields();
});
closePlatformCreateDialogBtn?.addEventListener("click", () => {
  setDialogOpen(false);
});
cancelPlatformCreateDialogBtn?.addEventListener("click", () => {
  setDialogOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !platformCreateDialog?.hidden) setDialogOpen(false);
});
platformCreateDialog?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setDialogOpen(false);
});
platformCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = cleanSlug(platformNewId?.value);
  if (!id) {
    setCreateStatus("Platform id is required.", "error");
    return;
  }
  try {
    const option = allowedPlatformOptions.find((item) => cleanSlug(item?.id) === id) || null;
    const created = await apiFetch("/api/admin/social/platforms", {
      method: "POST",
      body: JSON.stringify({
        id,
        name: cleanText(platformNewName?.value) || cleanText(option?.name) || id,
        category: cleanText(option?.category) || "social",
        iconLocation: normalizePlatformIconLocation(platformNewIconLocation?.value || option?.iconLocation || "")
      })
    });
    const next = toPlatformRecord(created);
    platforms.push(next);
    activePlatformId = next.id;
    setDialogOpen(false);
    showToast(`Created ${next.name || next.id}.`);
    render();
  } catch (err) {
    setCreateStatus(String(err?.message || err || "Failed to create platform."), "error");
  }
});

loadData();

