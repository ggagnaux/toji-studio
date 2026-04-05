import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { initStickyHero } from "./site.js";
    import { qs, el, slugifySeries, sortBySortOrderAndDate, createArtworkLightboxController } from "./content-utils.js";

	    renderPublicHeader({
	      active: "series",
	      small: "series",
	      ctaText: "Explore",
	      ctaHref: "gallery.html",
	      showThemeControls: false
	    });
    renderPublicFooter({
      rightHtml: `<a href="index.html">Home</a> &bull; <a href="gallery.html">Gallery</a> &bull; <a href="series.html">Series</a> &bull; <a href="about.html">About</a> &bull; <a href="contact.html">Contact</a> &bull; <a href="admin/index.html">Studio</a>`
    });

    initStickyHero();

    // -------- Data sources --------
    const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
    const FALLBACK_URL = "assets/data/admin.sample.json";
    const API_BASE = (localStorage.getItem("toji_api_base") || window.location.origin || "").replace(/\/+$/, "");

    function setQS(name, value){
      const u = new URL(location.href);
      if (!value) u.searchParams.delete(name);
      else u.searchParams.set(name, value);
      history.replaceState(null, "", u.toString());
    }

    function normalizeMediaUrl(p){
      if (!p) return p;
      if (p.startsWith("http")) return p;
      if (p.startsWith("/")) return `${API_BASE}${p}`;
      return p;
    }

    async function tryFetchJson(url){
      try{
        const res = await fetch(url, { cache:"no-store" });
        if (!res.ok) return null;
        return await res.json();
      }catch{
        return null;
      }
    }

    async function loadLocalState(){
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
      const res = await fetch(FALLBACK_URL, { cache:"no-store" });
      return res.json();
    }

    // Load from backend if available, else local
    async function loadPublishedArtworks(){
      const rows = await tryFetchJson(`${API_BASE}/api/public/artworks`);
      if (rows) {
        return (rows || []).map(a => ({
          ...a,
          thumb: normalizeMediaUrl(a.thumb),
          image: normalizeMediaUrl(a.image)
        }));
      }
      const state = await loadLocalState();
      const items = (state.artworks || []).filter(a => a.status === "published");
      // Local items may already have absolute media URLs; keep as-is.
      return items;
    }

    async function loadPublicSeries(){
      const rows = await tryFetchJson(`${API_BASE}/api/public/series`);
      if (rows) {
        return (rows || []).map(s => ({
          ...s,
          coverThumb: normalizeMediaUrl(s.coverThumb),
        imageOrder: Array.isArray(s.imageOrder) ? s.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
        }));
      }

      // Local fallback: derive series list from state.seriesMeta OR artworks
      const state = await loadLocalState();
      const published = (state.artworks || []).filter(a => a.status === "published");
      const seriesMeta = state.seriesMeta || {};

      // seriesMeta might be keyed by slug (from Studio)
      const fromMeta = Object.values(seriesMeta).map(m => ({
        slug: m.slug || slugifySeries(m.name || ""),
        name: m.name || m.slug,
        description: m.description || "",
        sortOrder: Number(m.sortOrder || 0),
        isPublic: m.isPublic !== false,
        coverArtworkId: m.coverArtworkId || "",
        coverThumb: m.coverThumb || "",
        imageOrder: Array.isArray(m.imageOrder) ? m.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
      })).filter(s => s.name);

      if (fromMeta.length) {
        // Add counts in fallback mode
        const counts = new Map();
        for (const a of published){
          if (!a.series) continue;
          counts.set(a.series, (counts.get(a.series) || 0) + 1);
        }
        return fromMeta
          .filter(s => s.isPublic)
          .map(s => ({ ...s, publishedCount: counts.get(s.name) || 0 }))
          .sort((a,b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
      }

      // Otherwise derive by unique series names
      const names = Array.from(new Set(published.map(a => a.series).filter(Boolean))).sort();
      return names.map((name, i) => ({
        slug: slugifySeries(name),
        name,
        description: "",
        sortOrder: i * 10,
        isPublic: true,
        coverArtworkId: "",
        coverThumb: "",
        imageOrder: [],
        publishedCount: published.filter(a => a.series === name).length
      }));
    }


    const sortPieces = (items) => sortBySortOrderAndDate(items);

    // ---- Lightbox ----
    const lightbox = createArtworkLightboxController();
    document.body.appendChild(lightbox.host);
    const openLightbox = (list, idx) => lightbox.open(list, idx);

    // ---- Render ----
    const seriesCountEl = document.getElementById("seriesCount");
    const seriesList = document.getElementById("seriesList");
    const detail = document.getElementById("detail");

    const [seriesRows, published] = await Promise.all([
      loadPublicSeries(),
      loadPublishedArtworks()
    ]);

    function sortSeriesPieces(items, series){
      const order = Array.isArray(series?.imageOrder) ? series.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : [];
      if (!order.length) return sortPieces(items);
      const rank = new Map(order.map((id, index) => [id, index]));
      return items.slice().sort((a, b) => {
        const ai = rank.has(String(a?.id || "")) ? rank.get(String(a?.id || "")) : Number.POSITIVE_INFINITY;
        const bi = rank.has(String(b?.id || "")) ? rank.get(String(b?.id || "")) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        return sortBySortOrderAndDate([a, b])[0] === a ? -1 : 1;
      });
    }

    function artworkMatchesSeries(artwork, series){
      const value = String(artwork?.series || "").trim();
      if (!value || !series) return false;
      const lower = value.toLowerCase();
      const normalized = slugifySeries(value).toLowerCase();
      const seriesName = String(series?.name || "").trim().toLowerCase();
      const seriesSlug = String(series?.slug || slugifySeries(series?.name || "")).trim().toLowerCase();
      return lower === seriesName || lower === seriesSlug || normalized === seriesSlug;
    }

    // Filter out empty series (no pieces)
    const seriesWithCounts = (seriesRows || [])
      .map(s => {
        const count = published.filter(a => artworkMatchesSeries(a, s)).length;
        return { ...s, publishedCount: count };
      });

    seriesCountEl.textContent = `${seriesWithCounts.length} series`;

    const bySlug = new Map(seriesWithCounts.map(s => [s.slug, s]));
    const byName = new Map(seriesWithCounts.map(s => [s.name, s]));

    function renderSeriesList(activeSlug){
      seriesList.innerHTML = "";

      // All button
      seriesList.appendChild(
        el("button", {
          class:"btn",
          type:"button",
          style: `
            justify-content:flex-start; border-radius:14px; text-align:left; padding:12px;
            ${!activeSlug ? "border-color: var(--accent-border); background: var(--accent-soft);" : ""}
          `
        },
          el("div", { style:"display:grid; gap:4px" },
            el("div", { style:"font-weight:650" }, "All series"),
            el("div", { class:"sub" }, "Overview + counts")
          )
        )
      ).addEventListener("click", () => {
        setQS("s", "");
        renderOverview();
      });

      if (!seriesWithCounts.length){
        seriesList.appendChild(el("div", { class:"sub" }, "No series yet."));
        return;
      }

      for (const s of seriesWithCounts){
        const isActive = s.slug === activeSlug;
        const btn = el("button", {
          class:"btn",
          type:"button",
          style: `
            justify-content:flex-start; text-align:left; padding:12px; border-radius:14px;
            ${isActive ? "border-color: var(--accent-border); background: var(--accent-soft);" : ""}
          `
        },
          el("div", { style:"display:flex; gap:12px; align-items:center" },
            s.coverThumb ? el("img", { src:s.coverThumb, style:"width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid var(--line)" }) : null,
            el("div", { style:"display:grid; gap:4px; min-width:0" },
              el("div", { style:"font-weight:650; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" }, s.name),
              el("div", { class:"sub" }, `${s.publishedCount} piece${s.publishedCount===1?"":"s"}`)
            )
          )
        );

        btn.addEventListener("click", () => {
          setQS("s", s.slug);
          openSeries(s.slug);
        });

        seriesList.appendChild(btn);
      }
    }

    function renderOverview(){
      detail.innerHTML = "";
      detail.appendChild(el("p", { class:"title", style:"margin:0" }, "Series overview"));
      detail.appendChild(el("p", { class:"sub", style:"margin-top:8px" }, "Pick a series to view its pieces."));

      const wrap = el("div", { style:"display:grid; gap:10px; margin-top:14px" });

      for (const s of seriesWithCounts){
        wrap.appendChild(
          el("div", { class:"card", style:"box-shadow:none" },
            el("div", { class:"meta" },
              el("div", { style:"display:flex; justify-content:space-between; gap:10px; align-items:baseline" },
                el("div", { style:"font-weight:650" }, s.name),
                el("div", { class:"sub" }, `${s.publishedCount} piece${s.publishedCount===1?"":"s"}`)
              ),
              s.description ? el("div", { class:"sub", style:"margin-top:8px; font-size:15px; line-height:1.65" }, s.description) : null,
              el("div", { style:"margin-top:12px" },
                el("a", { class:"btn", href:`series.html?s=${encodeURIComponent(s.slug)}` }, "Open series \u2192")
              )
            )
          )
        );
      }

      detail.appendChild(wrap);
      renderSeriesList(null);
    }

    function openSeries(slug){
      const s = bySlug.get(slug) || byName.get(slug); // allow name fallback
      if (!s) return renderOverview();

      const pieces = sortSeriesPieces(published.filter(a => artworkMatchesSeries(a, s)), s);

      detail.innerHTML = "";
      detail.appendChild(
        el("div", { style:"display:flex; gap:10px; align-items:baseline; justify-content:space-between; flex-wrap:wrap" },
          el("p", { class:"title", style:"margin:0" }, s.name),
          el("span", { class:"sub" }, `${pieces.length} piece${pieces.length===1?"":"s"}`)
        )
      );

      detail.appendChild(
        el("p", { class:"sub", style:"margin-top:10px; font-size:15px; line-height:1.65" },
          s.description || "\u2014"
        )
      );

      detail.appendChild(el("hr", { class:"sep" }));

      const grid = el("div", { class:"grid series-pieces-grid", style:"margin-top:8px" });
      detail.appendChild(grid);

      if (!pieces.length){
        grid.appendChild(el("div", { class:"sub" }, "No published pieces in this series."));
        renderSeriesList(s.slug);
        return;
      }

      pieces.forEach((a, idx) => {
        grid.appendChild(
          el("a", {
            class:"card",
            href:"#",
            style:"grid-column: span 4",
            onclick:(e)=>{ e.preventDefault(); openLightbox(pieces, idx); }
          },
            el("div", { class:"thumb", style:"aspect-ratio: 16/10" },
              el("img", { src:a.thumb || a.image, alt:a.alt || a.title || "Artwork", loading:"lazy" })
            ),
            el("div", { class:"meta" },
              el("p", { class:"title" }, a.title || "Untitled"),
              el("p", { class:"sub" }, [a.year || null, a.featured ? "Featured" : null].filter(Boolean).join(" \u2022 ") || " ")
            )
          )
        );
      });

      // responsive spans
      const mq1 = window.matchMedia("(max-width: 920px)");
      const mq2 = window.matchMedia("(max-width: 620px)");
      const apply = () => {
        const span = mq2.matches ? 12 : (mq1.matches ? 6 : 4);
        grid.querySelectorAll(".card").forEach(c => c.style.gridColumn = `span ${span}`);
      };
      apply();
      mq1.onchange = apply;
      mq2.onchange = apply;

      renderSeriesList(s.slug);
    }

    // initial route
    const initial = qs("s");
    if (initial){
      const s = bySlug.get(initial) || byName.get(initial);
      if (s) openSeries(s.slug);
      else renderOverview();
    } else {
      renderOverview();
    }



