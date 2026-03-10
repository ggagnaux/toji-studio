import { ensureBaseStyles, setYearFooter, showToast, apiFetch, confirmToast } from "../admin.js";

ensureBaseStyles();
setYearFooter();

const platformList = document.getElementById("platformList");
const platformSummary = document.getElementById("platformSummary");
const platformCreateForm = document.getElementById("platformCreateForm");
const platformNewId = document.getElementById("platformNewId");
const platformNewName = document.getElementById("platformNewName");
const platformCreateStatus = document.getElementById("platformCreateStatus");

function cleanText(v) {
  return String(v || "").trim();
}

function cleanSlug(v) {
  return cleanText(v)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseTagsInput(v) {
  return Array.from(
    new Set(
      cleanText(v)
        .split(/[,;\n]+/g)
        .map((t) => cleanText(t.replace(/^#+/, "")).toLowerCase())
        .filter(Boolean)
    )
  );
}

const categoryOptions = ["social", "video", "newsletter", "portfolio", "other"];
let platforms = [];
let activePlatformId = "";
const TAB_BORDER_PALETTE = ["#2a97d4", "#2ea97d", "#d18b2e", "#d15353", "#8a63d2", "#cf5ea8", "#3aa5a0", "#7e8c2b"];

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
      gap:10px;
    }
    .smm-details.is-disabled{
      opacity:.5;
      filter:saturate(.65);
      pointer-events:none;
    }
    .smm-toggle{
      display:inline-flex;
      align-items:center;
      gap:8px;
      cursor:pointer;
      user-select:none;
    }
    .smm-toggle input{
      position:absolute;
      width:1px;
      height:1px;
      overflow:hidden;
      clip:rect(0 0 0 0);
      white-space:nowrap;
      border:0;
      margin:-1px;
      padding:0;
    }
    .smm-toggle-slider{
      width:46px;
      height:26px;
      border-radius:999px;
      border:1px solid var(--line);
      background: color-mix(in srgb, var(--panel) 84%, transparent);
      position:relative;
      transition: background .18s ease, border-color .18s ease;
      flex:0 0 auto;
    }
    .smm-toggle-slider::after{
      content:"";
      position:absolute;
      top:3px;
      left:3px;
      width:18px;
      height:18px;
      border-radius:50%;
      background:var(--text);
      transition: transform .18s ease;
    }
    .smm-toggle input:checked + .smm-toggle-slider{
      background:var(--accent-soft);
      border-color: var(--accent-border);
    }
    .smm-toggle input:checked + .smm-toggle-slider::after{
      transform: translateX(20px);
    }
  `;
  document.head.appendChild(style);
}
ensureSocialManagerStyles();

function tabColorAt(index) {
  return TAB_BORDER_PALETTE[index % TAB_BORDER_PALETTE.length];
}

function buildField(label, node) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.style.marginTop = "0";

  const title = document.createElement("div");
  title.className = "sub";
  title.textContent = label;
  wrap.appendChild(title);
  wrap.appendChild(node);
  return wrap;
}

function input(type, value = "", placeholder = "") {
  const node = document.createElement("input");
  node.type = type;
  node.value = value;
  if (placeholder) node.placeholder = placeholder;
  return node;
}

function textArea(value = "", placeholder = "") {
  const node = document.createElement("textarea");
  node.value = value;
  if (placeholder) node.placeholder = placeholder;
  node.style.minHeight = "84px";
  return node;
}

function selectOption(list, value) {
  const select = document.createElement("select");
  for (const item of list) {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    if (item === value) option.selected = true;
    select.appendChild(option);
  }
  return select;
}

function platformPanel(platform, accentColor) {
  const config = platform.config || {};
  const auth = platform.auth || {};

  const card = document.createElement("div");
  card.className = "card";
  card.classList.add("smm-panel");
  card.style.boxShadow = "none";
  card.style.setProperty("--smm-active-color", accentColor || "var(--line)");
  card.style.borderColor = accentColor || "var(--line)";
  card.style.overflow = "hidden";

  const body = document.createElement("div");
  body.className = "meta";
  body.style.display = "grid";
  body.style.gap = "10px";
  body.style.paddingTop = "12px";

  const nameInput = input("text", cleanText(platform.name), "Platform name");
  const categoryInput = selectOption(categoryOptions, cleanText(platform.category) || "social");
  const enabledInput = input("checkbox");
  enabledInput.checked = !!platform.enabled;
  enabledInput.style.width = "auto";
  enabledInput.style.minWidth = "0";
  enabledInput.style.height = "auto";

  const postingModeInput = selectOption(["api", "manual", "webhook"], cleanText(config.postingMode) || "api");
  const handleInput = input("text", cleanText(config.accountHandle), "@account");
  const profileUrlInput = input("url", cleanText(config.profileUrl), "https://...");
  const hashtagsInput = input("text", Array.isArray(config.defaultHashtags) ? config.defaultHashtags.join(", ") : cleanText(config.defaultHashtags), "tag1, tag2");
  const suffixInput = textArea(cleanText(config.defaultCaptionSuffix), "Optional default suffix appended to captions.");
  const notesInput = textArea(cleanText(config.notes), "Setup notes for this platform.");

  const clientIdInput = input("text", cleanText(auth.clientId), "");
  const clientSecretInput = input("password", cleanText(auth.clientSecret), "");
  const accessTokenInput = input("password", cleanText(auth.accessToken), "");
  const refreshTokenInput = input("password", cleanText(auth.refreshToken), "");
  const accountIdInput = input("text", cleanText(auth.accountId), "");

  const panelTitle = document.createElement("div");
  panelTitle.style.display = "inline-flex";
  panelTitle.style.alignItems = "center";
  panelTitle.style.gap = "10px";
  panelTitle.style.flexWrap = "wrap";
  panelTitle.innerHTML = `<strong>${platform.name}</strong><span class="sub">[slug: ${platform.id}]</span>`;

  const enabledRow = document.createElement("label");
  enabledRow.className = "smm-toggle";
  enabledRow.style.display = "inline-flex";
  enabledRow.style.alignItems = "center";
  enabledRow.style.gap = "8px";
  enabledRow.style.cursor = "pointer";
  const enabledSlider = document.createElement("span");
  enabledSlider.className = "smm-toggle-slider";
  enabledSlider.setAttribute("aria-hidden", "true");
  const enabledLabel = document.createElement("span");
  const detailsBlock = document.createElement("div");
  detailsBlock.className = "smm-details";
  const syncEnabledUi = () => {
    enabledLabel.textContent = enabledInput.checked ? "Enabled" : "Disabled";
    enabledLabel.style.color = enabledInput.checked
      ? "var(--text)"
      : "color-mix(in srgb, #d15353 84%, var(--text))";
    const disabled = !enabledInput.checked;
    detailsBlock.classList.toggle("is-disabled", disabled);
    const controls = detailsBlock.querySelectorAll("input, select, textarea, button");
    controls.forEach((node) => {
      node.disabled = disabled;
    });
  };
  enabledInput.addEventListener("change", syncEnabledUi);
  enabledRow.append(enabledInput, enabledSlider, enabledLabel);

  const settingsGrid = document.createElement("div");
  settingsGrid.style.display = "grid";
  settingsGrid.style.gap = "10px";
  settingsGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  settingsGrid.append(
    buildField("Display name", nameInput),
    buildField("Category", categoryInput),
    buildField("Posting mode", postingModeInput),
    buildField("Account handle", handleInput),
    buildField("Profile URL", profileUrlInput),
    buildField("Default hashtags", hashtagsInput),
    buildField("Account/Page ID", accountIdInput)
  );

  const authGrid = document.createElement("div");
  authGrid.style.display = "grid";
  authGrid.style.gap = "10px";
  authGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  authGrid.append(
    buildField("Client ID", clientIdInput),
    buildField("Client secret", clientSecretInput),
    buildField("Access token", accessTokenInput),
    buildField("Refresh token", refreshTokenInput)
  );

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "10px";
  footer.style.alignItems = "center";
  footer.style.flexWrap = "wrap";

  const status = document.createElement("span");
  status.className = "sub";
  status.setAttribute("aria-live", "polite");

  const autoSaveHint = document.createElement("span");
  autoSaveHint.className = "sub";
  autoSaveHint.textContent = "Auto-save enabled";

  let saveTimer = null;
  let saving = false;

  function buildPayload() {
    return {
      name: cleanText(nameInput.value) || platform.name,
      category: cleanText(categoryInput.value) || "social",
      enabled: !!enabledInput.checked,
      config: {
        postingMode: cleanText(postingModeInput.value) || "api",
        accountHandle: cleanText(handleInput.value),
        profileUrl: cleanText(profileUrlInput.value),
        defaultHashtags: parseTagsInput(hashtagsInput.value),
        defaultCaptionSuffix: cleanText(suffixInput.value),
        notes: cleanText(notesInput.value)
      },
      auth: {
        clientId: cleanText(clientIdInput.value),
        clientSecret: cleanText(clientSecretInput.value),
        accessToken: cleanText(accessTokenInput.value),
        refreshToken: cleanText(refreshTokenInput.value),
        accountId: cleanText(accountIdInput.value)
      }
    };
  }

  let lastSavedPayload = JSON.stringify(buildPayload());

  async function savePlatform() {
    if (saving) return;
    const payload = buildPayload();
    const payloadJson = JSON.stringify(payload);
    if (payloadJson === lastSavedPayload) return;

    saving = true;
    status.textContent = "Saving...";
    try {
      await apiFetch(`/api/admin/social/platforms/${encodeURIComponent(platform.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      platform.name = payload.name;
      platform.category = payload.category;
      platform.enabled = payload.enabled;
      platform.config = payload.config;
      platform.auth = payload.auth;

      lastSavedPayload = payloadJson;
      status.textContent = "Saved.";
    } catch (err) {
      status.textContent = "Save failed.";
      showToast(`Save failed: ${err?.message || err}`, { tone: "error" });
    } finally {
      saving = false;
    }
  }

  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    status.textContent = "Unsaved changes...";
    saveTimer = window.setTimeout(() => {
      savePlatform();
    }, 500);
  }

  const autoSaveNodes = [
    nameInput,
    categoryInput,
    enabledInput,
    postingModeInput,
    handleInput,
    profileUrlInput,
    hashtagsInput,
    suffixInput,
    notesInput,
    clientIdInput,
    clientSecretInput,
    accessTokenInput,
    refreshTokenInput,
    accountIdInput
  ];
  for (const node of autoSaveNodes) {
    const tag = String(node.tagName || "").toLowerCase();
    const type = String(node.type || "").toLowerCase();
    const isTextbox =
      tag === "textarea" ||
      (tag === "input" && ["text", "url", "password", "search", ""].includes(type));
    if (tag === "select" || type === "checkbox") {
      node.addEventListener("change", scheduleAutoSave);
    } else if (isTextbox) {
      node.addEventListener("blur", scheduleAutoSave);
    } else {
      node.addEventListener("change", scheduleAutoSave);
    }
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn mini";
  deleteBtn.type = "button";
  deleteBtn.style.borderColor = "color-mix(in srgb, #d15353 56%, var(--line))";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    const ok = await confirmToast(
      `Delete platform "${platform.name}" (${platform.id})?`,
      { confirmLabel: "Delete", cancelLabel: "Cancel", tone: "warn" }
    );
    if (!ok) return;
    deleteBtn.disabled = true;
    status.textContent = "Deleting...";
    try {
      await apiFetch(`/api/admin/social/platforms/${encodeURIComponent(platform.id)}`, {
        method: "DELETE"
      });
      showToast(`Deleted ${platform.name}.`, { tone: "success" });
      await loadPlatforms();
    } catch (err) {
      status.textContent = "Delete failed.";
      showToast(`Delete failed: ${err?.message || err}`, { tone: "error" });
    } finally {
      deleteBtn.disabled = false;
    }
  });

  footer.append(deleteBtn, autoSaveHint, status);
  detailsBlock.append(
    buildField("Default caption suffix", suffixInput),
    buildField("Notes", notesInput),
    document.createElement("hr"),
    settingsGrid,
    document.createElement("hr"),
    authGrid
  );
  syncEnabledUi();
  body.append(panelTitle, enabledRow, detailsBlock, footer);
  card.append(body);
  return card;
}

