# Multi-Series Artwork Migration Verification Checklist

Use this checklist to validate Task 3 migration behavior after introducing `artwork_series` backfill.

## Preconditions

- [ ] server starts successfully with the updated DB bootstrap
- [ ] `artwork_series` table exists in SQLite
- [ ] unique constraint on `(artworkId, seriesSlug)` is present
- [ ] indexes for `artworkId` and `seriesSlug` are present

## Backfill Behavior

- [ ] artworks with a non-empty legacy `artworks.series` value are evaluated during startup
- [ ] a valid resolved series creates one membership row
- [ ] inserted rows set `isPrimary = 1` and `sortOrder = 0`
- [ ] timestamps are populated for inserted rows
- [ ] duplicate rows are not created when server restarts

## Idempotency Checks

- [ ] run server bootstrap once and record inserted count from log
- [ ] run server bootstrap a second time without data changes
- [ ] verify second run reports `inserted = 0` for already migrated rows
- [ ] verify membership row count remains unchanged after repeat run

## Skip/Unknown-Series Checks

- [ ] artworks whose legacy series does not map to a known series are skipped
- [ ] skipped counts are reported in backfill summary log
- [ ] sample skipped rows are logged (`artworkId => legacySeries`)
- [ ] skipped rows do not block migration of valid rows

## Safety Checks

- [ ] migration does not delete or mutate legacy `artworks.series`
- [ ] migration handles empty legacy dataset with no errors
- [ ] migration handles read-only sqlite gracefully (skip write with warning)
- [ ] migration does not fail startup when no valid rows are found

## Spot Verification Queries

Suggested manual checks in SQLite:

- [ ] membership count by series slug
- [ ] membership rows for a known artwork id
- [ ] rows where `isPrimary != 1` (should be 0 in v1 backfill inserts)
- [ ] duplicate detection query on `(artworkId, seriesSlug)` (should return none)

## Exit Criteria

- [ ] no startup errors in migration path
- [ ] valid legacy rows are migrated exactly once
- [ ] unknown legacy values are skipped and surfaced in logs
- [ ] data remains consistent after repeated restarts
