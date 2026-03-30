# Data Import / Export Tasks

## Milestone 1: Selective Export + Safe Import

### Backend
- [x] Add `GET /api/admin/data/tables` in `public/server/src/routes/admin.js`
- [x] Return metadata for every supported table
- [x] Include row counts for each table
- [x] Mark export support for all tables
- [x] Mark import support only for `settings`, `social_platforms`, and `external_links`

- [x] Add `POST /api/admin/data/export`
- [x] Validate requested table names
- [x] Export only the selected tables
- [x] Return one bundled JSON file
- [x] Include export metadata: format, version, exported time, selected tables

- [x] Add `POST /api/admin/data/import/preview`
- [x] Accept bundled export JSON input
- [x] Detect included tables
- [x] Count rows per table
- [x] Flag unsupported import tables
- [x] Validate payload structure for supported tables
- [x] Return warnings and validation errors clearly

- [x] Add `POST /api/admin/data/import/commit`
- [x] Restrict commit to safe tables only
- [x] Support `upsert` mode only in v1
- [x] Import `settings` by `key`


- [x] Import `social_platforms` by `id`
- [x] Import `external_links` by `id`
- [x] Wrap import in a transaction
- [x] Return inserted / updated / skipped / failed counts

### Frontend
- [x] Expand `public/admin/DataManager.html` into export and import sections
- [x] Show all database tables in the export checklist
- [x] Add `Select all` and `Clear all` controls
- [x] Add row-count display per table
- [x] Add `Export selected` button
- [x] Add export status messaging

- [x] Add import file picker to `Data Manager`
- [x] Add import preview panel
- [x] Show detected tables and row counts
- [x] Show which tables are importable in v1
- [x] Show warnings for export-only tables
- [x] Add `Import selected safe tables` button
- [x] Add import result summary UI

- [x] Create or expand `public/admin/js/data-manager.js`
- [x] Load table metadata from backend
- [x] Submit selected export requests
- [x] Handle bundled JSON download
- [x] Upload JSON for preview
- [x] Submit confirmed import request
- [x] Render success and error states cleanly

### Validation
- [x] Reject malformed JSON input
- [x] Reject unknown table names
- [x] Reject non-array table payloads
- [x] Reject commit attempts for unsupported tables
- [x] Validate required keys for supported import tables
- [x] Keep clear user-facing error messages for preview and commit

### Verification
- [ ] Verify export works for one selected table
- [ ] Verify export works for multiple selected tables
- [ ] Verify export works for all tables
- [ ] Verify preview warns when file includes non-importable tables
- [ ] Verify import upserts `settings`


- [ ] Verify import upserts `social_platforms`
- [ ] Verify import upserts `external_links`
- [ ] Verify import rollback on failure

## Later Enhancements
- [ ] Add export as separate JSON files or zip
- [ ] Add automatic backup before import
- [ ] Add replace mode for safe tables
- [ ] Add import support for `artworks`
- [ ] Add import support for `artwork_social_posts`
- [ ] Add guarded import support for `variants`
- [ ] Add dry-run mode with detailed diff summary


