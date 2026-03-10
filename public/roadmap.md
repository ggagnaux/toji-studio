# Toji Studios Website - Roadmap

## Legend
- [x] Done
- [ ] Next / Planned

---

## 1) Current State (March 2026)

### 1.1 Public site foundation
- [x] Shared public header in `public/assets/js/header.js`
  - [x] Nav links: Home / Gallery / Series / About / Contact / Studio
  - [x] Theme controls: System / Light / Dark + toggle
  - [x] Mobile nav behavior and responsive controls
- [x] Shared public footer in `public/assets/js/footer.js`
  - [x] Dynamic year + per-page right-side links

### 1.2 Public pages and content views
- [x] `public/index.html`
  - [x] Splash screen with configurable animation modes
  - [x] Featured slideshow
  - [x] Featured artworks strip
  - [x] Latest works grid
  - [x] Series section with tiled previews
- [x] `public/gallery.html`
  - [x] Featured section
  - [x] Series grouping section
  - [x] Search + tag filters
  - [x] Artwork links route to permalinks (`artwork.html?id=...`)
- [x] `public/series.html`
  - [x] Series list with counts
  - [x] Series detail with ordered pieces
  - [x] Deep linking via query parameter
- [x] `public/artwork.html`
  - [x] Permalink rendering by artwork id
  - [x] Copy-link action
  - [x] "More like this" recommendations (series-first fallback to recent)
  - [x] Inquiry handoff to Contact with query-prefill
- [x] `public/contact.html`
  - [x] Mailto-based inquiry flow
  - [x] Query-prefilled fields (`topic`, `title`, `id`, `url`)
  - [x] Renders managed external/social links from Studio settings

### 1.3 Studio Admin UX
- [x] Studio admin page set now includes:
  - [x] `index.html` (Image Manager / Dashboard)
  - [x] `upload.html`
  - [x] `edit.html`
  - [x] `series.html`
  - [x] `linkmanager.html`
  - [x] `HomePageManager.html`
  - [x] `OtherSettings.html`
  - [x] `SecurityManager.html`
  - [x] `login.html`
- [x] Admin session gate + login page (`public/admin/login.html`)
- [x] Dashboard (`public/admin/index.html`)
  - [x] KPI counts (published/draft/hidden)
  - [x] Search + tabs + row/card views
  - [x] Bulk actions (status/feature/delete/tags)
  - [x] Backend cleanup trigger
- [x] Upload (`public/admin/upload.html`)
  - [x] Multi-file upload
  - [x] Batch tags/series/year/status
- [x] Edit (`public/admin/edit.html`)
  - [x] Metadata editing, status controls, feature toggle
  - [x] Tag editing and backend patch sync
  - [x] Replace image / regenerate variants actions
- [x] Series Manager (`public/admin/series.html`)
  - [x] Upsert/delete series
  - [x] Sort order, visibility, descriptions
  - [x] Cover artwork selection
  - [x] Multi-select + delete flows
- [x] Link Manager (`public/admin/linkmanager.html`)
  - [x] Manage external links (label/url/category/enabled)
  - [x] Validation + persisted settings
- [x] Home Page Manager (`public/admin/HomePageManager.html`)
  - [x] Toggle visibility for: intro/latest/featured/series/featured slideshow
- [x] Other Settings (`public/admin/OtherSettings.html`)
  - [x] Splash animation mode selection (including random mode)
  - [x] Random-cycle timing controls
  - [x] Header/splash logo animation toggle + style selector
  - [x] Banner updates immediately after Save
- [x] Security Manager (`public/admin/SecurityManager.html`)
  - [x] Change admin password
  - [x] Reset password to default

### 1.4 Backend and media pipeline
- [x] Node/Express API with token-protected admin routes
- [x] SQLite persistence (`artworks`, `variants`, `series`)
- [x] Private originals + public variants architecture
  - [x] Originals stored privately
  - [x] Only `/media` variants served publicly
