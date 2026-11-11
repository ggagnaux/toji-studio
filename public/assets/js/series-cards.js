import { el } from "./content-utils.js";

export function createSeriesShowcaseCard({
  name,
  slug,
  cover,
  summary,
  items = [],
  href = `series.html?s=${encodeURIComponent(slug || "")}`,
  onOpen,
  onPreview
}) {
  const pieces = Array.isArray(items) ? items : [];
  const hasOpenHandler = typeof onOpen === "function";
  const handleOpen = (event) => {
    event.preventDefault();
    onOpen();
  };
  const openAttributes = {
    class: "home-series-card__coverlink",
    href
  };
  if (hasOpenHandler) {
    openAttributes.onclick = handleOpen;
  }

  const previewItems = pieces.slice(0, 3);
  return el("article", { class: "home-series-item home-series-card" },
    el("a", openAttributes,
      el("div", { class: "home-series-card__cover" },
        el("img", { src: cover, alt: `${name} cover artwork`, loading: "lazy" })
      )
    ),
    el("div", { class: "home-series-card__body" },
      el("p", { class: "home-series-card__eyebrow" }, "Series"),
      el("h3", { class: "home-series-card__title" }, name),
      el("p", { class: "home-series-card__summary" }, summary),
      el("div", { class: "home-series-card__meta" },
        el("span", { class: "home-series-card__pill" }, `${pieces.length} piece${pieces.length === 1 ? "" : "s"}`),
        pieces.some((item) => item.featured) ? el("span", { class: "home-series-card__pill" }, "Featured work inside") : null
      ),
      previewItems.length ? el("div", { class: "home-series-card__preview", "aria-hidden": "true" },
        ...previewItems.map((item) => el("img", {
          src: item.thumb || item.image || cover,
          alt: "",
          loading: "lazy"
        }))
      ) : null,
      el("div", { class: "home-series-card__actions" },
        hasOpenHandler
          ? el("button", {
            class: "btn primary",
            type: "button",
            onclick: handleOpen
          }, "Open series")
          : el("a", { class: "btn primary", href }, "Open series"),
        pieces.length && typeof onPreview === "function" ? el("button", {
          class: "btn",
          type: "button",
          onclick: (event) => {
            event.preventDefault();
            onPreview();
          }
        }, "Preview works") : null
      )
    )
  );
}
