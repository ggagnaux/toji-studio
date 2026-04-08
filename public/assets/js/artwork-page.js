import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { initStickyHero } from "./site.js";
    import { qs, el, slugifySeries, sortBySortOrderAndDate, deriveArtworkCategory } from "./content-utils.js";

    // Header/footers
	    renderPublicHeader({
	      active: "gallery",
	      small: "artwork",
	      ctaText: "Explore",
	      ctaHref: "gallery.html",
	      showThemeControls: false
	    });
    renderPublicFooter({
      rightHtml: `<a href="index.html">Home</a> &bull; <a href="gallery.html">Gallery</a> &bull; <a href="series.html">Series</a> &bull; <a href="about.html">About</a> &bull; <a href="contact.html">Contact</a> &bull; <a href="admin/index.html">Studio</a>`
    });

    initStickyHero();

    // Data
    const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
    const FALLBACK_URL = "assets/data/admin.sample.json";

    async function loadStateLike(){
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) { try { return JSON.parse(saved); } catch {} }
      const res = await fetch(FALLBACK_URL, { cache:"no-store" });
      return res.json();
    }

    function publishedOnly(state){
      return (state.artworks || []).filter(a => a.status === "published");
    }

    const sortRecent = (items) => sortBySortOrderAndDate(items);

    // DOM
    const h1 = document.getElementById("t");
    const sub = document.getElementById("sub");
    const artworkKicker = document.getElementById("artworkKicker");
    const img = document.getElementById("img");
    const titleEl = document.getElementById("title");
    const metaLine = document.getElementById("metaLine");
    const desc = document.getElementById("desc");
    const tagsWrap = document.getElementById("tagsWrap");
    const inquireBtn = document.getElementById("inquireBtn");
    const copyLinkBtn = document.getElementById("copyLink");
    const seriesContext = document.getElementById("seriesContext");
    const seriesLinks = document.getElementById("seriesLinks");
    const toolbarSeriesLinks = document.getElementById("toolbarSeriesLinks");
    const moreGrid = document.getElementById("moreGrid");
    const moreLink = document.getElementById("moreLink");
    const moreIntro = document.getElementById("moreIntro");

    function normalizeSeriesSlugs(value){
      if (Array.isArray(value)) {
        return value.map((entry) => String(entry || "").trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
          }
        } catch {}
      }
      return [];
    }

    function getSeriesMetaRows(stateLike){
      if (stateLike && stateLike.seriesMeta && typeof stateLike.seriesMeta === "object") {
        return Object.values(stateLike.seriesMeta);
      }
      if (Array.isArray(stateLike?.series)) return stateLike.series;
      return [];
    }

    function resolveArtworkSeries(artwork, stateLike){
      const rows = getSeriesMetaRows(stateLike);
      const bySlug = new Map();
      rows.forEach((row) => {
        const slug = String(row?.slug || slugifySeries(row?.name || row?.title || "")).trim();
        const name = String(row?.name || row?.title || row?.slug || "").trim();
        if (slug && name && !bySlug.has(slug)) bySlug.set(slug, { slug, name });
      });

      const out = [];
      const seen = new Set();
      normalizeSeriesSlugs(artwork?.seriesSlugs).forEach((slug) => {
        if (seen.has(slug)) return;
        const match = bySlug.get(slug);
        out.push(match || { slug, name: slug });
        seen.add(slug);
      });

      const legacyName = String(artwork?.series || "").trim();
      const legacySlug = legacyName ? slugifySeries(legacyName) : "";
      if (legacySlug && !seen.has(legacySlug)) {
        out.unshift(bySlug.get(legacySlug) || { slug: legacySlug, name: legacyName });
      }

      return out.filter((row) => row.slug && row.name);
    }

    function renderSeriesLinkSet(host, items, className){
      if (!host) return;
      host.innerHTML = "";
      items.forEach((item) => {
        host.appendChild(
          el("a", {
            class: className,
            href: `series.html?s=${encodeURIComponent(item.slug)}`
          }, item.name)
        );
      });
    }

    function getArtworkSeriesWithCache(artwork, stateLike){
      if (!artwork) return [];
      if (!Array.isArray(artwork._resolvedSeries)) {
        artwork._resolvedSeries = resolveArtworkSeries(artwork, stateLike);
      }
      return artwork._resolvedSeries;
    }

    function getSharedSeriesRanking(targetArtwork, candidates, stateLike){
      const targetSeries = getArtworkSeriesWithCache(targetArtwork, stateLike);
      const targetSlugs = new Set(targetSeries.map((item) => item.slug));
      const baseline = sortRecent(candidates);

      const ranked = baseline.map((item, index) => {
        const candidateSeries = getArtworkSeriesWithCache(item, stateLike);
        const sharedSeries = candidateSeries.filter((entry) => targetSlugs.has(entry.slug));
        return {
          item,
          index,
          overlapCount: sharedSeries.length,
          sharedSeries
        };
      });

      ranked.sort((left, right) => {
        if (left.overlapCount !== right.overlapCount) return right.overlapCount - left.overlapCount;
        return left.index - right.index;
      });

      return ranked;
    }

    // Load + render
    const id = qs("id");
    if (!id){
      h1.textContent = "Missing artwork id";
      sub.textContent = "Open a piece from the Gallery, or add ?id=... to the URL.";
      img.alt = "Missing";
      img.src = "assets/img/placeholders/p1.jpg";
      titleEl.textContent = "Not found";
      metaLine.textContent = "";
      desc.textContent = "";
      moreGrid.innerHTML = "";
      throw new Error("Missing id");
    }

    const state = await loadStateLike();
    const items = publishedOnly(state);
    const art = items.find(a => String(a.id) === String(id));

    if (!art){
      h1.textContent = "Not found";
      sub.textContent = "This piece may be unpublished, deleted, or the link is wrong.";
      img.alt = "Not found";
      img.src = "assets/img/placeholders/p1.jpg";
      titleEl.textContent = "Artwork not found";
      metaLine.textContent = "";
      desc.textContent = "";
      moreGrid.innerHTML = "";
      throw new Error("Not found");
    }

    // Title/meta
    document.title = `${art.title || "Artwork"} \u2014 Toji Studios`;
    h1.textContent = art.title || "Artwork";
    const category = deriveArtworkCategory(art);
    const artworkSeries = resolveArtworkSeries(art, state);
    const seriesNames = artworkSeries.map((item) => item.name);
    if (artworkKicker) artworkKicker.textContent = category || "Artwork view";
    sub.textContent = [category, seriesNames.length ? seriesNames.join(", ") : null, art.year || null].filter(Boolean).join(" \u2022 ") || "Published work";

    titleEl.textContent = art.title || "Untitled";
    metaLine.textContent = [
      `Category: ${category}`,
      seriesNames.length ? `Series: ${seriesNames.join(", ")}` : null,
      art.year ? `Year: ${art.year}` : null,
      art.featured ? "Featured" : null
    ].filter(Boolean).join(" \u2022 ") || "";

    if (seriesContext && artworkSeries.length) {
      seriesContext.hidden = false;
      renderSeriesLinkSet(seriesLinks, artworkSeries, "btn");
      if (toolbarSeriesLinks) {
        toolbarSeriesLinks.hidden = false;
        renderSeriesLinkSet(toolbarSeriesLinks, artworkSeries, "page-toolbar__pill");
      }
    } else if (seriesContext) {
      seriesContext.hidden = true;
      if (toolbarSeriesLinks) {
        toolbarSeriesLinks.hidden = true;
        toolbarSeriesLinks.innerHTML = "";
      }
    }

    // Image
    img.src = art.image || art.thumb || "assets/img/placeholders/p1.jpg";
    img.alt = art.alt || art.title || "Artwork";
    img.loading = "eager";

    // Description
    desc.textContent = art.description || "\u2014";

    // Tags
    const tags = (art.tags || []).map(t => String(t).toLowerCase()).filter(Boolean);
    tagsWrap.innerHTML = "";
    if (tags.length){
      tagsWrap.appendChild(el("div", { class:"sub" }, "Tags"));
      const row = el("div", { style:"display:flex; gap:10px; flex-wrap:wrap; margin-top:10px" });
      tags.forEach(t => {
        row.appendChild(el("a", { class:"chip", href:`gallery.html?tag=${encodeURIComponent(t)}` }, t));
      });
      tagsWrap.appendChild(row);
    }

    // Inquire link (pre-fill info via query params)
    inquireBtn.href =
      `contact.html?topic=${encodeURIComponent("Licensing / inquiry")}` +
      `&title=${encodeURIComponent(art.title || "")}` +
      `&id=${encodeURIComponent(art.id)}` +
      `&url=${encodeURIComponent(location.href)}`;

    // Copy link
    copyLinkBtn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(location.href);
        copyLinkBtn.textContent = "Copied!";
        setTimeout(() => copyLinkBtn.textContent = "Copy link", 900);
      }catch{
        copyLinkBtn.textContent = "Copy failed";
        setTimeout(() => copyLinkBtn.textContent = "Copy link", 900);
      }
    });

    // More like this: prioritize any shared series memberships, then fall back to recent work.
    const rankedRelated = getSharedSeriesRanking(
      art,
      items.filter((item) => item.id !== art.id),
      state
    );
    const overlappingRelated = rankedRelated.filter((entry) => entry.overlapCount > 0);
    const more = rankedRelated.slice(0, 6).map((entry) => entry.item);

    if (moreIntro) {
      if (overlappingRelated.length) {
        const sharedNames = Array.from(
          new Set(overlappingRelated.flatMap((entry) => entry.sharedSeries.map((series) => series.name)))
        );
        moreIntro.textContent = `Prioritizing work that shares ${sharedNames.join(", ")}, then filling with recent work.`;
      } else if (artworkSeries.length) {
        moreIntro.textContent = "No other published work shares these series yet, so this section falls back to recent work.";
      } else {
        moreIntro.textContent = "Recent published work from the gallery.";
      }
    }

    moreLink.href = artworkSeries.length
      ? `series.html?s=${encodeURIComponent(artworkSeries[0].slug)}`
      : "gallery.html";

    renderMore(more);

    function renderMore(list){
      moreGrid.innerHTML = "";
      if (!list.length){
        moreGrid.appendChild(
          el("div", { class:"sub" }, "No additional work to show yet.")
        );
        return;
      }

      list.forEach(a => {
        const relatedSeries = getArtworkSeriesWithCache(a, state);
        const relatedSeriesLabel = relatedSeries.map((item) => item.name).join(", ");
        moreGrid.appendChild(
          el("a", {
            class:"card",
            href:`artwork.html?id=${encodeURIComponent(a.id)}`,
            style:"grid-column: span 4; box-shadow:none"
          },
            el("div", { class:"thumb" },
              el("img", { src:a.thumb || a.image, alt:a.alt || a.title || "Artwork", loading:"lazy" })
            ),
            el("div", { class:"meta" },
              el("p", { class:"title" }, a.title || "Untitled"),
              el("p", { class:"sub" }, [relatedSeriesLabel || null, a.year || null].filter(Boolean).join(" \u2022 ") || " ")
            )
          )
        );
      });

      const mq1 = window.matchMedia("(max-width: 920px)");
      const mq2 = window.matchMedia("(max-width: 620px)");
      const apply = () => {
        const span = mq2.matches ? 12 : (mq1.matches ? 6 : 4);
        moreGrid.querySelectorAll(".card").forEach(c => c.style.gridColumn = `span ${span}`);
      };
      apply();
      mq1.onchange = apply;
      mq2.onchange = apply;
    }





