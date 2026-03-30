# Data Import / Export Plan

## Goal
Build out `admin/DataManager.html` into a safe data operations console that supports selective database export and limited, validated import.

## Scope Decisions

### Export
Allow export of all database tables.

Supported export tables:
- `artworks`
- `variants`
- `settings`
- `series`
- `social_platforms`
- `external_links`
- `artwork_social_posts`

### Import
For v1, allow import only for the safe / straightforward tables.

Supported import tables:
- `settings`
- `social_platforms`
- `external_links`

Not importable in v1:
- `artworks`
- `variants`
- `series`
- `artwork_social_posts`

Reason:
These tables have stronger relational and media-file dependencies, so importing them safely needs additional validation and ordering logic.

## Product Shape
In `Data Manager`, support:
- exporting one table
- exporting multiple selected tables
- exporting all tables
- exporting as one combined JSON file
- later exporting as separate JSON files or a zip archive
- importing validated JSON data into the allowed import tables
- previewing import contents before commit

## Recommended v1 Milestone
Ship the following first:
- table checklist for export
- `Export selected` action
- export all tables in one bundled JSON file
- import file picker
- import preview
- import commit for safe tables only
- `upsert` import behavior only

## Current Database Tables
From `public/server/src/db.js`, the current tables are:
- `artworks`
- `variants`
- `settings`
- `series`
- `social_platforms`
- `external_links`
- `artwork_social_posts`

## Data Safety Model

### Safe / straightforward
These are allowed for import in v1:
- `settings`
- `social_platforms`
- `external_links`

### Export-only in v1
These can be exported but not imported yet:
- `artworks`
- `variants`
- `series`
- `artwork_social_posts`

## Backend Plan
Add new admin data endpoints in `public/server/src/routes/admin.js`.

### 1. `GET /admin/data/tables`
Return metadata for all supported tables, including:
- table name
- label
- row count
- export support
- import support
- import notes

### 2. `POST /admin/data/export`
Request body:
- `tables: string[]`
- `mode: "bundle"`

Behavior:
- validate requested table names
- export only the requested tables
- return one JSON bundle containing the selected tables

### 3. `POST /admin/data/import/preview`
Accept a bundled export JSON file.

Return:
- detected tables
- row counts
- unsupported import tables
- validation errors
- warnings
- importable tables

### 4. `POST /admin/data/import/commit`
Request body:
- parsed import payload
- selected import tables
- `mode: "upsert"`

Behavior:
- only allow `settings`, `social_platforms`, and `external_links`
- validate row structure
- upsert rows in a transaction
- return inserted / updated / skipped / failed counts

## Import Rules
Use table-aware upsert rules:
- `settings`: upsert by `key`
- `social_platforms`: upsert by `id`
- `external_links`: upsert by `id`

Reject import attempts for unsupported v1 tables:
- `artworks`
- `variants`
- `series`
- `artwork_social_posts`

## Frontend Plan
Turn `admin/DataManager.html` into two sections.

### Data Export
Show:
- checklist of all tables
- row counts beside each table
- `Select all` / `Clear all`
- `Export selected` button

### Data Import
Show:
- file picker
- preview summary
- detected tables
- importability status per table
- warnings for unsupported tables
- `Import selected safe tables` button

## Export File Format
Use one bundled JSON format.

```json
{
  "format": "toji-data-export",
  "version": 1,
  "exportedAt": "2026-03-23T23:33:21.793Z",
  "tables": {
    "artworks": [],
    "series": []
  }
}
```

## Validation Rules
Before import:
- reject malformed JSON
- reject unknown table names
- reject non-array table payloads
- reject unsupported import tables for commit
- validate required keys per supported table
- surface warnings when the file contains export-only tables

## Safety Features
Recommended guardrails:
- import preview before commit
- transaction rollback on failure
- explicit summary after import
- later automatic backup before import

## Implementation Order
1. Add `GET /admin/data/tables`
2. Add selective bundled export endpoint
3. Build export UI in `Data Manager`
4. Add import preview endpoint
5. Build import preview UI
6. Add import commit endpoint for safe tables only
7. Add result reporting and error summaries

## Recommendation
Start with selective export plus safe-table import.

That gives `Data Manager` immediate operational value while avoiding the higher-risk import paths for artwork/media-linked tables.


