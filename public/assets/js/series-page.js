import { renderPublicHeader } from "./header.js";
import { renderPublicFooter } from "./footer.js";
import { initStickyHero } from "./site.js";
import { qs, el, slugifySeries, sortBySortOrderAndDate, createArtworkLightboxController, deriveArtworkCategory } from "./content-utils.js";

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

const ADMIN_STORAGE_KEY = "toji_admin_state_v1";
const FALLBACK_URL = "assets/data/admin.sample.json";
const API_BASE = (localStorage.getItem("toji_api_base") || window.location.origin || "").replace(/\/+$/, "");

function setQS(name, value) {
  const u = new URL(location.href);
  if (!value) u.searchParams.delete(name);
  else u.searchParams.set(name, value);
  history.replaceState(null, "", u.toString());
}

function normalizeMediaUrl(p) {
  if (!p) return p;
  if (p.startsWith("http")) return p;
  if (p.startsWith("/")) return `${API_BASE}${p}`;
  return p;
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

async function loadLocalState() {
  const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const res = await fetch(FALLBACK_URL, { cache: "no-store" });
  return res.json();
}

async function loadPublishedArtworks() {
  const rows = await tryFetchJson(`${API_BASE}/api/public/artworks`);
  if (rows) {
    return (rows || []).map((a) => ({
      ...a,
      thumb: normalizeMediaUrl(a.thumb),
      image: normalizeMediaUrl(a.image)
    }));
  }
  const state = await loadLocalState();
  return (state.artworks || []).filter((a) => a.status === "published");
}

async function loadPublicSeries() {
  const rows = await tryFetchJson(`${API_BASE}/api/public/series`);
  if (rows) {
    return (rows || []).map((s) => ({
      ...s,
      coverThumb: normalizeMediaUrl(s.coverThumb),
      imageOrder: Array.isArray(s.imageOrder) ? s.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
    }));
  }

  const state = await loadLocalState();
  const published = (state.artworks || []).filter((a) => a.status === "published");
  const seriesMeta = state.seriesMeta || {};

  const fromMeta = [];
  const seenSeries = new Set();
  Object.values(seriesMeta).forEach((m) => {
    const slug = String(m?.slug || slugifySeries(m?.name || "")).trim();
    const name = String(m?.name || m?.slug || "").trim();
    if (!name) return;
    const key = `${slug.toLowerCase()}::${name.toLowerCase()}`;
    if (seenSeries.has(key)) return;
    seenSeries.add(key);
    fromMeta.push({
      slug,
      name,
      description: m.description || "",
      sortOrder: Number(m.sortOrder || 0),
      isPublic: m.isPublic !== false,
      coverArtworkId: m.coverArtworkId || "",
      coverThumb: m.coverThumb || "",
      imageOrder: Array.isArray(m.imageOrder) ? m.imageOrder.map((id) => String(id || "").trim()).filter(Boolean) : []
    });
  });

  if (fromMeta.length) {
    const counts = new Map();
    for (const a of published) {
      if (!a.series) continue;
      counts.set(a.series, (counts.get(a.series) || 0) + 1);
    }
    return fromMeta
      .filter((s) => s.isPublic)
      .map((s) => ({ ...s, publishedCount: counts.get(s.name) || 0 }))
      .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
  }

  const names = Array.from(new Set(published.map((a) => a.series).filter(Boolean))).sort();
  return names.map((name, i) => ({
    slug: slugifySeries(name),
    name,
    description: "",
    sortOrder: i * 10,
    isPublic: true,
    coverArtworkId: "",
    coverThumb: "",
    imageOrder: [],
    publishedCount: published.filter((a) => a.series === name).length
  }));
}

const sortPieces = (items) => sortBySortOrderAndDate(items);
const lightbox = createArtworkLightboxController();
document.body.appendChild(lightbox.host);
const openLightbox = (list, idx) => lightbox.open(list, idx);

const seriesCountEl = document.getElementById("seriesCount");
const seriesList = document.getElementById("seriesList");
const detail = document.getElementById("detail");

const [seriesRows, published] = await Promise.all([
  loadPublicSeries(),
  loadPublishedArtworks()
]);

function sortSeriesPieces(items, series) {
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

function artworkMatchesSeries(artwork, series) {
  const value = String(artwork?.series || "").trim();
  if (!value || !series) return false;
  const lower = value.toLowerCase();
  const normalized = slugifySeries(value).toLowerCase();
  const seriesName = String(series?.name || "").trim().toLowerCase();
  const seriesSlug = String(series?.slug || slugifySeries(series?.name || "")).trim().toLowerCase();
  return lower === seriesName || lower === seriesSlug || normalized === seriesSlug;
}

const seriesWithCounts = [];
const seenSeriesKeys = new Set();
(seriesRows || []).forEach((s) => {
  const count = published.filter((a) => artworkMatchesSeries(a, s)).length;
  const row = { ...s, publishedCount: count };
  const key = `${String(row.slug || "").trim().toLowerCase()}::${String(row.name || "").trim().toLowerCase()}`;
  if (seenSeriesKeys.has(key)) return;
  seenSeriesKeys.add(key);
  seriesWithCounts.push(row);
});

seriesCountEl.textContent = `${seriesWithCounts.length} series`;

const bySlug = new Map(seriesWithCounts.map((s) => [s.slug, s]));
const byName = new Map(seriesWithCounts.map((s) => [s.name, s]));

function getSeriesCover(series, pieces) {
  return series?.coverThumb || pieces[0]?.thumb || pieces[0]?.image || "";
}

function getSeriesSummary(series, pieces) {
  const description = String(series?.description || "").trim();
  if (description) return description;
  return `${series.name} is a curated set of ${pieces.length} published piece${pieces.length === 1 ? "" : "s"} presented as a single body of work.`;
}

function getSeriesListNote(series, pieces) {
  const description = String(series?.description || "").trim();
  if (description) return description;
  return `${pieces.length} published piece${pieces.length === 1 ? "" : "s"} arranged as one collection.`;
}

function getSeriesCategory(pieces) {
  const counts = new Map();
  pieces.forEach((piece) => {
    const category = deriveArtworkCategory(piece);
    counts.set(category, (counts.get(category) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Digital Art";
}

function getAnchorPieces(series, pieces) {
  const featured = pieces.filter((piece) => !!piece.featured);
  const source = featured.length ? featured : pieces;
  return source.slice(0, Math.min(3, source.length));
}

function getRelatedSeries(series) {
  const index = seriesWithCounts.findIndex((row) => row.slug === series.slug);
  if (index < 0) return [];
  const ordered = [];
  for (let offset = 1; offset < seriesWithCounts.length; offset += 1) {
    const next = seriesWithCounts[(index + offset) % seriesWithCounts.length];
    if (!next || next.slug === series.slug) continue;
    ordered.push(next);
    if (ordered.length === 3) break;
  }
  return ordered;
}

function renderSeriesList(activeSlug) {
  seriesList.innerHTML = "";

  const allButton = el("button", {
    class: `btn series-list-item${!activeSlug ? " is-active" : ""}`,
    type: "button"
  },
    el("div", { class: "series-list-item__body" },
      el("div", { class: "series-list-item__title" }, "All series"),
      el("div", { class: "sub" }, "Overview + highlights")
    )
  );
  allButton.addEventListener("click", () => {
    setQS("s", "");
    renderOverview();
  });
  seriesList.appendChild(allButton);

  if (!seriesWithCounts.length) {
    seriesList.appendChild(el("div", { class: "sub" }, "No series yet."));
    return;
  }

  for (const s of seriesWithCounts) {
    const isActive = s.slug === activeSlug;
    const pieces = sortSeriesPieces(published.filter((a) => artworkMatchesSeries(a, s)), s);
    const cover = getSeriesCover(s, pieces);
    const btn = el("button", {
      class: `btn series-list-item${isActive ? " is-active" : ""}`,
      type: "button"
    },
      el("div", { class: "series-list-item__inner" },
        cover ? el("img", { class: "series-list-item__cover", src: cover, alt: "" }) : null,
        el("div", { class: "series-list-item__body" },
          el("div", { class: "series-list-item__title" }, s.name),
          el("div", { class: "sub" }, `${s.publishedCount} piece${s.publishedCount === 1 ? "" : "s"}`),
          el("div", { class: "series-list-item__note" }, getSeriesListNote(s, pieces))
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

function createArtworkCard(list, artwork, index, extraMeta = []) {
  return el("a", {
    class: "card",
    href: "#",
    onclick: (event) => {
      event.preventDefault();
      openLightbox(list, index);
    }
  },
    el("div", { class: "thumb" },
      el("img", { src: artwork.thumb || artwork.image, alt: artwork.alt || artwork.title || "Artwork", loading: "lazy" })
    ),
    el("div", { class: "meta" },
      el("p", { class: "title" }, artwork.title || "Untitled"),
      el("p", { class: "sub" }, extraMeta.filter(Boolean).join(" | ") || " ")
    )
  );
}

function renderOverview() {
  detail.innerHTML = "";
  detail.appendChild(el("p", { class: "series-panel-kicker" }, "Curated overview"));
  detail.appendChild(el("p", { class: "title", style: "margin:0" }, "Series overview"));
  detail.appendChild(el("p", { class: "sub", style: "margin-top:8px" }, "Browse each series as its own landing page, with cover imagery, context, anchor works, and a full ordered run."));

  const wrap = el("div", { class: "series-overview-grid" });

  for (const s of seriesWithCounts) {
    const pieces = sortSeriesPieces(published.filter((a) => artworkMatchesSeries(a, s)), s);
    const cover = getSeriesCover(s, pieces);
    wrap.appendChild(
      el("div", { class: "card series-overview-card" },
        el("div", { class: "meta" },
          el("div", { class: "series-overview-card__top" },
            cover ? el("img", { class: "series-overview-card__cover", src: cover, alt: "" }) : el("div", { class: "series-overview-card__cover", "aria-hidden": "true" }),
            el("div", { class: "series-overview-card__body" },
              el("p", { class: "title" }, s.name),
              el("p", { class: "sub" }, getSeriesSummary(s, pieces)),
              el("div", { class: "series-detail-hero__meta" },
                el("span", { class: "series-meta-pill" }, `${s.publishedCount} piece${s.publishedCount === 1 ? "" : "s"}`),
                pieces.some((piece) => piece.featured) ? el("span", { class: "series-meta-pill" }, "Includes featured work") : null
              ),
              el("div", { class: "series-overview-card__actions" },
                el("a", { class: "btn", href: `series.html?s=${encodeURIComponent(s.slug)}` }, "Open series")
              )
            )
          )
        )
      )
    );
  }

  detail.appendChild(wrap);
  renderSeriesList(null);
}

function openSeries(slug) {
  const s = bySlug.get(slug) || byName.get(slug);
  if (!s) return renderOverview();

  const pieces = sortSeriesPieces(published.filter((a) => artworkMatchesSeries(a, s)), s);
  const cover = getSeriesCover(s, pieces);
  const seriesCategory = getSeriesCategory(pieces);
  const anchors = getAnchorPieces(s, pieces);
  const related = getRelatedSeries(s);

  detail.innerHTML = "";
  const layout = el("div", { class: "series-detail-layout" });

  layout.appendChild(
    el("section", { class: "series-detail-hero" },
      cover ? el("div", { class: "series-detail-hero__media" },
        el("img", { src: cover, alt: `${s.name} cover artwork`, loading: "lazy" })
      ) : null,
      el("div", { class: "series-detail-hero__content" },
        el("p", { class: "series-panel-kicker" }, "Series landing page"),
        el("div", { class: "series-detail-hero__top" },
          el("h2", { class: "series-detail-hero__title" }, s.name),
          el("span", { class: "sub" }, `${pieces.length} piece${pieces.length === 1 ? "" : "s"}`)
        ),
        el("p", { class: "series-detail-hero__summary" }, getSeriesSummary(s, pieces)),
        el("div", { class: "series-detail-hero__meta" },
          el("span", { class: "series-meta-pill" }, seriesCategory),
          el("span", { class: "series-meta-pill" }, `${pieces.length} published`),
          anchors.length ? el("span", { class: "series-meta-pill" }, `${anchors.length} highlighted work${anchors.length === 1 ? "" : "s"}`) : null,
          pieces.some((piece) => piece.featured) ? el("span", { class: "series-meta-pill" }, "Featured pieces included") : null
        )
      )
    )
  );

  if (anchors.length) {
    const anchorGrid = el("div", { class: "series-anchor-grid" });
    anchors.forEach((artwork) => {
      const index = pieces.findIndex((piece) => piece.id === artwork.id);
      anchorGrid.appendChild(createArtworkCard(pieces, artwork, Math.max(0, index), [artwork.year || null, artwork.featured ? "Featured" : "Anchor work"]));
    });
    layout.appendChild(
      el("section", { class: "series-section" },
        el("div", { class: "series-section__header" },
          el("h3", {}, "Highlights"),
          el("span", { class: "sub" }, "Anchor works from this series")
        ),
        anchorGrid
      )
    );
  }

  const grid = el("div", { class: "grid series-pieces-grid" });
  if (!pieces.length) {
    grid.appendChild(el("p", { class: "sub series-empty-note" }, "No published pieces in this series yet."));
  } else {
    pieces.forEach((artwork, idx) => {
      const card = createArtworkCard(pieces, artwork, idx, [artwork.year || null, artwork.featured ? "Featured" : null]);
      card.style.gridColumn = "span 4";
      grid.appendChild(card);
    });
  }

  layout.appendChild(
    el("section", { class: "series-section" },
      el("div", { class: "series-section__header" },
        el("h3", {}, "All pieces"),
        el("span", { class: "sub" }, "Ordered run for this series")
      ),
      grid
    )
  );

  if (related.length) {
    layout.appendChild(
      el("section", { class: "series-section" },
        el("div", { class: "series-section__header" },
          el("h3", {}, "Explore next"),
          el("span", { class: "sub" }, "Continue into another collection")
        ),
        el("div", { class: "series-next-links" },
          ...related.map((row) => el("a", {
            class: "series-next-link",
            href: `series.html?s=${encodeURIComponent(row.slug)}`,
            onclick: (event) => {
              event.preventDefault();
              setQS("s", row.slug);
              openSeries(row.slug);
            }
          }, row.name))
        )
      )
    );
  }

  detail.appendChild(layout);

  const mq1 = window.matchMedia("(max-width: 920px)");
  const mq2 = window.matchMedia("(max-width: 620px)");
  const apply = () => {
    const span = mq2.matches ? 12 : (mq1.matches ? 6 : 4);
    grid.querySelectorAll(".card").forEach((card) => {
      card.style.gridColumn = `span ${span}`;
    });
  };
  apply();
  mq1.onchange = apply;
  mq2.onchange = apply;

  renderSeriesList(s.slug);
}

const initial = qs("s");
if (initial) {
  const s = bySlug.get(initial) || byName.get(initial);
  if (s) openSeries(s.slug);
  else renderOverview();
} else {
  renderOverview();
}




