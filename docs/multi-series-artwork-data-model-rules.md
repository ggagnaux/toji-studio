# Multi-Series Artwork Data Model Rules (V1)

This note defines the approved data model rules for assigning multiple series to a single artwork.

## Scope

Applies to:
- backend storage model for artwork-to-series relationships
- admin create/edit/upload behavior for series assignment
- public rendering behavior that consumes series relationships

Does not replace:
- series metadata model (`series` table fields like name, slug, visibility, order)

## Core Relationship Rules

1. One artwork can belong to zero, one, or many series.
2. One series can include zero, one, or many artworks.
3. Artwork-to-series links are represented as explicit membership rows.
4. Duplicate memberships are not allowed for the same `(artworkId, seriesSlug)` pair.

## Primary Series Rule

1. An artwork may designate one optional primary series.
2. Primary series is only meaningful when artwork has at least one membership.
3. If no primary is set, fallback primary is the first membership by stable ordering.
4. If a primary membership is removed, primary falls back to the next available membership.

## Membership Ordering Rule

1. Per-membership sort order is not required for V1.
2. V1 ordering fallback: stable deterministic ordering by `seriesSlug` ascending.
3. Future support for per-membership sort order is allowed without changing the core relationship model.

## Slug Normalization Rules

1. Membership rows store `seriesSlug` only (not series name).
2. Input slug normalization before persistence:
- trim leading/trailing whitespace
- lowercase
- collapse internal whitespace to single hyphens
- remove unsupported characters to match existing slug conventions
3. Empty or invalid slugs must be rejected.
4. Unknown slugs (no matching series record) must be rejected.

## Delete/Visibility Behavior Rules

1. If a linked series is hidden (`isPublic = 0`):
- memberships remain intact
- admin continues to show the link
- public views exclude hidden series links by default
2. If a series is deleted:
- associated membership rows are removed
- artwork remains valid and published unless other rules block it
- if deleted series was primary, primary fallback rule applies

## Backward Compatibility Rules (V1)

1. Legacy `artworks.series` is retained during transition.
2. New writes should dual-write:
- membership rows in `artwork_series`
- legacy `artworks.series` as a compatibility value (prefer primary series display name/slug mapping)
3. New reads should expose `seriesSlugs` while still including legacy `series` where required.
4. Backfill from `artworks.series` to membership rows must be idempotent.

## API Contract Rules (V1)

1. Write endpoints accept `seriesSlugs: string[]`.
2. Server deduplicates and validates submitted slugs.
3. Read endpoints include `seriesSlugs`.
4. Legacy `series` may be returned for compatibility until cleanup phase is complete.

## Admin UX Rules (V1)

1. Edit and Upload workflows must support selecting multiple series.
2. UI should allow clearing all memberships.
3. UI should support optional primary selection.
4. Readiness "Series" check passes when artwork has at least one membership.

## Public UX Rules (V1)

1. Artwork page may show multiple series links.
2. Series-related recommendations use shared-membership overlap, not single-value equality.
3. Lightbox and compact contexts show primary series or fallback first series when space is limited.

## Non-Goals (V1)

1. No hierarchical series model.
2. No weighted membership scoring model.
3. No per-membership custom labels.

## Acceptance Criteria

1. Artwork can be linked to multiple series and persisted reliably.
2. Duplicate membership rows are prevented.
3. Hidden/deleted series behavior follows rules above.
4. Existing single-series data remains functional during migration.
5. Admin and public views render deterministic, valid series links.
