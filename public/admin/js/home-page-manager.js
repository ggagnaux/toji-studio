    import { ensureBaseStyles, setYearFooter, showToast } from "../admin.js";

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

    function syncToggleVisual(toggle){
      if (!toggle) return;
      const row = toggle.closest(".home-toggle");
      const stateEl = row?.querySelector("[data-toggle-state]");
      const on = !!toggle.checked;
      row?.classList.toggle("is-enabled", on);
      if (stateEl) stateEl.textContent = on ? "Enabled" : "Disabled";
    }

    if (homeHeroToggle) {
      const raw = localStorage.getItem(HOME_HERO_VISIBLE_KEY);
      homeHeroToggle.checked = raw == null ? true : raw === "1";
      syncToggleVisual(homeHeroToggle);
      homeHeroToggle.addEventListener("change", () => {
        localStorage.setItem(HOME_HERO_VISIBLE_KEY, homeHeroToggle.checked ? "1" : "0");
        syncToggleVisual(homeHeroToggle);
        showToast("Home Intro visibility saved.", { tone: "success" });
      });
    }

    if (homeLatestToggle) {
      homeLatestToggle.checked = localStorage.getItem(HOME_LATEST_VISIBLE_KEY) === "1";
      syncToggleVisual(homeLatestToggle);
      homeLatestToggle.addEventListener("change", () => {
        localStorage.setItem(HOME_LATEST_VISIBLE_KEY, homeLatestToggle.checked ? "1" : "0");
        syncToggleVisual(homeLatestToggle);
        showToast("Latest section visibility saved.", { tone: "success" });
      });
    }

    if (homeFeaturedToggle) {
      const raw = localStorage.getItem(HOME_FEATURED_VISIBLE_KEY);
      homeFeaturedToggle.checked = raw == null ? true : raw === "1";
      syncToggleVisual(homeFeaturedToggle);
      homeFeaturedToggle.addEventListener("change", () => {
        localStorage.setItem(HOME_FEATURED_VISIBLE_KEY, homeFeaturedToggle.checked ? "1" : "0");
        syncToggleVisual(homeFeaturedToggle);
        showToast("Featured section visibility saved.", { tone: "success" });
      });
    }

    if (homeSeriesToggle) {
      const raw = localStorage.getItem(HOME_SERIES_VISIBLE_KEY);
      homeSeriesToggle.checked = raw == null ? true : raw === "1";
      syncToggleVisual(homeSeriesToggle);
      homeSeriesToggle.addEventListener("change", () => {
        localStorage.setItem(HOME_SERIES_VISIBLE_KEY, homeSeriesToggle.checked ? "1" : "0");
        syncToggleVisual(homeSeriesToggle);
        showToast("Series section visibility saved.", { tone: "success" });
      });
    }

    if (homeFeaturedSlideshowToggle) {
      const raw = localStorage.getItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY);
      homeFeaturedSlideshowToggle.checked = raw == null ? true : raw === "1";
      syncToggleVisual(homeFeaturedSlideshowToggle);
      homeFeaturedSlideshowToggle.addEventListener("change", () => {
        localStorage.setItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY, homeFeaturedSlideshowToggle.checked ? "1" : "0");
        syncToggleVisual(homeFeaturedSlideshowToggle);
        showToast("Featured slideshow visibility saved.", { tone: "success" });
      });
    }
  

