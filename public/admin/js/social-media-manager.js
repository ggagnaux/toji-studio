import { applyBannerLogoBehavior } from "../../assets/js/header.js";
import { ensureBaseStyles, setYearFooter, showToast, apiFetch } from "../admin.js";

ensureBaseStyles();
setYearFooter();
applyBannerLogoBehavior(document.querySelector("header.header"));

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

function platformCard(platform) {
  const config = platform.config || {};
  const auth = platform.auth || {};

  const card = document.createElement("div");
  card.className = "card";
  card.style.boxShadow = "none";
  card.style.borderColor = "var(--line)";
  card.style.overflow = "hidden";

  const body = document.createElement("div");
  body.className = "meta";
  body.style.display = "none";
  body.style.gap = "10px";
  body.style.paddingTop = "10px";

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

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn";
  toggle.style.width = "100%";
  toggle.style.display = "flex";
  toggle.style.alignItems = "center";
  toggle.style.justifyContent = "flex-start";
  toggle.style.gap = "10px";
  toggle.style.textAlign = "left";
  toggle.style.borderRadius = "12px";
  toggle.style.border = "1px solid var(--line)";
  toggle.style.background = "color-mix(in srgb, var(--panel) 94%, transparent)";

  const title = document.createElement("div");
  title.style.display = "inline-flex";
  title.style.alignItems = "center";
  title.style.gap = "10px";
  title.style.flexWrap = "wrap";
  title.innerHTML = `<strong>${platform.name}</strong><span class="pill">${platform.id}</span>`;

  const chevron = document.createElement("span");
  chevron.className = "sub";
  chevron.textContent = "⌄";
  toggle.append(chevron, title);

  const setExpanded = (expanded) => {
    body.style.display = expanded ? "grid" : "none";
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    chevron.textContent = expanded ? "⌃" : "⌄";
  };
  setExpanded(false);
  toggle.addEventListener("click", () => {
    setExpanded(body.style.display === "none");
  });

  const enabledRow = document.createElement("label");
  enabledRow.className = "pill";
  enabledRow.style.display = "inline-flex";
  enabledRow.style.alignItems = "center";
  enabledRow.style.gap = "8px";
  enabledRow.style.cursor = "pointer";
  enabledRow.append(enabledInput, document.createTextNode("Enabled"));

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

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn mini";
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    status.textContent = "Saving...";
    try {
      const payload = {
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

      await apiFetch(`/api/admin/social/platforms/${encodeURIComponent(platform.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      status.textContent = "Saved.";
      showToast(`${payload.name} settings saved.`, { tone: "success" });
      await loadPlatforms();
    } catch (err) {
      status.textContent = "Save failed.";
      showToast(`Save failed: ${err?.message || err}`, { tone: "error" });
    } finally {
      saveBtn.disabled = false;
    }
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn mini";
  deleteBtn.type = "button";
  deleteBtn.style.borderColor = "color-mix(in srgb, #d15353 56%, var(--line))";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    const ok = confirm(`Delete platform "${platform.name}" (${platform.id})?`);
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

  footer.append(saveBtn, deleteBtn, status);
  body.append(
    enabledRow,
    buildField("Default caption suffix", suffixInput),
    buildField("Notes", notesInput),
    document.createElement("hr"),
    settingsGrid,
    document.createElement("hr"),
    authGrid,
    footer
  );
  card.append(toggle, body);
  return card;
}

async function loadPlatforms() {
  platformList.innerHTML = "";
  platformSummary.textContent = "Loading...";
  try {
    platforms = await apiFetch("/api/admin/social/platforms", { method: "GET" });
    platformSummary.textContent = `${platforms.length} platform${platforms.length === 1 ? "" : "s"} configured`;
    if (!platforms.length) {
      const empty = document.createElement("div");
      empty.className = "sub";
      empty.textContent = "No platforms yet.";
      platformList.appendChild(empty);
      return;
    }
    for (const platform of platforms) {
      platformList.appendChild(platformCard(platform));
    }
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
