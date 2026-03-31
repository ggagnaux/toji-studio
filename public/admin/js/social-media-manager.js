import { ensureBaseStyles, setYearFooter, showToast, apiFetch, confirmToast } from "../admin.js";
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
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--smm-tab-color, var(--accent)) 14%, transparent);
      flex: 0 0 auto;
      display: inline-block;
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
      border-radius:0 0 10px 10px;
      margin-top:0;
      border-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 80%, var(--line));
      border-top-color: color-mix(in srgb, var(--smm-active-color, var(--accent)) 80%, var(--line));
      background: color-mix(in srgb, var(--smm-active-color, var(--accent)) 8%, var(--panel));
    }
    .smm-details{
      display:grid;
      gap:0;
    }
    .smm-section-tabbar{
      display:flex;
      gap:0;
      flex-wrap:wrap;
      border-bottom:1px solid var(--line);
      margin-top:4px;
    }
    .smm-section-tab{
      border:1px solid transparent;
      border-bottom:1px solid color-mix(in srgb, var(--smm-section-color, var(--smm-active-color, var(--accent))) 38%, var(--line));
      background:transparent;
      color:var(--muted);
      border-radius:10px 10px 0 0;
      padding:8px 12px;
      cursor:pointer;
      font-size:13px;
      margin-bottom:-1px;
    }
    .smm-section-tab[aria-selected="true"]{
      border-color: color-mix(in srgb, var(--smm-section-color, var(--smm-active-color, var(--accent))) 88%, var(--line));
      border-bottom-color: transparent;
      background: color-mix(in srgb, var(--smm-section-color, var(--smm-active-color, var(--accent))) 16%, var(--panel));
      color: var(--text);
    }
    .smm-section-pane{
      display:grid;
      gap:10px;
      padding-top:0;
    }
    .smm-section-panel{
      display:grid;
      gap:10px;
      padding:12px;
      border:1px solid color-mix(in srgb, var(--smm-section-color, var(--smm-active-color, var(--accent))) 52%, var(--line));
      border-top:0;
      border-radius:0 0 12px 12px;
      background: color-mix(in srgb, var(--smm-section-color, var(--smm-active-color, var(--accent))) 10%, var(--panel));
    }
    .smm-details.is-disabled{
      opacity:.5;
      filter:saturate(.65);
      pointer-events:none;
    }
    .smm-toggle{
      display:inline-flex;
      align-items:center;
      gap:12px;
      padding:6px 0;
    }
  `;
  document.head.appendChild(style);
}

function setDialogOpen(open) {
  if (!platformCreateDialog) return;
  platformCreateDialog.hidden = !open;
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

function createTextarea(value = "", placeholder = "") {
  const node = el("textarea", { rows: "3", placeholder });
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
  const panel = el("div", { class: "card smm-panel" });
  const title = el("h3", {}, record.name || record.id || "Platform");
  const intro = el("div", { class: "sub" }, meta.intro);
  const status = saveIndicator();

  const nameInput = createTextInput(record.name, "Platform name");
  const categoryInput = createSelect(categoryOptions, selectOption(categoryOptions, record.category || "social"));
  const iconLocationInput = createTextInput(record.iconLocation, "/assets/... or https://...");
  const postingModeInput = createSelect(["manual", "api"], cleanText(record.config?.postingMode || meta.postingModeDefault || "manual"));
  const handleInput = createTextInput(record.config?.accountHandle, meta.handlePlaceholder);
  const profileUrlInput = createTextInput(record.config?.profileUrl, meta.profilePlaceholder);
  const accountIdInput = createTextInput(record.config?.accountId, meta.accountIdPlaceholder);
  const hashtagsInput = createTextInput((record.config?.defaultHashtags || []).join(", "), meta.hashtagsPlaceholder);
  const captionSuffixInput = createTextarea(record.config?.defaultCaptionSuffix, meta.suffixPlaceholder);
  const notesInput = createTextarea(record.config?.notes, meta.notesPlaceholder);
  const clientIdInput = createTextInput(record.auth?.clientId, meta.clientIdPlaceholder);
  const clientSecretInput = createTextInput(record.auth?.clientSecret, meta.clientSecretPlaceholder);
  const accessTokenInput = createTextarea(record.auth?.accessToken, "");
  const refreshTokenInput = createTextarea(record.auth?.refreshToken, "");
  const enabledInput = el("input", { type: "checkbox" });
  enabledInput.checked = !!record.enabled;

  const saveBtn = el("button", { class: "btn", type: "button" }, "Save");
  const deleteBtn = el("button", { class: "btn danger", type: "button" }, "Delete");

  async function savePlatform() {
    saveBtn.disabled = true;
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
      status.textContent = "Saved.";
      showToast(`Saved ${nextRecord.name || nextRecord.id}.`);
      render();
    } catch (err) {
      status.textContent = String(err?.message || err || "Failed to save platform.");
      showToast(status.textContent, { tone: "error" });
    } finally {
      saveBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  }

  saveBtn.addEventListener("click", savePlatform);
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

  panel.append(
    title,
    intro,
    el("div", { class: "grid cols-2" },
      field("Name", nameInput),
      field("Category", categoryInput),
      field("Icon location", iconLocationInput),
      field("Posting mode", postingModeInput),
      field(meta.handleLabel, handleInput),
      field(meta.profileLabel, profileUrlInput),
      field(meta.accountIdLabel, accountIdInput),
      field(meta.hashtagsLabel, hashtagsInput),
      field(meta.suffixLabel, captionSuffixInput),
      field(meta.notesLabel, notesInput),
      field(meta.clientIdLabel, clientIdInput),
      field(meta.clientSecretLabel, clientSecretInput),
      field(meta.accessTokenLabel, accessTokenInput),
      field(meta.refreshTokenLabel, refreshTokenInput),
      field("Enabled", el("label", { class: "smm-toggle" }, enabledInput, el("span", {}, enabledInput.checked ? "Enabled" : "Disabled")))
    ),
    el("div", { class: "row", style: "gap:8px;" }, saveBtn, deleteBtn),
    status
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
