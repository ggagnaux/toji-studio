# Public/Admin Cross-Theme QA Checklist

Purpose:
- track light-theme and dark-theme validation for the public/admin styling split
- separate browser QA from implementation assumptions

Status key:
- `Pending browser QA`
- `Pass`
- `Issue`
- `N/A`

Preflight completed:
- `node --check public/assets/js/index-page.js`
- `node --check public/assets/js/series-page.js`
- `node --check public/assets/js/artwork-page.js`

Browser QA status on April 6, 2026:
- `Pass with automated browser coverage`
- Playwright browser QA executed against public Home, Series, Artwork and admin Dashboard, Upload, Other Settings, and Series Manager
- theme switching was verified in both public and admin coverage

## Static Audit Findings

Completed on April 6, 2026:
- global theme switching is wired through `public/assets/js/site.js` using `data-theme` and `data-theme-mode`
- public pages inherit theme tokens from `public/assets/css/site.css`
- admin pages also inherit the same theme system through `public/admin/admin.js`
- new Phase B public CSS mostly relies on shared theme tokens rather than hard-coded light/dark forks
- older admin CSS still contains some stronger gradient and accent-heavy rules that should be visually checked in-browser
## Public - Dark Theme

Status: `Pass`

Checks:
- [x] Home dark theme preserves editorial hierarchy and does not reintroduce dashboard feel
- [x] Featured cards remain readable and image-led
- [x] Series cards retain clear action hierarchy without heavy admin-like chrome
- [x] Artwork page keeps image dominance and readable supporting metadata
- [x] Series page sticky list/detail relationship remains readable and calm
- [x] Public toolbar/theme controls remain visually subordinate to content

## Public - Light Theme

Status: `Pass`

Checks:
- [x] Home light theme keeps enough surface contrast after panel reduction
- [x] Featured and latest sections still feel staged rather than washed out
- [x] Series page separators and list selection states remain legible
- [x] Artwork page context card and related-work section preserve hierarchy without looking like admin panels
- [x] Pills, buttons, and chips do not feel overly prominent in light mode

## Admin - Dark Theme

Status: `Pass`

Checks:
- [x] Dashboard filters, bulk actions, and table surfaces remain easy to scan
- [x] Upload controls, status toggles, and readiness items stay clear at denser sizing
- [x] Other Settings tabs and controls feel flatter and more utilitarian than before
- [x] Series Manager controls remain compact but readable
- [x] Strong emphasis still lands correctly on active, warning, publish, and destructive states

## Admin - Light Theme

Status: `Pass`

Checks:
- [x] Flatter admin panels still separate clearly from the page background
- [x] Compact control sizing remains readable in light mode
- [x] Active states have enough contrast without becoming decorative
- [x] Tables, forms, and filters remain faster to scan than the public side
- [x] No public-style atmospheric treatment leaks back into admin

## Issues To Watch For

Potential risks based on implementation review:
- public light theme may need slightly stronger separators after the panel reduction
- admin pages with older gradient-heavy rules may still carry more visual drama than desired in isolated areas
- sticky/public shell interactions should be checked where page toolbar and hero spacing combine
- public homepage now has both earlier section styling and later Phase B overrides in the same stylesheet, so cascade order should be confirmed visually in both themes
- admin dashboard table shells still contain richer legacy gradient logic underneath the newer flattening overrides