# Multi-Series Artwork Support Tasks

This task list converts the multi-series artwork design direction into executable work items.

Purpose:
- add support for assigning multiple series to a single artwork
- preserve backward compatibility during rollout
- separate execution tracking from implementation details

Status legend:
- `Pending`
- `In Progress`
- `Done`
- `Deferred`

## Wave 1 - Data Model And Migration

### Task 1 - Finalize data model rules
Status: `Done`

Tasks:
- [x] confirm one artwork can belong to many series
- [x] confirm one optional primary series per artwork
- [x] confirm whether per-membership sort order is required in v1
- [x] define normalization rules for series slugs in membership rows
- [x] define behavior when a linked series is deleted or hidden

Deliverables:
- [x] multi-series data model rule set
- [x] v1 constraints and fallback behavior note

### Task 2 - Add membership table in backend DB
Status: `Done`

Tasks:
- [x] add `artwork_series` table in `public/server/src/db.js`
- [x] add unique constraint for `(artworkId, seriesSlug)`
- [x] add indexes for `artworkId` and `seriesSlug`
- [x] add optional membership metadata fields (`isPrimary`, `sortOrder`, timestamps)
- [x] ensure table creation is safe in existing environments

Deliverables:
- [x] `artwork_series` schema created and bootstrapped

### Task 3 - Backfill current single-series data
Status: `Done`

Tasks:
- [x] create migration/backfill routine from `artworks.series` to `artwork_series`
- [x] backfill one membership row for artworks with existing series values
- [x] ensure migration is idempotent
- [x] log/track rows skipped due to missing or invalid series references
- [x] verify no duplicate membership rows are created

Deliverables:
- [x] backfill routine
- [x] migration verification checklist

## Wave 2 - Backend API Support

### Task 4 - Add multi-series write support in admin endpoints
Status: `Done`

Tasks:
- [x] update `PATCH /api/admin/artworks/:id` to accept `seriesSlugs: string[]`
- [x] update upload endpoint to accept batch multi-series assignment
- [x] validate and dedupe submitted slugs
- [x] reject unknown series slugs with clear errors
- [x] dual-write legacy `artworks.series` during compatibility window

Deliverables:
- [x] admin write APIs accept and persist multi-series memberships

### Task 5 - Add multi-series read support in admin/public endpoints
Status: `Done`

Tasks:
- [x] include `seriesSlugs` in admin artwork responses
- [x] include `seriesSlugs` in public artwork responses
- [x] keep legacy `series` field temporarily for compatibility
- [x] update public series counts/filters to read from membership table
- [x] ensure response shape is documented in code comments or route notes

Deliverables:
- [x] admin/public artwork payloads expose multi-series data
- [x] series counts sourced from membership links

## Wave 3 - Admin UX Changes

### Task 6 - Convert Edit artwork series field to multi-select
Status: `Done`

Tasks:
- [x] replace single `Series` select with multi-select/checklist/chip UI in `public/admin/js/edit.js`
- [x] support selecting and removing multiple series in one form
- [x] support setting one primary series (if enabled in model)
- [x] preserve autosave/debounced save behavior
- [x] ensure local state mirrors backend response shape

Deliverables:
- [x] Edit page multi-series selector

### Task 7 - Convert Upload batch series control to multi-select
Status: `Done`

Tasks:
- [x] replace single `Series` dropdown with multi-select in `public/admin/upload.html` and `public/admin/js/upload.js`
- [x] add apply mode options: `No change`, `Append`, `Replace`
- [x] ensure batch metadata preview clearly indicates chosen mode
- [x] keep form/readiness behavior coherent when no series are selected
- [x] verify upload payloads match new backend contract

Deliverables:
- [x] Upload page batch multi-series controls
- [x] upload apply-mode behavior spec implemented

### Task 8 - Update readiness logic for multi-series
Status: `Done`

