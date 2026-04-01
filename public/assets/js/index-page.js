    import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { initStickyHero } from "./site.js";
    import { el, slugifySeries, sortGallery, createArtworkLightboxController } from "./content-utils.js";
import { initializeHomeSplash } from "./splash-runtime.js";

	    renderPublicHeader({
	      active: "home",
	      small: "home",
	      ctaText: "Explore",
	      ctaHref: "gallery.html"
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

    async function loadHomeState() {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
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
    const heroRaw = localStorage.getItem(HOME_HERO_VISIBLE_KEY);
    const isHeroVisible = heroRaw == null ? true : heroRaw === "1";
    const featuredRaw = localStorage.getItem(HOME_FEATURED_VISIBLE_KEY);
    const isFeaturedVisible = featuredRaw == null ? true : featuredRaw === "1";
    const seriesRaw = localStorage.getItem(HOME_SERIES_VISIBLE_KEY);
    const isSeriesVisible = seriesRaw == null ? true : seriesRaw === "1";
    const slideshowRaw = localStorage.getItem(HOME_FEATURED_SLIDESHOW_VISIBLE_KEY);
    const isSlideshowVisible = slideshowRaw == null ? true : slideshowRaw === "1";
    const isLatestVisible = localStorage.getItem(HOME_LATEST_VISIBLE_KEY) === "1";
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
      const speedPerItem = 5.5;
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

      const withSeries = sortGallery(items.filter(a => a.series));
      const bySeries = new Map();
      for (const a of withSeries) {
        const key = String(a.series || "").trim();
        if (!key) continue;
        if (!bySeries.has(key)) bySeries.set(key, []);
        bySeries.get(key).push(a);
      }

      const entries = Array.from(bySeries.entries())
        .map(([name, list]) => {
          const slug = slugifySeries(name);
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
        const previewItems = s.items.slice(0, 8);
        homeSeriesGrid.appendChild(
          el("article", { class: "home-series-item" },
            el("a", {
              class: "card series-card",
              href: "#",
              onclick: (e) => {
                e.preventDefault();
                openLightbox(s.items, 0);
              }
            },
              el("div", { class: "series-masonry", "aria-hidden": "true" },
                ...previewItems.map((item) => el("img", {
                  src: item.thumb || item.image || s.cover,
                  alt: "",
                  loading: "lazy"
                }))
              ),
              el("div", { class: "meta" },
                el("p", { class: "title" }, s.name),
                el("p", { class: "sub" }, `${s.count} piece${s.count === 1 ? "" : "s"}`)
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
          class: "card",
          href: `artwork.html?id=${encodeURIComponent(a.id)}`,
          style: "",
          //onclick: null // (e)=>{ e.preventDefault(); openLightbox(items, idx); }
          onclick: (e)=>{ e.preventDefault(); openLightbox(items, idx); }
        },
          el("div", { class: "thumb" },
            el("img", { src: a.thumb || a.image, alt: a.alt || a.title || "Artwork", loading: "lazy" })
          ),
          el("div", { class: "meta" },
            el("p", { class: "title" }, a.title || "Untitled"),
            el("p", { class: "sub" }, [a.series || null, a.year || null].filter(Boolean).join(" • ") || " ")
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
          class: "card",
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
            el("p", { class: "sub" }, [a.series || null, a.year || null].filter(Boolean).join(" • ") || " ")
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
