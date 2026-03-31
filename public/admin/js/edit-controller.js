export const AI_FEATURES_ENABLED_KEY = "toji_ai_features_enabled_v1";

export function isAiFeaturesEnabled(storageRef = globalThis.localStorage) {
  const raw = storageRef?.getItem?.(AI_FEATURES_ENABLED_KEY);
  if (raw == null) return true;
  const value = String(raw).trim().toLowerCase();
  return value !== "0" && value !== "false" && value !== "off" && value !== "no";
}

export function syncAiButtons({
  storageRef = globalThis.localStorage,
  descriptionButton,
  tagsButton,
  generatingDescription = false,
  generatingTags = false
} = {}) {
  const enabled = isAiFeaturesEnabled(storageRef);
  const disabledHint = "Enable AI features in Other Settings to use this action.";

  if (descriptionButton) {
    descriptionButton.disabled = !enabled || !!generatingDescription;
    descriptionButton.title = enabled ? "" : disabledHint;
    if (enabled) descriptionButton.removeAttribute?.("data-tooltip");
    else descriptionButton.setAttribute?.("data-tooltip", disabledHint);
    descriptionButton.setAttribute?.("aria-disabled", descriptionButton.disabled ? "true" : "false");
  }

  if (tagsButton) {
    tagsButton.disabled = !enabled || !!generatingTags;
    tagsButton.title = enabled ? "" : disabledHint;
    if (enabled) tagsButton.removeAttribute?.("data-tooltip");
    else tagsButton.setAttribute?.("data-tooltip", disabledHint);
    tagsButton.setAttribute?.("aria-disabled", tagsButton.disabled ? "true" : "false");
  }

  return enabled;
}

export function setEditTabState(tab, { buttons = {}, panes = {}, tabContent = null } = {}) {
  const onDetails = tab === "details";
  const onTags = tab === "tags";
  const onSocial = tab === "social";

  buttons.details?.classList?.toggle?.("is-active", onDetails);
  buttons.tags?.classList?.toggle?.("is-active", onTags);
  buttons.social?.classList?.toggle?.("is-active", onSocial);

  tabContent?.classList?.remove?.("tab-active-details", "tab-active-tags", "tab-active-social");
  if (onTags) tabContent?.classList?.add?.("tab-active-tags");
  else if (onSocial) tabContent?.classList?.add?.("tab-active-social");
  else tabContent?.classList?.add?.("tab-active-details");

  if (onDetails) panes.details?.removeAttribute?.("hidden");
  else panes.details?.setAttribute?.("hidden", "");

  if (onTags) panes.tags?.removeAttribute?.("hidden");
  else panes.tags?.setAttribute?.("hidden", "");

  if (onSocial) panes.social?.removeAttribute?.("hidden");
  else panes.social?.setAttribute?.("hidden", "");

  return tab;
}

export function initEditTabController({ buttons = {}, panes = {}, tabContent = null, initialTab = "details" } = {}) {
  let currentTab = setEditTabState(initialTab, { buttons, panes, tabContent });

  const bind = (name) => () => {
    currentTab = setEditTabState(name, { buttons, panes, tabContent });
    return currentTab;
  };

  const handlers = {
    details: bind("details"),
    tags: bind("tags"),
    social: bind("social")
  };

  buttons.details?.addEventListener?.("click", handlers.details);
  buttons.tags?.addEventListener?.("click", handlers.tags);
  buttons.social?.addEventListener?.("click", handlers.social);

  return {
    getCurrentTab() {
      return currentTab;
    },
    setTab(nextTab) {
      currentTab = setEditTabState(nextTab, { buttons, panes, tabContent });
      return currentTab;
    },
    dispose() {
      buttons.details?.removeEventListener?.("click", handlers.details);
      buttons.tags?.removeEventListener?.("click", handlers.tags);
      buttons.social?.removeEventListener?.("click", handlers.social);
    }
  };
}
