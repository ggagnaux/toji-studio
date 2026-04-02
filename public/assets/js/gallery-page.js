import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { el, slugifySeries, sortGallery, createArtworkLightboxController } from "./content-utils.js";

	    renderPublicHeader({
	      active: "gallery",
	      small: "gallery",
	      ctaText: "Inquire",
	      ctaHref: "contact.html"
	    });
    renderPublicFooter({
      rightHtml: `<a href="index.html">Home</a> &bull; <a href="gallery.html">Gallery</a> &bull; <a href="series.html">Series</a> &bull; <a href="contact.html">Contact</a> &bull; <a href="admin/index.html">Studio</a>`
    });

    // ---- Gallery data source: Admin localStorage first, fallback to sample JSON ----
    const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
    const FALLBACK_URL = "assets/data/admin.sample.json";

    async function loadGalleryState() {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fall through to fetch
        }
      }
      const res = await fetch(FALLBACK_URL, { cache: "no-store" });
      return res.json();
    }

    // ---- Helpers ----


    function uniqTags(items) {
      const set = new Set();
      items.forEach(a => (a.tags || []).forEach(t => set.add(String(t).toLowerCase())));
      return ["all", ...Array.from(set).sort()];
    }


    // ---- State ----
    const featuredWrap = document.getElementById("featuredWrap");
    const featuredGrid = document.getElementById("featuredGrid");
    const featuredCount = document.getElementById("featuredCount");
    const seriesWrap = document.getElementById("seriesWrap");
    const seriesGrid = document.getElementById("seriesGrid");
    const seriesCount = document.getElementById("seriesCount");

    const grid = document.getElementById("galleryGrid");
    const tagPrefilterHost = document.getElementById("tagPrefilterChips");
    const chipHost = document.getElementById("tagChips");
    const tagFilterSummary = document.getElementById("tagFilterSummary");
    const qInput = document.getElementById("q");
    const qClear = document.getElementById("qClear");
    const allWorksWrap = document.getElementById("allWorksWrap");
    const allWorksFilters = allWorksWrap?.querySelector(".filters");
    const galleryTabsNav = document.getElementById("galleryTabsNav");
    const galleryTabButtons = Array.from(document.querySelectorAll("[data-tab-target]"));
    const backToTopBtn = document.getElementById("backToTopBtn");

    const allCount = document.getElementById("allCount");

    const state = await loadGalleryState();
    const allItems = sortGallery((state.artworks || []).filter(a => a.status === "published"));
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

    function artworkMatchesSeries(artwork, series){
      const value = String(artwork?.series || "").trim();
      if (!value || !series) return false;
      const lower = value.toLowerCase();
      const normalized = slugifySeries(value).toLowerCase();
      const seriesName = String(series?.name || "").trim().toLowerCase();
      const seriesSlug = String(series?.slug || slugifySeries(series?.name || "")).trim().toLowerCase();
      return lower === seriesName || lower === seriesSlug || normalized === seriesSlug;
    }

    function sortSeriesItems(items, meta){
      const order = Array.isArray(meta?.imageOrder) ? meta.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : [];
      if (!order.length) return sortGallery(items);
      const rank = new Map(order.map((id, index) => [id, index]));
      return items.slice().sort((a, b) => {
        const ai = rank.has(String(a?.id || "")) ? rank.get(String(a?.id || "")) : Number.POSITIVE_INFINITY;
        const bi = rank.has(String(b?.id || "")) ? rank.get(String(b?.id || "")) : Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
        return sortGallery([a, b])[0] === a ? -1 : 1;
      });
    }

    const selectedTags = new Set();
    let q = "";
    let activeTabId = "featuredWrap";

    function refreshSearchClear(){
      if (!qClear || !qInput) return;
      qClear.style.display = qInput.value.trim() ? "inline-flex" : "none";
    }

    const galleryHero = document.getElementById("galleryHeroSection");

    function syncStickyOffsets() {
      const header = document.getElementById("siteHeader");
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const heroHeight = galleryHero?.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--gallery-hero-top", `${headerHeight}px`);
      document.documentElement.style.setProperty("--gallery-tabs-top", `${headerHeight + heroHeight}px`);
    }
    syncStickyOffsets();
    window.addEventListener("resize", syncStickyOffsets);

    function getTabButton(targetId) {
      return galleryTabButtons.find((btn) => btn.getAttribute("data-tab-target") === targetId) || null;
    }

    function isSectionAvailable(node) {
      if (!node) return false;
      return node.dataset.tabAvailable !== "false";
    }

    function syncTabPanels() {
      galleryTabButtons.forEach((btn) => {
        const targetId = btn.getAttribute("data-tab-target");
        const panel = targetId ? document.getElementById(targetId) : null;
        const available = isSectionAvailable(panel);
        const active = available && targetId === activeTabId;
        btn.hidden = !available;
        btn.disabled = !available;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
        if (panel) panel.hidden = !active;
      });
    }

    function setActiveTab(targetId) {
      const resolved = resolveAvailablePanel(targetId);
      if (!resolved) return;
      activeTabId = resolved.id;
      syncTabPanels();
    }

    function ensureActiveTab() {
      const activePanel = document.getElementById(activeTabId);
      if (isSectionAvailable(activePanel)) {
        syncTabPanels();
        return;
      }
      const fallback = resolveAvailablePanel("featuredWrap");
      activeTabId = fallback?.id || "allWorksWrap";
      syncTabPanels();
    }

    function resolveAvailablePanel(targetId) {
      const requested = targetId ? document.getElementById(targetId) : null;
      if (isSectionAvailable(requested)) return requested;

      const orderedIds = ["featuredWrap", "seriesWrap", "allWorksWrap"];
      const startIndex = Math.max(0, orderedIds.indexOf(targetId));
      const ordered = [
        ...orderedIds.slice(startIndex + 1),
        ...orderedIds.slice(0, startIndex + 1)
      ];
      for (const id of ordered) {
        const node = document.getElementById(id);
        if (isSectionAvailable(node)) return node;
      }
      return requested;
    }

    function getJumpScrollTop() {
      const header = document.getElementById("siteHeader");
      const headerHeight = Math.ceil(header?.getBoundingClientRect().height || 0);
      const heroHeight = Math.ceil(galleryHero?.getBoundingClientRect().height || 0);
      const tabsHeight = Math.ceil(galleryTabsNav?.getBoundingClientRect().height || 0);
      const sectionGap = 10;
      return Math.max(
        0,
        window.scrollY + (galleryTabsNav?.getBoundingClientRect().top || 0) - (headerHeight + heroHeight + tabsHeight + sectionGap)
      );
    }

    function scrollToTabsStable() {
      const initialTop = getJumpScrollTop();
      window.scrollTo({ top: initialTop, behavior: "smooth" });

      // Mobile browsers can shift viewport chrome during smooth scroll; correct final alignment.
      window.setTimeout(() => {
        const correctedTop = getJumpScrollTop();
        if (Math.abs(correctedTop - window.scrollY) > 2) {
          window.scrollTo({ top: correctedTop, behavior: "auto" });
        }
      }, 420);
    }

    function scrollToTopStable() {
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Correct for mobile viewport chrome movement after smooth scrolling.
      window.setTimeout(() => {
        if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: "auto" });
      }, 420);
    }

    galleryTabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-tab-target");
        setActiveTab(targetId);
      });
    });

    function syncBackToTopVisibility() {
      const show = window.scrollY > 8;
      backToTopBtn?.classList.toggle("is-visible", show);
    }
    function syncGalleryHeroState() {
      const compact = window.scrollY > 8;
      galleryHero?.classList.toggle("is-scrolled", compact);
      syncStickyOffsets();
    }
    backToTopBtn?.addEventListener("click", () => {
      scrollToTopStable();
    });
    window.addEventListener("scroll", syncBackToTopVisibility, { passive: true });
    window.addEventListener("scroll", syncGalleryHeroState, { passive: true });
    syncBackToTopVisibility();
    syncGalleryHeroState();

    function rerenderAllWorksPreserveScroll() {
      const activeEl = document.activeElement;
      const anchor =
        (activeEl instanceof HTMLElement && allWorksWrap?.contains(activeEl) ? activeEl : null) ||
        allWorksFilters ||
        allWorksWrap;
      const prevTop = anchor ? anchor.getBoundingClientRect().top : null;
      renderAll();
      if (prevTop == null || !anchor?.isConnected) return;
      const nextTop = anchor.getBoundingClientRect().top;
      const delta = nextTop - prevTop;
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    }

    // ---- Render chips ----
    const tags = uniqTags(allItems);
    const NUMERIC_PREFILTER = "0-9";
    const alphaLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    const prefilterTokens = [...alphaLetters, NUMERIC_PREFILTER];
    const selectedLetters = new Set();

    function getTagPrefilterKey(tag) {
      const first = String(tag || "").trim().charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(first)) return first;
      if (/^[0-9]$/.test(first)) return NUMERIC_PREFILTER;
      return null;
    }

    function getVisibleTagsByLetter() {
      const allRealTags = tags.filter((t) => t !== "all");
      return allRealTags.filter((t) => {
        const key = getTagPrefilterKey(t);
        const matchesLetter = !selectedLetters.size || (key ? selectedLetters.has(key) : false);
        const matchesSearch = !q || String(t).toLowerCase().includes(q);
        return matchesLetter && matchesSearch;
      });
    }

    function renderTagPrefilters() {
      if (!tagPrefilterHost) return;
      tagPrefilterHost.innerHTML = "";
      const usedLetters = new Set(
        tags
          .filter((t) => t !== "all")
          .map((t) => getTagPrefilterKey(t))
          .filter(Boolean)
      );

      for (const letter of prefilterTokens) {
        const active = selectedLetters.has(letter);
        const enabled = usedLetters.has(letter);
        const btn = el(
          "button",
          {
            type: "button",
            class: `chip${active ? " active" : ""}`,
            "aria-pressed": active ? "true" : "false",
            disabled: enabled ? null : "",
            style: `padding:6px 9px; min-width:32px; justify-content:center; ${enabled ? "" : "opacity:.45; cursor:not-allowed;"}`
          },
          letter
        );
        btn.addEventListener("click", () => {
          if (!enabled) return;
          if (selectedLetters.has(letter)) selectedLetters.delete(letter);
          else selectedLetters.add(letter);
          renderTagPrefilters();
          renderChips();
          renderAll();
        });
        tagPrefilterHost.appendChild(btn);
      }
    }

    function isChipActive(tag) {
      if (tag === "all") return selectedTags.size === 0;
      return selectedTags.has(tag);
    }

    function toggleTagFilter(tag) {
      if (tag === "all") {
        selectedTags.clear();
        return;
      }
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
    }

    function renderChips() {
      chipHost.innerHTML = "";
      const visibleTags = getVisibleTagsByLetter();
      const visibleTagSet = new Set(visibleTags);
      for (const tag of Array.from(selectedTags)) {
        if (!visibleTagSet.has(tag)) selectedTags.delete(tag);
      }

      ["all", ...visibleTags].forEach(t => {
        const chip = el("div", { class: "chip" + (isChipActive(t) ? " active" : ""), role: "button", tabindex: "0" }, t);
        chip.addEventListener("click", () => {
          toggleTagFilter(t);
          renderChips();
          renderAll();
        });
        chip.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTagFilter(t);
            renderChips();
            renderAll();
          }
        });
        chipHost.appendChild(chip);
        if (t === "all" && visibleTags.length > 0) {
          chipHost.appendChild(el("span", { class: "tag-chip-separator", "aria-hidden": "true" }));
        }
      });
      renderTagFilterSummary();
    }

    function renderTagFilterSummary() {
      if (!tagFilterSummary) return;

      const selectedLetterList = prefilterTokens.filter((token) => selectedLetters.has(token));
      const selectedTagList = Array.from(selectedTags);
      const hasSearchFilter = !!q;
      tagFilterSummary.innerHTML = "";

      if (!selectedLetterList.length && !selectedTagList.length && !hasSearchFilter) {
        tagFilterSummary.textContent = "No filtering";
        return;
      }

      if (hasSearchFilter) {
        tagFilterSummary.appendChild(
          el("div", { class: "tag-filter-summary-line" },
            el("span", {}, `Showing tags matching search: "${q}"`)
          )
        );
      }
      if (selectedLetterList.length) {
        tagFilterSummary.appendChild(
          el("div", { class: "tag-filter-summary-line" },
            el("span", {}, "Showing tags starting with the following: "),
            el("span", { class: "tag-filter-summary-pills" },
              ...selectedLetterList.flatMap((token, idx) => (
                idx === 0
                  ? [el("span", { class: "chip tag-filter-summary-pill" }, token)]
                  : [el("span", { class: "tag-filter-summary-joiner" }, "or"), el("span", { class: "chip tag-filter-summary-pill" }, token)]
              ))
            )
          )
        );
      }
      if (selectedTagList.length) {
        tagFilterSummary.appendChild(
          el("div", { class: "tag-filter-summary-line" },
            el("span", {}, "Showing images containing the following tags: "),
            el("span", { class: "tag-filter-summary-pills" },
              ...selectedTagList.flatMap((tag, idx) => (
                idx === 0
                  ? [el("span", { class: "chip tag-filter-summary-pill" }, tag)]
                  : [el("span", { class: "tag-filter-summary-joiner" }, "and"), el("span", { class: "chip tag-filter-summary-pill" }, tag)]
              ))
            )
          )
        );
      }
      if (selectedLetterList.length || selectedTagList.length || hasSearchFilter) {
        tagFilterSummary.appendChild(
          el("div", { class: "tag-filter-summary-actions" },
            el("button", { id: "tagFiltersClearBtn", class: "btn", type: "button" }, "Clear filters")
          )
        );
        tagFilterSummary.querySelector("#tagFiltersClearBtn")?.addEventListener("click", () => {
          clearTagFilters();
        });
      }
    }

    function clearTagFilters() {
      selectedLetters.clear();
      selectedTags.clear();
      q = "";
      if (qInput) qInput.value = "";
      renderTagPrefilters();
      renderChips();
      rerenderAllWorksPreserveScroll();
      refreshSearchClear();
    }

    // ---- Filtering ----
    function matchesAllWorks(a) {
      const artworkTags = new Set((a.tags || []).map(x => String(x).toLowerCase()));
      const tagOk = selectedTags.size === 0 || Array.from(selectedTags).every(tag => artworkTags.has(tag));
      const text = `${a.title || ""} ${(a.tags || []).join(" ")} ${a.series || ""} ${a.year || ""}`.toLowerCase();
      const qOk = !q || text.includes(q);
      return tagOk && qOk;
    }

    // ---- Lightbox ----
    const lightbox = createArtworkLightboxController();
    document.body.appendChild(lightbox.host);
    const openLightbox = (list, idx) => lightbox.open(list, idx);

    // ---- Card renderer ----
    function renderCards(host, items) {
      host.innerHTML = "";

      if (!items.length) {
        host.appendChild(
          el("div", { class: "card", style: "grid-column: 1 / -1; max-width:none; width:100%" },
            el("div", { class: "meta" },
              el("p", { class: "title" }, "No matches"),
              el("p", { class: "sub" }, "Try a different tag or search term.")
            )
          )
        );
        return;
      }

      items.forEach((a, idx) => {
        const metaBits = [
          a.series ? a.series : null,
          a.year ? a.year : null,
          a.featured ? "Featured" : null
        ].filter(Boolean).join(" \u2022 ") || " ";
        const isAllWorks = host === grid;

        const card = el("a", {
          class: "card",
          href: `artwork.html?id=${encodeURIComponent(a.id)}`,
          style: "",
          onclick:(e)=>{ e.preventDefault(); openLightbox(items, idx); }
        },
          isAllWorks
            ? el("div", { class: "thumb" },
                el("img", { src: a.thumb || a.image, alt: a.alt || a.title || "Artwork", loading: "lazy" }),
                el("div", { class: "gallery-overlay" },
                  el("p", { class: "title" }, a.title || "Untitled"),
                  el("p", { class: "sub" }, metaBits)
                )
              )
            : [
                el("div", { class: "thumb" }, el("img", { src: a.thumb || a.image, alt: a.alt || a.title || "Artwork", loading: "lazy" })),
                el("div", { class: "meta" },
                  el("p", { class: "title" }, a.title || "Untitled"),
                  el("p", { class: "sub" }, metaBits)
                )
              ]
        );

        host.appendChild(card);
      });

    }

    // ---- Featured section ----
    function renderFeatured() {
      const featured = sortGallery(allItems.filter(a => a.featured));

      if (!featured.length) {
        featuredWrap.dataset.tabAvailable = "false";
        return;
      }

      featuredWrap.dataset.tabAvailable = "true";
      featuredCount.textContent = `${featured.length} piece${featured.length === 1 ? "" : "s"}`;
      renderCards(featuredGrid, featured);
    }

    // ---- Series section ----
    function renderSeries() {
      const filtered = sortGallery(allItems).filter(a => a.series);
      const bySeries = new Map();

      for (const a of filtered) {
        const key = String(a.series || "").trim();
        if (!key) continue;
        if (!bySeries.has(key)) bySeries.set(key, []);
        bySeries.get(key).push(a);
      }

      const entries = Array.from(bySeries.entries())
        .map(([name, items]) => {
          const slug = slugifySeries(name);
          const meta = seriesMetaByName.get(name.toLowerCase()) || seriesMetaBySlug.get(slug) || null;
          const seriesMeta = meta ? { ...meta, slug: meta.slug || slug, name: meta.name || name } : { slug, name, imageOrder: [] };
          const orderedItems = sortSeriesItems(items.filter((item) => artworkMatchesSeries(item, seriesMeta)), seriesMeta);
          const cover = (meta && meta.coverThumb) || orderedItems[0]?.thumb || orderedItems[0]?.image || items[0]?.thumb || items[0]?.image || "assets/img/placeholders/p1.jpg";
          const description = (meta && meta.description) || "";
          const sortOrderRaw = Number(meta?.sortOrder);
          const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : Number.MAX_SAFE_INTEGER;
          const isPublic = meta?.isPublic == null ? true : !!meta.isPublic;
          return { name, slug, cover, description, items: orderedItems.length ? orderedItems : sortGallery(items), sortOrder, isPublic, imageOrder: seriesMeta.imageOrder || [] };
        })
        .filter((s) => s.isPublic)
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.name.localeCompare(b.name);
        });

      seriesGrid.innerHTML = "";
      if (!entries.length) {
        seriesWrap.dataset.tabAvailable = "false";
        return;
      }

      seriesWrap.dataset.tabAvailable = "true";
      seriesCount.textContent = `${entries.length} series`;

      for (const s of entries) {
        const seriesItems = s.items.slice();
        const previewItems = seriesItems.slice(0, 8);
        seriesGrid.appendChild(
          el("article", { class: "series-item" },
            el("a", {
              class: "card series-card",
              href: "#",
              onclick: (e) => {
                e.preventDefault();
                openLightbox(seriesItems, 0);
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
                el("p", { class: "sub" }, `${s.items.length} piece${s.items.length === 1 ? "" : "s"}`)
              )
            )
          )
        );
      }
    }

    // ---- All works section ----
    function renderAll() {
      const items = sortGallery(allItems.filter(matchesAllWorks));
      allWorksWrap.dataset.tabAvailable = "true";
      allCount.textContent = `${items.length} piece${items.length === 1 ? "" : "s"}`;

      grid.innerHTML = "";
      if (!items.length) {
        grid.appendChild(
          el("div", { class: "card", style: "grid-column: 1 / -1; max-width:none; width:100%" },
            el("div", { class: "meta" },
              el("p", { class: "title" }, "No matches"),
              el("p", { class: "sub" }, "Try a different tag or search term.")
            )
          )
        );
        return;
      }

      renderCards(grid, items);
    }

    qInput.addEventListener("input", (e) => {
      q = e.target.value.trim().toLowerCase();
      renderTagPrefilters();
      renderChips();
      rerenderAllWorksPreserveScroll();
      syncStickyOffsets();
      refreshSearchClear();
    });

    qClear?.addEventListener("click", () => {
      qInput.value = "";
      q = "";
      renderTagPrefilters();
      renderChips();
      rerenderAllWorksPreserveScroll();
      syncStickyOffsets();
      refreshSearchClear();
      qInput.focus();
    });
    renderTagPrefilters();
    renderChips();
    renderFeatured();
    renderSeries();
    renderAll();
    ensureActiveTab();
    syncStickyOffsets();
    refreshSearchClear();


