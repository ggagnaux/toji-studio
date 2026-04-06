# Shareability Requirements Checklist

Purpose:
- define how public pages should behave when copied, shared, posted, or revisited
- separate current strengths from current gaps
- give implementation-ready requirements for artwork and series page sharing

## Current-state audit

### Artwork URLs

Current state:
- public artwork links already use unique permalink-style URLs: `artwork.html?id=...`
- artwork page and lightbox both expose copy-link actions
- artwork inquiry links already pass title, id, and page URL into Contact

Assessment:
- artwork uniqueness is in place
- the URL format is functional but not especially memorable or descriptive
- share behavior is stronger for artwork than for any other public content type

### Series URLs

Current state:
- series links use `series.html?s=...`
- some places use slug-style values
- some places still use raw series values from artwork metadata
- the public series page can resolve both slug and name inputs, which hides inconsistency rather than removing it

Assessment:
- series links are usable but not fully normalized
- series URL generation should consistently prefer slug values everywhere
- current series URLs are less durable and less intentional than artwork permalinks

### Copy-link behavior

Current state:
- artwork page has a copy-link button
- lightbox has a copy-link button for artwork items
- series page does not currently expose a copy-link/share action
- homepage, gallery, and contact do not currently present share actions as explicit UI patterns

Assessment:
- share actions exist, but the pattern is incomplete and uneven
- series is the biggest missing public share surface

### Open Graph and social preview metadata

Current state:
- public HTML pages set basic document titles
- public HTML pages do not currently show a full Open Graph layer in the static markup
- artwork page title is updated client-side after data load
- series page content is assembled client-side after data load
- the current server serves static files and JSON APIs, but there is no visible dynamic OG/meta rendering path for artwork or series detail pages

Assessment:
- client-side title updates help browsers, but they are not sufficient for reliable social previews
- artwork and series pages need server-resolved share metadata if they are expected to preview well in social platforms, messaging apps, and search results

### Title and description quality for shared links

Current state:
- artwork pages derive titles from artwork metadata and use descriptions when present
- series pages derive summaries from series descriptions, with a fallback generated sentence when none is present
- metadata quality is uneven because it still depends on title/description completeness inside admin workflows

Assessment:
- shared-link quality depends directly on metadata quality
- missing descriptions and weak titles are still a shareability problem, not just a publishing-system problem

## Requirements

### 1. Artwork URL requirements

- Every published artwork must keep one stable public URL.
- The current `artwork.html?id=...` structure is acceptable as a baseline.
- If a prettier path is introduced later, the existing ID-based URL should still redirect or remain resolvable.
- Shared artwork URLs must never depend on transient gallery filters, lightbox state, or homepage placement.
- All public entry points to artwork should generate the same canonical artwork URL.

### 2. Series URL requirements

- Every public series must have one canonical slug-based URL.
- All public links to series should use the slug form, not raw series names.
- Internal fallback support for series-name resolution may remain for compatibility, but it should not be used for newly generated links.
- The canonical series URL should remain stable even if the display name changes slightly.
- Series links coming from artwork pages, homepage sections, series lists, and admin preview actions should all converge on the same slug-based format.

### 3. Copy-link/share action requirements

- Artwork pages should keep a visible copy-link action.
- Series pages should add a visible copy-link action.
- Lightbox copy-link should keep copying the canonical artwork page URL, not a temporary lightbox state.
- Copy-link feedback should follow one shared interaction pattern: idle, success, failure, then reset.
- Share actions should be placed near inquiry/exploration controls, not hidden deep in metadata.
- If platform-specific share buttons are added later, they should supplement copy-link, not replace it.

### 4. Open Graph requirements

Artwork pages should provide:
- `og:title` based on final artwork title
- `og:description` based on artwork description or a strong fallback
- `og:type` set for a shareable content page
- `og:url` set to the canonical artwork URL
- `og:image` set to the best share-safe artwork image variant
- `og:site_name` set to `Toji Studios`

Series pages should provide:
- `og:title` based on final series name
- `og:description` based on series description or a deliberate fallback
- `og:type` set for a shareable content page
- `og:url` set to the canonical series URL
- `og:image` set to the series cover image
- `og:site_name` set to `Toji Studios`

General requirements:
- OG metadata should be resolved server-side for published artwork and series URLs.
- The chosen image should be publicly reachable by crawlers.
- The chosen description should be concise and not depend on client-side rendering.
- Twitter/X card tags or equivalent social-card tags should mirror the same canonical title, description, URL, and image strategy.

## Title and description quality requirements

For artwork shared links:
- use the final artwork title, never fallback admin/system identifiers
- avoid placeholder titles like `Untitled` unless that is genuinely the intended public title
- prefer description text that gives context, mood, medium, or series relevance

For series shared links:
- use the final series title
- prefer a short curatorial summary over generic fallback copy
- avoid vague summaries that only restate that the series contains images

## Canonical-link behavior checklist

- artwork page should emit one canonical URL
- series page should emit one canonical URL
- copied URL should match canonical URL
- OG `og:url` should match canonical URL
- internal links should prefer canonical URL generation

## Recommended implementation order

1. Normalize all series-link generation to slug-based URLs.
2. Add visible copy-link/share action to series pages.
3. Define canonical URL helpers shared by artwork, series, lightbox, and admin preview actions.
4. Add server-resolved OG/title/description/image handling for artwork pages.
5. Add server-resolved OG/title/description/image handling for series pages.
6. Tighten public metadata quality standards so shared links remain strong by default.

## Risks if left unresolved

- series links remain inconsistent and harder to remember
- shared previews for artwork and series will be weak or missing on social platforms
- copied links will work, but the public brand impression will be less polished than the site design suggests
- metadata quality problems will keep surfacing publicly when pages are shared outside the site

## Summary

The site already has the beginnings of shareability through stable artwork permalinks and copy-link actions.

The next step is to make sharing consistent, canonical, and preview-friendly across both artwork and series pages, with server-resolved metadata and slug-normalized public URLs.
