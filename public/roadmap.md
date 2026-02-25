# Toji Studios Website — Roadmap

## Legend
- [x] Done
- [ ] Next / Planned

---

## 1) What we’ve built so far

### 1.1 Public layout & navigation
- [x] Centralized public header/nav in `public/assets/js/header.js`
  - [x] Injects header into `<header id="siteHeader"></header>`
  - [x] Nav includes **Home / Gallery / Series / About / Contact / Studio**
  - [x] Theme controls (System / Light / Dark + toggle)
- [x] Centralized public footer in `public/assets/js/footer.js`
  - [x] Injects footer into `<footer id="siteFooter"></footer>`
  - [x] Auto-updates year
  - [x] Footer links configurable per page

### 1.2 Public pages wired to shared layout
- [x] `public/index.html` updated to use shared header/footer
- [x] `public/gallery.html` updated to use shared header/footer
- [x] `public/about.html` updated to use shared header/footer
- [x] `public/contact.html` updated to use shared header/footer
- [x] New `public/series.html` created and added to nav
- [x] New `public/artwork.html` (permalink page) created

### 1.3 Studio-driven public content (front-end only)
- [x] Public pages read from **Studio Admin localStorage** (key: `toji_admin_state_v1`)
  - [x] Only **published** items are shown publicly
  - [x] Fallback to `public/assets/data/admin.sample.json` when localStorage is empty

### 1.4 Gallery improvements
- [x] Tag chips + search filter
- [x] Added **Featured section** above “All works”
- [x] Click-to-view via a lightweight lightbox (ESC / arrows / backdrop click)

### 1.5 Home page improvements
- [x] Featured strip (horizontal scroll)
- [x] Latest works grid
- [x] Both sections populate from Studio-published content

### 1.6 Series browsing
- [x] `public/series.html` supports:
  - [x] Series list with counts
  - [x] Series detail view with ordered pieces
  - [x] Optional series descriptions via `state.seriesMeta`
  - [x] Deep link support via query string `?s=Series%20Name`

### 1.7 Contact workflow
- [x] Full contact page using mailto-based draft (no backend required)
- [x] Contact page supports **auto-prefill** from query params:
  - [x] `topic`, `title`, `id`, `url`
  - [x] Used by the “Inquire” button on `public/artwork.html`

---

## 2) Next changes (recommended order)

### 2.1 Switch cards to permalinks everywhere
Goal: make the site more “web-native” and shareable.
- [ ] Update **Home** cards (Featured + Latest) to link to:
  - [ ] `artwork.html?id=<id>`
- [ ] Update **Gallery** cards to link to:
  - [ ] `artwork.html?id=<id>`
- [ ] Update **Series** piece cards to link to:
  - [ ] `artwork.html?id=<id>`

Optional (if you want to keep lightbox):
- [ ] Keep click-to-open lightbox but add a **“View page”** button inside the lightbox.

### 2.2 Add “Backlinks” and better navigation on the artwork page
- [ ] If artwork has a series, show a “Back to series” button (already partially present via “More like this” link target)
- [ ] Add “Previous / Next” within the same series (or within recent items)
- [ ] Add an always-visible “Copy link” success toast (polish)

### 2.3 Make gallery filters sharable via URL
- [ ] Support `gallery.html?tag=...` (and `?q=...`) so tags from `artwork.html` chips work predictably
- [ ] Persist filter state in URL when clicking chips

### 2.4 Reduce duplicated lightbox code (DRY)
Right now, similar lightbox logic exists in multiple pages.
- [ ] Create `public/assets/js/lightbox.js` as a shared module
- [ ] Reuse it across `index.html`, `gallery.html`, `series.html`

### 2.5 Studio Admin “Series” management polish
- [ ] Add/confirm a Studio UI for:
  - [ ] Editing `seriesMeta.description`
  - [ ] Controlling series order (`seriesMeta.sortOrder`)
  - [ ] Bulk-assigning series to artworks

### 2.6 Image pipeline planning (when you’re ready for backend)
You asked for:
- hide originals (private)
- only serve resized versions publicly
- future multi-user

Roadmap for that later:
- [ ] Decide storage layout: originals (private) + variants (public)
- [ ] Generate variants server-side (thumb / medium / large)
- [ ] Public pages point to variants only
- [ ] Add upload endpoint with auth, then replace “mock upload” with real upload

---

## 3) Backlog / Nice-to-haves
- [ ] Sitemap + robots + basic SEO meta (title/description per page)
- [ ] OpenGraph tags on `artwork.html` for rich social previews
- [ ] Accessibility pass (focus styles, ARIA, keyboard navigation for chips)
- [ ] Performance pass (lazy loading, responsive `srcset`, prefetch)
- [ ] Print / licensing info page
- [ ] Simple analytics (privacy-friendly)
- [ ] Mouse-over effects in studio image grid
- [ ] Admin Tool - Tag Manager
- [ ] Add a blog page
- [ ] Add the ability to upload to social media (images to Instagram and Threads, textual blog posts to Medium and Substack?)
- [ ] Investigate why 503 error is produced when uploading too many files at once.




---

## 4) File map (current)

### Public
- `public/index.html` — Home (Featured + Latest)
- `public/gallery.html` — Gallery (Featured section + filters + lightbox)
- `public/series.html` — Series list + series detail
- `public/artwork.html` — Single piece permalink + “More like this”
- `public/about.html` — About
- `public/contact.html` — Contact (mailto draft + prefill)

### Shared modules
- `public/assets/js/header.js` — Public header/nav + theme controls
- `public/assets/js/footer.js` — Public footer rendering
- `public/assets/js/site.js` — Theme system + shared site behavior (already referenced)

### Data
- `public/assets/data/admin.sample.json` — Fallback seed data

### Studio Admin
- `public/admin/...` — Studio pages (Dashboard / Upload mock / Edit / Series, etc.)
- localStorage key: `toji_admin_state_v1`
- `public/gallery.html` — Gallery (Featured section + filters)
- `public/series.html` — Series browser
- `public/artwork.html` — Artwork permalink page
- `public/about.html` — About
- `public/contact.html` — Contact (mailto draft + query prefill)

### Shared public JS
- `public/assets/js/header.js` — Injected header/nav + theme controls
- `public/assets/js/footer.js` — Injected footer + dynamic year
- `public/assets/js/site.js` — Theme implementation (called by header)

### Data
- `public/assets/data/admin.sample.json` — Fallback content when Studio state is empty

### Studio Admin (front-end)
- `public/admin/index.html` — Studio dashboard
- `public/admin/upload.html` — Upload mock (creates draft records)
- `public/admin/edit.html` — Artwork editor (metadata/status/featured/etc.)
- `public/admin/series.html` — Series management
- `public/admin/admin.js` — Admin state + helpers (localStorage key: `toji_admin_state_v1`)


---

## 5) Notes / Constraints we’re honoring
- Originals should stay private long-term; public should serve resized variants only (backend phase).
- Multi-user is planned later (backend + auth).
- No WordPress / third-party CMS; plain HTML/JS front-end, with Node planned for backend when needed.

