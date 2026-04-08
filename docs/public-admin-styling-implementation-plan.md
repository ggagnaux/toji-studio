# Public/Admin Styling Implementation Plan

This plan translates the “Recommended styling direction by area” guidance from the public/admin differentiation brief into concrete implementation work.

Source brief:
- `docs/public-admin-styling-differentiation-brief.md`

## Goal

Create a clearer split between the two sides of the product:
- Public = atmospheric, spacious, curatorial, image-led
- Admin = denser, flatter, faster, operational, information-efficient

## Principles

- Do not redesign both sides with one shared visual solution.
- Keep shared brand identity, but split surface treatment and interaction tone.
- Public changes should reduce dashboard feel.
- Admin changes should reduce decorative feel.
- Prefer staged implementation over broad one-pass refactors.

## Wave 1 - Shell And Surface Split

### 1. Public shell simplification and atmosphere pass

Primary files:
- `public/assets/css/site.css`
- `public/assets/css/index.css`
- `public/assets/css/series.css`
- `public/assets/css/contact.css`

Tasks:
- reduce heavy card/panel framing on public-facing sections where it feels too system-like
- increase spacing and visual pacing between major public sections
- soften or reduce utility chrome such as pills, segmented controls, and toolbar emphasis
- strengthen image-first presentation and editorial hierarchy
- keep public controls available, but make them visually subordinate to content

Expected outcome:
- public pages feel less like a browsing interface and more like a curated exhibition environment

### 2. Admin shell utility pass

Primary files:
- `public/assets/css/site.css`
- `public/admin/admin.js`
- `public/admin/css/index.css`
- `public/admin/css/upload.css`
- `public/admin/css/OtherSettings.css`

Tasks:
- flatten gradient-heavy or glow-heavy admin surfaces
- reduce ornamental shadows and decorative highlight treatments
- tighten spacing for repeated controls, filters, and action bars
- make tables, forms, and management panels easier to scan quickly
- reserve strong emphasis colors for warnings, publish state, completeness state, and destructive actions

Expected outcome:
- admin reads as a tool first, not a branded scene

## Wave 2 - Page Pattern Refactor

### 3. Public page pattern pass

Primary files:
- `public/index.html`
- `public/series.html`
- `public/artwork.html`
- `public/assets/js/index-page.js`
- `public/assets/js/series-page.js`
- `public/assets/js/artwork-page.js`
- related public CSS files

Tasks:
- Home: make featured and series entry points feel staged instead of boxed
- Series: reduce the list/detail application feel and increase exhibition-room feeling
- Artwork: reduce detail-sheet feel and strengthen the sense that the piece belongs to a larger body of work
- ensure public utility controls are visually quieter than content blocks

Expected outcome:
- page-to-page public experience feels more authored and less operational

### 4. Admin component consistency pass

Primary files:
- `public/admin/index.html`
- `public/admin/upload.html`
- `public/admin/series.html`
- `public/admin/OtherSettings.html`
- related admin CSS/JS files

Tasks:
- standardize compact control sizing across admin pages
- unify flatter panel and table treatments
- simplify repeated button, chip, and toggle styles
- make filters, edit controls, and batch actions more utilitarian and less presentational

Expected outcome:
- admin pages feel like parts of one publishing tool rather than sections of the public site

## Wave 3 - Token Split And Validation

### 5. Shared token split

Primary files:
- `public/assets/css/site.css`

Tasks:
- separate shared surface tokens into public-leaning and admin-leaning usage patterns
- keep common foundations only where maintainability benefits are real
- avoid forcing identical card, toolbar, or control treatment across both experiences

Suggested split:
- Public tokens: softer framing, more atmospheric backgrounds, stronger display hierarchy
- Admin tokens: neutral surfaces, compact spacing, stronger functional contrast, lower drama

Expected outcome:
- future work can build against clearer defaults instead of repeatedly overriding shared styles

### 6. QA and polish pass

Checklist:
- verify public pages no longer feel dashboard-like
- verify admin pages no longer feel theatrical or exhibition-like
- test desktop and mobile layouts
- test dark and light themes
- test sticky headers, toolbars, tables, forms, and modals
- confirm no regressions in readability, spacing, or interaction clarity

Expected outcome:
- the split feels intentional and stable across the whole product

## Suggested Execution Order

1. Split shared shell and surface styling in `public/assets/css/site.css`
2. Apply public-facing style changes to key public pages
3. Apply admin-facing style changes to key admin pages
4. Refine page-specific patterns on Home, Series, and Artwork
5. Standardize admin utility components
6. Run cross-theme and responsive QA

## File Watchlist

Public:
- `public/assets/css/site.css`
- `public/assets/css/index.css`
- `public/assets/css/series.css`
- `public/assets/css/contact.css`
- `public/index.html`
- `public/series.html`
- `public/artwork.html`
- `public/assets/js/index-page.js`
- `public/assets/js/series-page.js`
- `public/assets/js/artwork-page.js`

Admin:
- `public/admin/admin.js`
- `public/admin/css/index.css`
- `public/admin/css/upload.css`
- `public/admin/css/OtherSettings.css`
- `public/admin/index.html`
- `public/admin/upload.html`
- `public/admin/series.html`
- `public/admin/OtherSettings.html`

## Success Criteria

Public success looks like:
- more image-led presentation
- less visible system framing
- quieter control chrome
- stronger curatorial atmosphere

Admin success looks like:
- faster scanning
- flatter, clearer surfaces
- more compact repeated controls
- stronger emphasis on status and workflow clarity

Overall success looks like:
- public and admin no longer feel like two skins of the same interface
- future design decisions have a clear directional rule set

## Non-Goals

This plan does not require:
- a full branding redesign
- replacing the entire shared CSS foundation at once
- rewriting public or admin information architecture before styling improvements begin

## Recommended Next Step

Start with Wave 1 and treat `public/assets/css/site.css` as the main separation layer, then move outward into page-specific public and admin styles.
