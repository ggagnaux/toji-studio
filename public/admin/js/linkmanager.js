import {
  apiFetch,
  el,
  setYearFooter,
  ensureBaseStyles,
  showToast
} from "../admin.js";

ensureBaseStyles();
setYearFooter();

const LEGACY_ADMIN_STATE_KEY = "toji_admin_state_v1";
const EXTERNAL_LINK_CATEGORIES = ["social", "portfolio", "shop", "video", "newsletter", "other"];

const externalLinksRows = document.getElementById("externalLinksRows");
const externalLinksHint = document.getElementById("externalLinksHint");
const externalLinksAddBtn = document.getElementById("externalLinksAdd");

let externalLinksDraft = [];
let externalLinksSaveTimer = null;
let externalLinksSaveChain = Promise.resolve();

function clearExternalLinksAutoSave() {
  clearTimeout(externalLinksSaveTimer);
  externalLinksSaveTimer = null;
}

function uniqueLinkId() {
  return `lnk_${Math.random().toString(16).slice(2, 10)}`;
}

function emptyExternalLink() {
  return {
    id: uniqueLinkId(),
    label: "",
    url: "",
    category: "social",
    enabled: true,
    _persisted: false
  };
}

function cloneExternalLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.map((row) => ({
    id: String(row?.id || uniqueLinkId()),
    label: String(row?.label || ""),
    url: String(row?.url || ""),
    category: EXTERNAL_LINK_CATEGORIES.includes(String(row?.category || "").toLowerCase())
      ? String(row.category).toLowerCase()
      : "other",
    enabled: row?.enabled == null ? true : !!row.enabled,
    _persisted: !!row?._persisted
  }));
}

function hydrateExternalLinks(rows, persisted = true) {
  return cloneExternalLinks(rows).map((row) => ({
    ...row,
    _persisted: persisted
  }));
}

function normalizeExternalLinksForBulkSave(links) {
  const used = new Set();
  return cloneExternalLinks(links)
    .filter((row) => row.label.trim() || row.url.trim())
    .map((row) => {
      let id = row.id;
      while (!id || used.has(id)) id = uniqueLinkId();
      used.add(id);
      return {
        id,
        label: row.label.trim(),
        url: row.url.trim(),
        category: row.category,
        enabled: !!row.enabled
      };
    });
}

function validateExternalLink(row, index) {
  const label = String(row?.label || "").trim();
  const url = String(row?.url || "").trim();
  const rowLabel = `Link ${index + 1}`;

  if (!label || !url) return `${rowLabel} must include both a label and a URL.`;
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    return `${rowLabel} URL must start with https://, http://, mailto:, or tel:.`;
  }
  if (/^https?:\/\//i.test(url)) {
    try {
      new URL(url);
    } catch {
      return `${rowLabel} has an invalid URL.`;
    }
  }
  return "";
}

function buildExternalLinkPayload(row, index) {
  return {
    id: String(row?.id || uniqueLinkId()),
    label: String(row?.label || "").trim(),
    url: String(row?.url || "").trim(),
    category: EXTERNAL_LINK_CATEGORIES.includes(String(row?.category || "").toLowerCase())
      ? String(row.category).toLowerCase()
      : "other",
    enabled: !!row?.enabled,
    sortOrder: index
  };
}

function getLegacyExternalLinks() {
  try {
    const raw = localStorage.getItem(LEGACY_ADMIN_STATE_KEY);
    if (!raw) return [];
    const state = JSON.parse(raw);
    return normalizeExternalLinksForBulkSave(state?.settings?.externalLinks);
  } catch {
    return [];
  }
}

async function fetchExternalLinks() {
  const rows = await apiFetch("/api/admin/external-links", { method: "GET" });
  return hydrateExternalLinks(rows, true);
}

async function replaceExternalLinks(links) {
  const rows = await apiFetch("/api/admin/external-links", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(links)
  });
  return hydrateExternalLinks(rows, true);
}

