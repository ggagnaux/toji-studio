    import { ensureBaseStyles, setYearFooter, showToast, apiFetch } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();

    const HOME_HERO_VISIBLE_KEY = "toji_home_hero_visible_v1";
    const HOME_LATEST_VISIBLE_KEY = "toji_home_latest_visible_v1";
    const HOME_FEATURED_VISIBLE_KEY = "toji_home_featured_visible_v1";
    const HOME_SERIES_VISIBLE_KEY = "toji_home_series_visible_v1";
    const HOME_FEATURED_SLIDESHOW_VISIBLE_KEY = "toji_home_featured_slideshow_visible_v1";

    const homeHeroToggle = document.getElementById("homeHeroToggle");
    const homeLatestToggle = document.getElementById("homeLatestToggle");
    const homeFeaturedToggle = document.getElementById("homeFeaturedToggle");
    const homeSeriesToggle = document.getElementById("homeSeriesToggle");
    const homeFeaturedSlideshowToggle = document.getElementById("homeFeaturedSlideshowToggle");

    function normalizeBooleanSetting(value, fallback) {
      if (typeof value === "boolean") return value;
      if (value == null) return fallback;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized) return fallback;
      return normalized !== "0" && normalized !== "false" && normalized !== "off" && normalized !== "no";
    }

    function readLocalHomePageSettings() {
      const heroRaw = localStorage.getItem(HOME_HERO_VISIBLE_KEY);
      const featuredRaw = localStorage.getItem(HOME_FEATURED_VISIBLE_KEY);
      const seriesRaw = localStorage.getItem(HOME_SERIES_VISIBLE_KEY);
      const slideshowRaw = localStorage.getItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY);
      return {
        heroVisible: heroRaw == null ? true : heroRaw === "1",
        latestVisible: localStorage.getItem(HOME_LATEST_VISIBLE_KEY) === "1",
        featuredVisible: featuredRaw == null ? true : featuredRaw === "1",
        seriesVisible: seriesRaw == null ? true : seriesRaw === "1",
        featuredSlideshowVisible: slideshowRaw == null ? true : slideshowRaw === "1"
      };
    }

    function applyHomePageSettingsToLocalStorage(settings) {
      const normalized = {
        heroVisible: normalizeBooleanSetting(settings?.heroVisible, true),
        latestVisible: normalizeBooleanSetting(settings?.latestVisible, false),
        featuredVisible: normalizeBooleanSetting(settings?.featuredVisible, true),
        seriesVisible: normalizeBooleanSetting(settings?.seriesVisible, true),
        featuredSlideshowVisible: normalizeBooleanSetting(settings?.featuredSlideshowVisible, true)
      };
      localStorage.setItem(HOME_HERO_VISIBLE_KEY, normalized.heroVisible ? "1" : "0");
      localStorage.setItem(HOME_LATEST_VISIBLE_KEY, normalized.latestVisible ? "1" : "0");
      localStorage.setItem(HOME_FEATURED_VISIBLE_KEY, normalized.featuredVisible ? "1" : "0");
      localStorage.setItem(HOME_SERIES_VISIBLE_KEY, normalized.seriesVisible ? "1" : "0");
      localStorage.setItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY, normalized.featuredSlideshowVisible ? "1" : "0");
      return normalized;
    }

    function collectHomePageSettings() {
      return {
        heroVisible: !!homeHeroToggle?.checked,
        latestVisible: !!homeLatestToggle?.checked,
        featuredVisible: !!homeFeaturedToggle?.checked,
        seriesVisible: !!homeSeriesToggle?.checked,
        featuredSlideshowVisible: !!homeFeaturedSlideshowToggle?.checked
      };
    }

    function applyHomePageSettings(settings) {
      const normalized = applyHomePageSettingsToLocalStorage(settings);
      if (homeHeroToggle) homeHeroToggle.checked = normalized.heroVisible;
      if (homeLatestToggle) homeLatestToggle.checked = normalized.latestVisible;
      if (homeFeaturedToggle) homeFeaturedToggle.checked = normalized.featuredVisible;
      if (homeSeriesToggle) homeSeriesToggle.checked = normalized.seriesVisible;
      if (homeFeaturedSlideshowToggle) homeFeaturedSlideshowToggle.checked = normalized.featuredSlideshowVisible;
      [homeHeroToggle, homeLatestToggle, homeFeaturedToggle, homeSeriesToggle, homeFeaturedSlideshowToggle]
        .forEach(syncToggleVisual);
    }

    function syncToggleVisual(toggle){
      if (!toggle) return;
      const row = toggle.closest(".home-toggle");
      const stateEl = row?.querySelector("[data-toggle-state]");
      const on = !!toggle.checked;
      row?.classList.toggle("is-enabled", on);
      if (stateEl) stateEl.textContent = on ? "Enabled" : "Disabled";
    }

    async function loadHomePageSettings() {
      const fallback = readLocalHomePageSettings();
      try {
        const saved = await apiFetch("/api/admin/settings/home-page", { method: "GET" });
        applyHomePageSettings(saved);
      } catch (error) {
        console.warn("Failed to load backend home page settings; using local cache.", error);
        applyHomePageSettings(fallback);
      }
    }

    async function saveHomePageSettings(message) {
      const settings = applyHomePageSettingsToLocalStorage(collectHomePageSettings());
      [homeHeroToggle, homeLatestToggle, homeFeaturedToggle, homeSeriesToggle, homeFeaturedSlideshowToggle]
        .forEach(syncToggleVisual);
      try {
        const saved = await apiFetch("/api/admin/settings/home-page", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings)
        });
        applyHomePageSettings(saved);
        showToast(message, { tone: "success" });
      } catch (error) {
        console.warn("Failed to save backend home page settings; kept local cache.", error);
        showToast("Saved locally, but backend update failed.", { tone: "warn" });
      }
    }

    applyHomePageSettings(readLocalHomePageSettings());
    await loadHomePageSettings();

    homeHeroToggle?.addEventListener("change", () => void saveHomePageSettings("Home Intro visibility saved."));
    homeLatestToggle?.addEventListener("change", () => void saveHomePageSettings("Latest section visibility saved."));
    homeFeaturedToggle?.addEventListener("change", () => void saveHomePageSettings("Featured section visibility saved."));
    homeSeriesToggle?.addEventListener("change", () => void saveHomePageSettings("Series section visibility saved."));
    homeFeaturedSlideshowToggle?.addEventListener("change", () => void saveHomePageSettings("Featured slideshow visibility saved."));
  