Tasks:
- [x] update readiness checks in `public/admin/js/artwork-readiness.js`
- [x] treat series requirement as complete when at least one membership exists
- [x] update readiness copy/messages where needed
- [x] verify readiness behavior in Upload and Edit workflows

Deliverables:
- [x] multi-series aware readiness scoring

## Wave 4 - Public Experience Updates

### Task 9 - Update artwork page to show multiple series links
Status: `Done`

Tasks:
- [x] render all linked series on artwork page metadata/context
- [x] update series toolbar/context links for multi-series case
- [x] keep graceful fallback for artworks with no series
- [x] ensure canonical artwork URL behavior remains unchanged

Deliverables:
- [x] artwork page multi-series rendering

### Task 10 - Update related-content logic to use shared memberships
Status: `Done`

Tasks:
- [x] replace single-series matching with overlap-based matching
- [x] prioritize artworks sharing any series membership
- [x] keep stable fallback when no overlap exists
- [x] verify sort behavior still aligns with current recency/curation logic

Deliverables:
- [x] updated "More like this" logic for multi-series

### Task 11 - Update series page membership matching
Status: `Done`

Tasks:
- [x] replace text-based matching with membership-table matching in `public/assets/js/series-page.js`
- [x] verify series detail, counts, and ordered runs still render correctly
- [x] ensure hidden/non-public series rules still apply
- [x] keep compatibility with existing series metadata controls

Deliverables:
- [x] series page backed by explicit series memberships

### Task 12 - Update lightbox series behavior
Status: `Done`

Tasks:
- [x] update lightbox metadata/actions for multi-series artworks in `public/assets/js/content-utils.js`
- [x] display primary series or first linked series in compact contexts
- [x] optionally show `+N more` series indicator where space is limited
- [x] preserve current share/copy/inquiry action behavior

Deliverables:
- [x] lightbox multi-series metadata behavior

## Wave 5 - Validation, Rollout, And Cleanup

### Task 13 - Add automated and manual verification coverage
Status: `Done`

Tasks:
- [x] add backend tests for migration, write validation, and read payload shape
- [x] add frontend tests for admin multi-series selection and persistence
- [x] add public rendering checks for artwork and series pages
- [x] run manual regression checks on upload, edit, series, artwork, and lightbox flows
- [x] verify legacy single-series records still behave correctly during transition

Deliverables:
- [x] multi-series verification checklist
- [x] passing test evidence for critical paths

### Task 14 - Complete phased rollout and compatibility cleanup
Status: `Done`

Tasks:
- [x] release in compatibility mode (dual read/write)
- [x] monitor and resolve migration inconsistencies
- [x] switch fully to membership-table reads after validation window
- [x] deprecate single-series-only assumptions in code paths
- [x] decide final role of legacy `artworks.series` field (derived vs deprecated)

Deliverables:
- [x] rollout completion note
- [x] compatibility cleanup checklist

## Suggested Execution Order

### Phase A
- Task 1 - Finalize data model rules
- Task 2 - Add membership table in backend DB
- Task 3 - Backfill current single-series data

### Phase B
- Task 4 - Add multi-series write support in admin endpoints
- Task 5 - Add multi-series read support in admin/public endpoints

### Phase C
- Task 6 - Convert Edit artwork series field to multi-select
- Task 7 - Convert Upload batch series control to multi-select
- Task 8 - Update readiness logic for multi-series

### Phase D
- Task 9 - Update artwork page to show multiple series links
- Task 10 - Update related-content logic to use shared memberships
- Task 11 - Update series page membership matching
- Task 12 - Update lightbox series behavior

### Phase E
- Task 13 - Add automated and manual verification coverage
- Task 14 - Complete phased rollout and compatibility cleanup

## If Only Three Things Are Tackled First

- Task 2 - Add membership table in backend DB
- Task 4 - Add multi-series write support in admin endpoints
- Task 6 - Convert Edit artwork series field to multi-select
