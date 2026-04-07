# Public/Admin Responsive QA Checklist

Purpose:
- track desktop/mobile validation for the public/admin styling split
- isolate layout QA from stylistic interpretation notes

Status key:
- `Pending browser QA`
- `Pass`
- `Issue`
- `N/A`

Browser QA status on April 6, 2026:
- `Pass with automated browser coverage`
- Playwright responsive checks executed across public and admin pages at desktop, tablet, and mobile-oriented widths
- layout assertions included overflow protection and lightbox bottom-navigation usability

## Static Audit Findings

Completed on April 6, 2026:
- responsive breakpoints exist for the new public homepage staging in `public/assets/css/index.css`
- responsive breakpoints exist for public Series in `public/assets/css/series.css`
- responsive stacking rules exist for Artwork in `public/assets/css/artwork.css`
- admin Series Manager has explicit breakpoint handling in `public/admin/series.html`
- dashboard/upload/other settings still depend partly on older responsive behavior and should be checked in-browser
## Public - Responsive Checks

Status: `Pass`

Checks:
- [x] Home featured cards reflow cleanly at tablet widths
- [x] Home series cards collapse from two-column presentation to one-column cleanly
- [x] Series sticky list becomes non-sticky at narrower widths without awkward gaps
- [x] Series overview and anchor grids collapse without broken rhythm
- [x] Artwork page media, context card, and related section stack cleanly on tablet/mobile
- [x] Lightbox bottom navigation remains usable on small screens after recent nav changes

## Admin - Responsive Checks

Status: `Pass`

Checks:
- [x] Dashboard controls wrap cleanly without clipping filters or search
- [x] Table/thumb toggle areas remain usable on tablet widths
- [x] Upload tag filters and status controls wrap without overflow
- [x] Other Settings tab bar remains usable on smaller screens
- [x] Series Manager two-column layout collapses cleanly at defined breakpoints
- [x] Modals, toolbars, and sticky areas remain readable on smaller screens

## Regression Watchlist

Status: `Pass`

Checks:
- [x] sticky headers remain aligned after shell spacing changes
- [x] public toolbars do not overlap hero content on smaller widths
- [x] admin forms do not clip floating labels or compact buttons
- [x] tables, modals, and panels keep readable padding at mobile widths
- [x] no unexpected horizontal scroll appears on public or admin pages
- [x] homepage slideshow width and minimum image sizing do not force awkward overflow on narrower screens
- [x] lightbox bottom navigation remains centered and readable after the recent control-layout changes
