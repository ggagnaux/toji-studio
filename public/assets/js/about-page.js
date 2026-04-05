import { renderPublicHeader } from "./header.js";
import { renderPublicFooter } from "./footer.js";
import { initStickyHero } from "./site.js";

renderPublicHeader({
  active: "about",
  small: "about",
  ctaText: "Inquire",
  ctaHref: "contact.html",
  showThemeControls: false
});

renderPublicFooter({
  rightHtml: `<a href="index.html">Home</a> &bull; <a href="gallery.html">Gallery</a> &bull; <a href="series.html">Series</a> &bull; <a href="contact.html">Contact</a> &bull; <a href="admin/index.html">Studio</a>`
});

initStickyHero();