function renderPlatformConfiguration() {
  platformList.innerHTML = "";
  if (!platforms.length) {
    const empty = document.createElement("div");
    empty.className = "sub";
    empty.textContent = "No platforms yet.";
    platformList.appendChild(empty);
    return;
  }

  const hasActive = platforms.some((p) => p.id === activePlatformId);
  if (!hasActive) activePlatformId = platforms[0].id;

  const tabBar = document.createElement("div");
  tabBar.className = "smm-tabbar";
  tabBar.setAttribute("role", "tablist");
  tabBar.setAttribute("aria-label", "Platforms");

  let activeColor = "var(--line)";
  platforms.forEach((platform, idx) => {
    const active = platform.id === activePlatformId;
    const tabColor = tabColorAt(idx);
    if (active) activeColor = tabColor;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "btn mini smm-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.style.setProperty("--smm-tab-color", tabColor);
    tab.textContent = platform.name;
    tab.addEventListener("click", () => {
      activePlatformId = platform.id;
      renderPlatformConfiguration();
    });
    tabBar.appendChild(tab);
  });

  const activePlatform = platforms.find((p) => p.id === activePlatformId) || platforms[0];
  if (!activePlatformId) activePlatformId = activePlatform.id;

  const shell = document.createElement("div");
  shell.className = "smm-tabs-shell";
  shell.append(tabBar, platformPanel(activePlatform, activeColor));
  platformList.append(shell);
}