async function createExternalLink(payload) {
  const row = await apiFetch("/api/admin/external-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { ...row, _persisted: true };
}

async function updateExternalLink(id, payload) {
  const row = await apiFetch(`/api/admin/external-links/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { ...row, _persisted: true };
}

async function deleteExternalLink(id) {
  return apiFetch(`/api/admin/external-links/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

function queueExternalLinkMutation(task) {
  externalLinksSaveChain = externalLinksSaveChain.catch(() => {}).then(task);
  return externalLinksSaveChain;
}

async function migrateLegacyExternalLinksIfNeeded(dbLinks) {
  if (dbLinks.length) return dbLinks;
  const legacyLinks = getLegacyExternalLinks();
  if (!legacyLinks.length) return dbLinks;
  const saved = await replaceExternalLinks(legacyLinks);
  showToast(`Migrated ${saved.length} external link${saved.length === 1 ? "" : "s"} to the database.`, {
    tone: "success"
  });
  return saved;
}

function renderExternalLinksEditor() {
  if (!externalLinksRows || !externalLinksHint) return;
  externalLinksRows.innerHTML = "";
  externalLinksHint.textContent = `${externalLinksDraft.length} link${externalLinksDraft.length === 1 ? "" : "s"}`;

  if (!externalLinksDraft.length) {
    externalLinksRows.appendChild(
      el("div", { class: "sub external-link-empty" }, "No links yet. Add one to get started.")
    );
    return;
  }

  externalLinksDraft.forEach((row, idx) => {
    const popId = `removeLinkConfirm_${row.id || idx}`;
    const rowEl = el("div", { class: `external-link-row${row.enabled ? " is-enabled" : " is-disabled"}` });
    const categorySelect = el("select", {
      "aria-label": `Category for link ${idx + 1}`,
      onchange: () => {
        row.category = EXTERNAL_LINK_CATEGORIES.includes(String(categorySelect.value || "").toLowerCase())
          ? String(categorySelect.value).toLowerCase()
          : "other";
        scheduleExternalLinkRowSave(row);
      }
    });

    EXTERNAL_LINK_CATEGORIES.forEach((name) => {
      const option = new Option(name[0].toUpperCase() + name.slice(1), name, false, row.category === name);
      categorySelect.appendChild(option);
    });

    const labelInput = el("input", {
      type: "text",
      placeholder: "Label (e.g., Instagram)",
      value: row.label,
      "aria-label": `Label for link ${idx + 1}`,
      oninput: () => {
        row.label = labelInput.value;
        scheduleExternalLinkRowSave(row);
      }
    });

    const urlInput = el("input", {
      type: "url",
      placeholder: "https://...",
      value: row.url,
      "aria-label": `URL for link ${idx + 1}`,
      oninput: () => {
        row.url = urlInput.value;
        scheduleExternalLinkRowSave(row);
      }
    });

    const editableControls = [labelInput, urlInput, categorySelect];
    const enabledLabel = el("span", { class: "external-link-toggle-state" }, row.enabled ? "Enabled" : "Disabled");
    const syncRowEnabledState = () => {
      rowEl.classList.toggle("is-enabled", !!row.enabled);
      rowEl.classList.toggle("is-disabled", !row.enabled);
      enabledLabel.textContent = row.enabled ? "Enabled" : "Disabled";
      editableControls.forEach((control) => {
        control.disabled = !row.enabled;
      });
    };

    const enabledCheckbox = el("input", {
      type: "checkbox",
      checked: row.enabled ? "" : null,
      "aria-label": `Enabled state for link ${idx + 1}`,
      onchange: async () => {
        const previousDraft = cloneExternalLinks(externalLinksDraft);
        row.enabled = !!enabledCheckbox.checked;
        syncRowEnabledState();
        clearExternalLinksAutoSave();
        const saved = await saveExternalLinkRow(row, {
          notifySuccess: true,
          silentInvalid: false
        });
        if (!saved) {
          externalLinksDraft = previousDraft;
          renderExternalLinksEditor();
        }
      }
    });

    const enabledToggle = el("label", { class: "external-link-toggle external-link-toggle--slider" },
      enabledCheckbox,
      el("span", { class: "external-link-toggle-slider", "aria-hidden": "true" }),
      enabledLabel
    );

    rowEl.append(
      enabledToggle,
      labelInput,
      urlInput,
      categorySelect,
      el("div", {},
        el("button", {
          class: "btn danger",
          type: "button",
          popovertarget: popId,
          "aria-haspopup": "dialog",
          "aria-label": `Remove link ${row.label || idx + 1}`
        }, "Remove"),
        el("div", {
          id: popId,
          class: "external-link-confirm",
          popover: "auto",
          role: "dialog",
          "aria-label": "Confirm remove link"
        },
        el("p", {}, `Remove "${row.label || "this link"}"?`),
        el("div", { class: "external-link-confirm-actions" },
          el("button", {
            class: "btn",
            type: "button",
            popovertarget: popId,
            popovertargetaction: "hide"
          }, "Cancel"),
          el("button", {
            class: "btn danger",
            type: "button",
            onclick: async () => {
              clearExternalLinksAutoSave();
              const previousDraft = cloneExternalLinks(externalLinksDraft);
              externalLinksDraft.splice(idx, 1);
              renderExternalLinksEditor();

              if (!row._persisted) return;

              const deleted = await queueExternalLinkMutation(async () => {
                await deleteExternalLink(row.id);
                return true;
              }).catch((err) => {
                showToast(`Failed to delete external link: ${err?.message || err}`, { tone: "error" });
                return false;
              });

              if (!deleted) {
                externalLinksDraft = previousDraft;
                renderExternalLinksEditor();
              }
            }
          }, "Remove")
        ))
      )
    );

    syncRowEnabledState();
    externalLinksRows.appendChild(rowEl);
  });
}

async function saveExternalLinkRow(row, { notifySuccess = false, silentInvalid = true } = {}) {
  const index = externalLinksDraft.findIndex((item) => item.id === row.id);
  if (index < 0) return false;

  const isBlank = !String(row.label || "").trim() && !String(row.url || "").trim();
  if (isBlank && !row._persisted) return true;

  const validationError = validateExternalLink(row, index);
  if (validationError) {
    if (!silentInvalid) showToast(validationError, { tone: "error" });
    return false;
  }

  const payload = buildExternalLinkPayload(row, index);
  const saved = await queueExternalLinkMutation(async () => {
    if (row._persisted) {
      return updateExternalLink(row.id, payload);
    }
    return createExternalLink(payload);
  }).catch((err) => {
    showToast(`Failed to save external link: ${err?.message || err}`, { tone: "error" });
    return null;
  });

  if (!saved) return false;

  externalLinksDraft[index] = {
    ...saved,
    _persisted: true
  };
  if (notifySuccess) {
    showToast(`Saved ${saved.label}.`, { tone: "success" });
  }
  renderExternalLinksEditor();
  return true;
}

function scheduleExternalLinkRowSave(row) {
  clearExternalLinksAutoSave();
  externalLinksSaveTimer = window.setTimeout(() => {
    saveExternalLinkRow(row, { notifySuccess: false, silentInvalid: true });
  }, 250);
}

externalLinksAddBtn?.addEventListener("click", () => {
  externalLinksDraft.push(emptyExternalLink());
  renderExternalLinksEditor();
});

async function initializeExternalLinksEditor() {
  if (externalLinksHint) externalLinksHint.textContent = "Loading...";
  try {
    const dbLinks = await fetchExternalLinks();
    externalLinksDraft = await migrateLegacyExternalLinksIfNeeded(dbLinks);
    renderExternalLinksEditor();
  } catch (err) {
    if (externalLinksRows) {
      externalLinksRows.innerHTML = "";
      externalLinksRows.appendChild(el("div", { class: "sub external-link-empty" }, "Failed to load links."));
    }
    if (externalLinksHint) externalLinksHint.textContent = "Load failed";
    showToast(`Failed to load external links: ${err?.message || err}`, { tone: "error" });
  }
}

initializeExternalLinksEditor();