- [x] Upload pipeline with Sharp variant generation
  - [x] `thumb` + `web` variant generation
  - [x] Image replacement and variant regeneration endpoints
- [x] Cleanup endpoint for orphaned files/rows
- [x] Public read APIs for artworks and series

### 1.5 Data source model (current)
- [x] Studio uses local cache (`toji_admin_state_v1`) for fast/offline-ish UX
- [x] If API token is present, Studio auto-syncs with backend APIs
- [x] Public pages can consume backend content and retain local/fallback support where needed

---

## 2) Recently Completed (from older roadmap items)
- [x] Switched public cards to permalink navigation (`artwork.html?id=...`)
- [x] Added configurable splash animation options in admin
- [x] Added home page section visibility controls in admin
- [x] Added/expanded series management workflows
- [x] Added security/login flows for admin pages
- [x] Moved from "mock upload" direction to real backend upload + image pipeline

---

## 3) Next Priorities

### 3.1 Security hardening
- [ ] Replace localStorage/sessionStorage-style admin auth with server-authenticated login sessions/JWT flow
- [ ] Add password hashing and secure credential storage server-side
- [ ] Add rate limiting + lockout/backoff for auth endpoints
- [ ] Add CSRF/abuse review for admin mutations
- [ ] Add a confirmation dialog PRIOR to any calls to external Ai systems.


### 3.2 Content architecture consistency
- [ ] Fully standardize public pages to backend-first reads (with intentional fallback strategy)
- [ ] Remove stale local-only assumptions where backend is now source-of-truth
- [ ] Add migration/versioning for local admin cache shape

### 3.3 Studio quality-of-life
- [ ] Add drag/drop ordering UI for external links
- [ ] Add dedicated tag manager view (merge/rename/remove)
- [ ] Improve bulk operations feedback and progress for large sets
- [ ] Add safer multi-step destructive actions for large deletes

### 3.4 Public UX polish
- [ ] Shareable URL state for Gallery filters (`?q=`, `?tag=`)
- [ ] Previous/Next navigation on artwork permalink
- [ ] Accessibility pass (focus states, keyboard paths, announcements)
- [ ] Performance pass (image loading strategy, query batching, bundle cleanup)

### 3.5 Operational readiness
- [ ] Environment/setup docs for local + deployed API (`ADMIN_TOKEN`, CORS, storage location)
- [ ] Basic smoke tests for key API flows (upload, patch, delete, series CRUD)
- [ ] Backup/restore guidance for SQLite + media storage
- [ ] Obfuscate markup (id's, classnames, etc.) during build/deploy step (I want to try this)

---

## 4) Backlog / Nice-to-haves
- [ ] SEO baseline (metadata consistency, sitemap, robots)
- [ ] OpenGraph enrichment for artwork permalinks
- [ ] Optional analytics (privacy-conscious)
- [ ] Social publishing tracking schema and UI
- [ ] Optional social posting integrations
- [ ] Investigate and mitigate large-batch upload 503 behavior

---

## 5) File Map (Current)

### Public
- `public/index.html`
- `public/gallery.html`
- `public/series.html`
- `public/artwork.html`
- `public/about.html`
- `public/contact.html`

### Shared JS
- `public/assets/js/header.js`
- `public/assets/js/footer.js`
- `public/assets/js/site.js`
- `public/assets/js/content-utils.js`

### Studio Admin
- `public/admin/index.html`
- `public/admin/upload.html`
- `public/admin/edit.html`
- `public/admin/series.html`
- `public/admin/linkmanager.html`
- `public/admin/HomePageManager.html`
- `public/admin/OtherSettings.html`
- `public/admin/SecurityManager.html`
- `public/admin/login.html`
- `public/admin/admin.js`

### Backend
- `public/toji-backend/src/server.js`
- `public/toji-backend/src/auth.js`
- `public/toji-backend/src/db.js`
- `public/toji-backend/src/routes/public.js`
- `public/toji-backend/src/routes/admin.js`
- `public/toji-backend/src/routes/upload.js`
- `public/toji-backend/src/routes/series.js`