async function loadPlatforms() {
  platformList.innerHTML = "";
  platformSummary.textContent = "Loading...";
  try {
    platforms = await apiFetch("/api/admin/social/platforms", { method: "GET" });
    platformSummary.textContent = `${platforms.length} platform${platforms.length === 1 ? "" : "s"} configured`;
    renderPlatformConfiguration();
  } catch (err) {
    platformSummary.textContent = "Failed to load platforms.";
    showToast(`Failed to load platforms: ${err?.message || err}`, { tone: "error" });
  }
}

platformCreateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = cleanSlug(platformNewId?.value);
  const name = cleanText(platformNewName?.value);
  if (!id || !name) {
    if (platformCreateStatus) platformCreateStatus.textContent = "Provide both id and name.";
    showToast("Provide both id and name.", { tone: "warn" });
    return;
  }

  try {
    if (platformCreateStatus) platformCreateStatus.textContent = "Creating...";
    await apiFetch("/api/admin/social/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, category: "social", enabled: true })
    });
    if (platformNewId) platformNewId.value = "";
    if (platformNewName) platformNewName.value = "";
    if (platformCreateStatus) platformCreateStatus.textContent = "Created.";
    showToast(`Created platform ${name}.`, { tone: "success" });
    await loadPlatforms();
  } catch (err) {
    if (platformCreateStatus) platformCreateStatus.textContent = "Create failed.";
    showToast(`Create failed: ${err?.message || err}`, { tone: "error" });
  }
});

loadPlatforms();
