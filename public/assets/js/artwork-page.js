import { renderPublicHeader } from "./header.js";
    import { renderPublicFooter } from "./footer.js";
    import { initStickyHero } from "./site.js";
    import { qs, el, sortBySortOrderAndDate } from "./content-utils.js";

    // Header/footers
    renderPublicHeader({
      active: "gallery",
      small: "artwork",
      ctaText: "Explore",
      ctaHref: "gallery.html",
      //brandLogoSrc: "assets/img/TojiStudios_LogoAndName_ForWebsite.png"
      brandLogoSrc: "assets/img/logo.png"
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
    const img = document.getElementById("img");
    const titleEl = document.getElementById("title");
    const metaLine = document.getElementById("metaLine");
    const desc = document.getElementById("desc");
    const tagsWrap = document.getElementById("tagsWrap");
    const inquireBtn = document.getElementById("inquireBtn");
    const copyLinkBtn = document.getElementById("copyLink");
    const moreGrid = document.getElementById("moreGrid");
    const moreLink = document.getElementById("moreLink");

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
    sub.textContent = [art.series || null, art.year || null].filter(Boolean).join(" \u2022 ") || "Published work";

    titleEl.textContent = art.title || "Untitled";
    metaLine.textContent = [
      art.series ? `Series: ${art.series}` : null,
      art.year ? `Year: ${art.year}` : null,
      art.featured ? "Featured" : null
    ].filter(Boolean).join(" \u2022 ") || "";

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

    // More like this: same series first, else recent
    const sameSeries = art.series
      ? items.filter(a => a.series === art.series && a.id !== art.id)
      : [];

    let more = sameSeries.length ? sortRecent(sameSeries) : sortRecent(items.filter(a => a.id !== art.id));
    more = more.slice(0, 6);

    moreLink.href = art.series ? `series.html?s=${encodeURIComponent(art.series)}` : "gallery.html";

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
              el("p", { class:"sub" }, [a.series || null, a.year || null].filter(Boolean).join(" \u2022 ") || " ")
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



