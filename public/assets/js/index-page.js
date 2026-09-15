    import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { initStickyHero } from "./site.js";
    import { el, slugifySeries, sortGallery, createArtworkLightboxController, resolveArtworkSeriesEntries, getCompactSeriesDisplay } from "./content-utils.js";
    import { initializeHomeSplash } from "./splash-runtime.js";

    renderPublicHeader({
      active: "home",
      small: "home",
      ctaText: "Explore",
      ctaHref: "gallery.html",
      showThemeControls: false
    });
    renderPublicFooter({
      rightHtml: `<a href="index.html">Home</a> • <a href="gallery.html">Gallery</a> • <a href="series.html">Series</a> • <a href="contact.html">Contact</a> • <a href="admin/index.html">Studio</a>`
    });

    initStickyHero({ heroSelector: "#homeHeroSection" });

    await initializeHomeSplash();

    const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
    const HOME_HERO_VISIBLE_KEY = "toji_home_hero_visible_v1";
    const HOME_LATEST_VISIBLE_KEY = "toji_home_latest_visible_v1";
    const HOME_FEATURED_VISIBLE_KEY = "toji_home_featured_visible_v1";
    const HOME_SERIES_VISIBLE_KEY = "toji_home_series_visible_v1";
    const HOME_FEATURED_SLIDESHOW_VISIBLE_KEY = "toji_home_featured_slideshow_visible_v1";
    const FALLBACK_URL = "assets/data/admin.sample.json";
    const API_BASE = (getLocalStorageItem("toji_api_base") || window.location.origin || "").replace(/\/+$/, "");

    function getLocalStorageItem(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }

    function normalizeMediaUrl(path) {
      const value = String(path || "").trim();
      if (!value || value.startsWith("http")) return value;
      if (value.startsWith("/")) return `${API_BASE}${value}`;
      return value;
    }

    async function tryFetchJson(url) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    }

    function normalizePublicArtwork(artwork) {
      return {
        ...artwork,
        thumb: normalizeMediaUrl(artwork?.thumb),
        image: normalizeMediaUrl(artwork?.image)
      };
    }

    function normalizePublicSeries(series) {
      return {
        ...series,
        coverThumb: normalizeMediaUrl(series?.coverThumb),
        imageOrder: Array.isArray(series?.imageOrder)
          ? series.imageOrder.map((id) => String(id || "").trim()).filter(Boolean)
          : []
      };
    }

    function normalizeBooleanSetting(value, fallback) {
      if (typeof value === "boolean") return value;
      if (value == null) return fallback;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized) return fallback;
      return normalized !== "0" && normalized !== "false" && normalized !== "off" && normalized !== "no";
    }

    function readLocalHomePageSettings() {
      const heroRaw = getLocalStorageItem(HOME_HERO_VISIBLE_KEY);
      const featuredRaw = getLocalStorageItem(HOME_FEATURED_VISIBLE_KEY);
      const seriesRaw = getLocalStorageItem(HOME_SERIES_VISIBLE_KEY);
      const slideshowRaw = getLocalStorageItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY);
      return {
        heroVisible: heroRaw == null ? true : heroRaw === "1",
        latestVisible: getLocalStorageItem(HOME_LATEST_VISIBLE_KEY) === "1",
        featuredVisible: featuredRaw == null ? true : featuredRaw === "1",
        seriesVisible: seriesRaw == null ? true : seriesRaw === "1",
        featuredSlideshowVisible: slideshowRaw == null ? true : slideshowRaw === "1"
      };
    }

    function normalizeHomePageSettings(settings) {
      const local = readLocalHomePageSettings();
      const input = settings && typeof settings === "object" ? settings : {};
      return {
        heroVisible: normalizeBooleanSetting(input.heroVisible, local.heroVisible),
        latestVisible: normalizeBooleanSetting(input.latestVisible, local.latestVisible),
        featuredVisible: normalizeBooleanSetting(input.featuredVisible, local.featuredVisible),
        seriesVisible: normalizeBooleanSetting(input.seriesVisible, local.seriesVisible),
        featuredSlideshowVisible: normalizeBooleanSetting(input.featuredSlideshowVisible, local.featuredSlideshowVisible)
      };
    }

    function cacheHomePageSettings(settings) {
      try {
        localStorage.setItem(HOME_HERO_VISIBLE_KEY, settings.heroVisible ? "1" : "0");
        localStorage.setItem(HOME_LATEST_VISIBLE_KEY, settings.latestVisible ? "1" : "0");
        localStorage.setItem(HOME_FEATURED_VISIBLE_KEY, settings.featuredVisible ? "1" : "0");
        localStorage.setItem(HOME_SERIES_VISIBLE_KEY, settings.seriesVisible ? "1" : "0");
        localStorage.setItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY, settings.featuredSlideshowVisible ? "1" : "0");
      } catch {}
    }

    async function loadHomePageSettings() {
      const saved = await tryFetchJson(`${API_BASE}/api/public/settings/home-page`);
      const normalized = normalizeHomePageSettings(saved);
      if (saved) cacheHomePageSettings(normalized);
      return normalized;
    }

    function buildSeriesMeta(rows) {
      const meta = {};
      (rows || []).forEach((series) => {
        const slug = String(series?.slug || slugifySeries(series?.name || "")).trim();
        if (!slug) return;
        meta[slug] = normalizePublicSeries({ ...series, slug });
      });
      return meta;
    }

    async function loadHomeState() {
      const [publicArtworks, publicSeries] = await Promise.all([
        tryFetchJson(`${API_BASE}/api/public/artworks`),
        tryFetchJson(`${API_BASE}/api/public/series`)
      ]);
      if (Array.isArray(publicArtworks)) {
        const seriesRows = Array.isArray(publicSeries) ? publicSeries.map(normalizePublicSeries) : [];
        return {
          settings: {},
          tags: [],
          series: seriesRows,
          seriesMeta: buildSeriesMeta(seriesRows),
          artworks: publicArtworks.map(normalizePublicArtwork)
        };
      }

      const saved = getLocalStorageItem(ADMIN_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fall through
        }
      }
      const res = await fetch(FALLBACK_URL, { cache: "no-store" });
      return res.json();
    }

    // ---- Lightbox ----
    const lightbox = createArtworkLightboxController();
    document.body.appendChild(lightbox.host);
    const openLightbox = (list, idx) => lightbox.open(list, idx);

    // ---- Render UI ----
    const featuredSection = document.getElementById("featuredSection");
    const featuredStrip = document.getElementById("featuredStrip");
    const featuredHint = document.getElementById("featuredHint");
    const homeSeriesSection = document.getElementById("homeSeriesSection");
    const homeSeriesGrid = document.getElementById("homeSeriesGrid");
    const homeSeriesHint = document.getElementById("homeSeriesHint");
    const homeHeroSection = document.getElementById("homeHeroSection");
    const featuredSlideshowSection = document.getElementById("featuredSlideshowSection");
    const featuredSlideshow = document.getElementById("featuredSlideshow");
    const featuredSlideshowHint = document.getElementById("featuredSlideshowHint");

    const latestSection = document.getElementById("latestSection");
    const latestGrid = document.getElementById("latestGrid");
    const latestHint = document.getElementById("latestHint");
    const homePageSettings = await loadHomePageSettings();
    const isHeroVisible = homePageSettings.heroVisible;
    const isFeaturedVisible = homePageSettings.featuredVisible;
    const isSeriesVisible = homePageSettings.seriesVisible;
    const isSlideshowVisible = homePageSettings.featuredSlideshowVisible;
    const isLatestVisible = homePageSettings.latestVisible;
    if (homeHeroSection) homeHeroSection.style.display = isHeroVisible ? "" : "none";
    latestSection.style.display = isLatestVisible ? "" : "none";

    const state = await loadHomeState();
    const all = sortGallery((state.artworks || []).filter(a => a.status === "published"));
    const seriesMetaRows = Object.values(state.seriesMeta || {});
    const seriesMetaByName = new Map(
      seriesMetaRows
        .filter(m => m && m.name)
        .map(m => [String(m.name).trim().toLowerCase(), m])
    );
    const seriesMetaBySlug = new Map(
      seriesMetaRows
        .filter(m => m && m.slug)
        .map(m => [String(m.slug).trim().toLowerCase(), m])
    );
    const featured = sortGallery(all.filter(a => a.featured));

    function getArtworkSeriesEntries(artwork) {
      return resolveArtworkSeriesEntries(artwork, state);
    }

    function getArtworkSeriesLabel(artwork, compact = false) {
      const display = getCompactSeriesDisplay(artwork, state);
      if (compact) return display.compactLabel;
      return display.entries.map((entry) => entry.name).join(", ");
    }

    function getSeriesSummary(meta, items) {
      const description = String(meta?.description || "").trim();
      if (description) return description;
      return `${items.length} published piece${items.length === 1 ? "" : "s"} arranged as a single body of work.`;
    }

    if (isFeaturedVisible) {
      renderFeatured(featured);
    } else {
      featuredSection.style.display = "none";
    }

    // Latest (excluding featured duplicates)
    if (isLatestVisible) {
      const latest = sortGallery(all.filter(a => !a.featured)).slice(0, 9);
      renderLatest(latest);
    }

    if (isSeriesVisible) {
      renderSeries(all);
    } else if (homeSeriesSection) {
      homeSeriesSection.style.display = "none";
    }

        function renderFeaturedSlideshow(items) {
      if (!featuredSlideshowSection || !featuredSlideshow) return;

      if (!items.length || !isSlideshowVisible) {
        featuredSlideshowSection.style.display = "none";
        featuredSlideshow.innerHTML = "";
        return;
      }

      featuredSlideshowSection.style.display = "";
      if (featuredSlideshowHint) {
        featuredSlideshowHint.textContent = `${items.length} image${items.length === 1 ? "" : "s"}`;
      }
      featuredSlideshow.innerHTML = "";

      const carousel = el("div", { class: "home-slideshow-carousel" });
      const track = el("div", { class: "home-slideshow-track" });
      const loops = [...items, ...items];
      const speedPerItem = 8; // 0 == fastest motion
      const duration = Math.max(24, loops.length * speedPerItem);
      track.style.setProperty("--carousel-duration", `${duration}s`);

      loops.forEach((a) => {
        const realIndex = items.findIndex(x => x.id === a.id);
        track.appendChild(
          el("a", {
            class: "home-slideshow-item",
            href: `artwork.html?id=${encodeURIComponent(a.id)}`,
            onclick: (e) => { e.preventDefault(); openLightbox(items, Math.max(0, realIndex)); }
          },
            el("img", { src: a.image || a.thumb, alt: a.alt || a.title || "Featured artwork", loading: "lazy" })
          )
        );
      });

      carousel.appendChild(track);
      featuredSlideshow.appendChild(carousel);
    }

    renderFeaturedSlideshow(featured);

    function renderSeries(items) {
      if (!homeSeriesSection || !homeSeriesGrid || !homeSeriesHint) return;

      const withSeries = sortGallery(items.filter((a) => getArtworkSeriesEntries(a).length));
      const bySeries = new Map();
      for (const a of withSeries) {
        for (const entry of getArtworkSeriesEntries(a)) {
          const key = String(entry.slug || "").trim();
          if (!key) continue;
          if (!bySeries.has(key)) bySeries.set(key, { name: entry.name, items: [] });
          bySeries.get(key).items.push(a);
        }
      }

      const entries = Array.from(bySeries.entries())
        .map(([slug, group]) => {
          const name = group.name;
          const list = group.items;
          const meta = seriesMetaByName.get(name.toLowerCase()) || seriesMetaBySlug.get(slug) || null;
          const cover = (meta && meta.coverThumb) || list[0]?.thumb || list[0]?.image || "assets/img/placeholders/p1.jpg";
          const description = (meta && meta.description) || "";
          const sortOrder = Number((meta && meta.sortOrder) || 0);
          const items = sortGallery(list);
          return { name, slug, cover, description, count: items.length, sortOrder, items };
        })
        .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

      homeSeriesGrid.innerHTML = "";
      if (!entries.length) {
        homeSeriesSection.style.display = "none";
        return;
      }

      homeSeriesSection.style.display = "";
      homeSeriesHint.textContent = `${entries.length} series`;

      for (const s of entries) {
        const previewItems = s.items.slice(0, 3);
        homeSeriesGrid.appendChild(
          el("article", { class: "home-series-item home-series-card" },
            el("a", {
              class: "home-series-card__coverlink",
              href: `series.html?s=${encodeURIComponent(s.slug)}`
            },
              el("div", { class: "home-series-card__cover" },
                el("img", { src: s.cover, alt: `${s.name} cover artwork`, loading: "lazy" })
              )
            ),
            el("div", { class: "home-series-card__body" },
              el("p", { class: "home-series-card__eyebrow" }, "Series"),
              el("h3", { class: "home-series-card__title" }, s.name),
              el("p", { class: "home-series-card__summary" }, getSeriesSummary({ description: s.description }, s.items)),
              el("div", { class: "home-series-card__meta" },
                el("span", { class: "home-series-card__pill" }, `${s.count} piece${s.count === 1 ? "" : "s"}`),
                s.items.some((item) => item.featured) ? el("span", { class: "home-series-card__pill" }, "Featured work inside") : null
              ),
              el("div", { class: "home-series-card__preview", "aria-hidden": "true" },
                ...previewItems.map((item) => el("img", {
                  src: item.thumb || item.image || s.cover,
                  alt: "",
                  loading: "lazy"
                }))
              ),
              el("div", { class: "home-series-card__actions" },
                el("a", { class: "btn primary", href: `series.html?s=${encodeURIComponent(s.slug)}` }, "Open series"),
                el("button", {
                  class: "btn",
                  type: "button",
                  onclick: (e) => {
                    e.preventDefault();
                    openLightbox(s.items, 0);
                  }
                }, "Preview works")
              )
            )
          )
        );
      }
    }

    function renderFeatured(items) {
      featuredStrip.innerHTML = "";

      if (!items.length) {
        featuredSection.style.display = "none";
        return;
      }

      featuredSection.style.display = "";
      featuredHint.textContent = `${items.length} piece${items.length === 1 ? "" : "s"}`;

      items.forEach((a, idx) => {
        const card = el("a", {
          class: "card home-featured-card",
          href: `artwork.html?id=${encodeURIComponent(a.id)}`,
          style: "",
          //onclick: null // (e)=>{ e.preventDefault(); openLightbox(items, idx); }
          onclick: (e)=>{ e.preventDefault(); openLightbox(items, idx); }
        },
          el("div", { class: "thumb" },
            el("img", { src: a.thumb || a.image, alt: a.alt || a.title || "Artwork", loading: "lazy" })
          ),
          el("div", { class: "meta" },
            el("p", { class: "home-featured-card__eyebrow" }, "Featured work"),
            el("p", { class: "title" }, a.title || "Untitled"),
            el("p", { class: "sub" }, [getArtworkSeriesLabel(a, true) || null, a.year || null].filter(Boolean).join(" • ") || " ")
          )
        );

        featuredStrip.appendChild(card);
      });
    }

    function renderLatest(items) {
      latestGrid.innerHTML = "";
      latestHint.textContent = `${items.length} piece${items.length === 1 ? "" : "s"}`;

      if (!items.length) {
        latestGrid.appendChild(
          el("div", { class: "card", style: "grid-column: span 12; box-shadow:none" },
            el("div", { class: "meta" },
              el("p", { class: "title" }, "No published work yet"),
              el("p", { class: "sub" }, "Publish pieces in Studio to populate the homepage.")
            )
          )
        );
        return;
      }

      items.forEach((a, idx) => {
        const card = el("a", {
          class: "card home-latest-card",
          href: `artwork.html?id=${encodeURIComponent(a.id)}`,
          style: `
            grid-column: span 4;
            box-shadow:none;
          `,
          onclick:(e)=>{ e.preventDefault(); openLightbox(items, idx); }
        },
          el("div", { class: "thumb" },
            el("img", { src: a.thumb || a.image, alt: a.alt || a.title || "Artwork", loading: "lazy" })
          ),
          el("div", { class: "meta" },
            el("p", { class: "title" }, a.title || "Untitled"),
            el("p", { class: "sub" }, [getArtworkSeriesLabel(a, true) || null, a.year || null].filter(Boolean).join(" • ") || " ")
          )
        );

        latestGrid.appendChild(card);
      });

      // Responsive spans
      const mq1 = window.matchMedia("(max-width: 920px)");
      const mq2 = window.matchMedia("(max-width: 620px)");
      const applySpans = () => {
        const span = mq2.matches ? 12 : (mq1.matches ? 6 : 4);
        latestGrid.querySelectorAll(".card").forEach(c => c.style.gridColumn = `span ${span}`);
      };
      applySpans();
      mq1.onchange = applySpans;
      mq2.onchange = applySpans;
    }
