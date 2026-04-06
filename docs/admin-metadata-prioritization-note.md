# Admin Metadata Prioritization Note

Purpose:
- keep admin roadmap decisions anchored to public content quality
- rank admin work by how much it improves publish-ready titles, descriptions, tags, series structure, and visibility
- make it harder for novelty or decorative tooling to outrank metadata fundamentals

## Core principle

For this product, metadata quality is core product behavior, not admin polish.

The public site becomes more searchable, more legible, and more curatorial when each published work has:
- a strong title
- a useful description
- accurate tags/category signals
- correct series assignment
- an intentional status and order
- a verified cover/thumbnail result

Any admin feature that does not materially improve those outcomes should rank below the workflows that do.

## Priority framework

Use this order when deciding what to build next:

1. Public quality impact
A feature ranks higher if it directly improves what visitors see on public artwork, series, gallery, home, or contact pages.

2. Metadata leverage
A feature ranks higher if it increases completeness, consistency, or editorial quality for title, description, tags, series, visibility, cover image, or ordering.

3. Workflow frequency
A feature ranks higher if it affects repeated day-to-day publishing actions such as upload, edit, review, and publish.

4. Error prevention
A feature ranks higher if it prevents bad publishes, missing fields, wrong visibility, weak covers, or unfinished series pages.

5. Distribution support
A feature ranks lower than metadata unless it amplifies already-good content rather than compensating for incomplete content.

6. Novelty and decoration
A feature ranks lowest if it is mostly aesthetic, experimental, or optional and does not improve publish readiness.

## Current admin feature ranking

### Tier 1 - Must stay highest priority

These are the core publishing surfaces and should receive implementation time before new novelty features.

- `Image Manager` / artwork edit flow
Why: this is where title, description, tags, status, featured state, and final publish decisions are made.

- `Upload`
Why: this is the first chance to prevent incomplete metadata from entering the system.

- `Series Manager`
Why: series description, cover, visibility, order, and assigned artwork shape the public narrative.

- Metadata completeness/readiness indicators
Why: they prevent low-quality publishes and create consistent editorial standards.

### Tier 2 - High priority support

These matter after Tier 1 because they still affect public quality, but less directly.

- `Homepage Manager`
Why: homepage visibility and featured decisions matter, but only after artwork and series metadata are strong.

- `Image Variant Settings`
Why: image quality affects public presentation, but it does not replace missing titles, descriptions, or series structure.

- `Contact` settings
Why: contact clarity supports conversion, but it depends on strong published content already being in place.

### Tier 3 - Secondary distribution tooling

Useful, but these should not outrank metadata work.

- `Social Media Manager`
Why: helps distribution, but strong distribution starts with strong source metadata and artwork context.

- `Social Queue`
Why: queue management is valuable after the artwork/series being promoted is already well-described and publish-ready.

- `Link Manager`
Why: supports ecosystem presence, but does not materially improve core artwork metadata.

### Tier 4 - Lowest priority / novelty-first risk

These should stay secondary until core metadata workflows are consistently strong.

- `Splash` controls
Why: visual flourish with little effect on searchability, clarity, or publishing quality.

- `Banner Logo` animation controls
Why: decorative brand behavior, not metadata or publishing quality.

- `AI generation` conveniences
Why: can speed drafting, but should support editorial review rather than replace metadata standards.

## Recommended decision rules

Use these rules for future work selection:

- Do not start new splash, banner, or decorative animation work while metadata completeness gaps remain visible in publish-ready content.
- Do not prioritize social queue refinements over upload, edit, artwork readiness, or series readiness improvements.
- Treat AI tools as assistive accelerators only after manual metadata standards are clearly defined.
- Prefer features that reduce missing descriptions, weak titles, absent tags, wrong series assignment, weak cover choices, or accidental publishing.
- If two tasks take similar effort, choose the one that improves a public page before the one that improves an internal convenience.

## Recommended future-work order

1. Finish metadata-first publishing workflow improvements across upload, edit, dashboard, and series surfaces.
2. Add stronger validation and blocking around incomplete publish states.
3. Improve public-facing curation controls such as homepage and series presentation once metadata quality is dependable.
4. Improve distribution tooling such as social flows only after source content quality is stable.
5. Revisit decorative, experimental, or novelty admin features last.

## What to defer first if capacity is tight

Defer these before metadata work:
- splash animation expansion
- banner animation/style expansion
- AI novelty features beyond basic assistive drafting
- social queue polish that does not improve source metadata
- decorative admin presentation work not tied to publish readiness

## Summary

Admin priority should be judged by one question:

Does this help publish stronger artwork and series pages?

If yes, it belongs near the top. If not, it should wait behind metadata quality work.
