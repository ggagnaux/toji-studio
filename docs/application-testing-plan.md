# Application Testing Plan

## Goal

Establish an automated test foundation for the application that is lightweight, maintainable, and focused on the backend paths most likely to break.

The current testing work is aimed at:

- protecting critical backend behavior before broader coverage work begins
- focusing on high-value logic rather than chasing coverage percentages
- keeping the setup simple enough to grow steadily with the project

## Current Coverage

The current automated coverage in `public/server` now includes:

- admin session handling helpers
- admin auth, including legacy bearer-token fallback
- Bluesky helper normalization and publish failure handling
- LinkedIn helper normalization and publish failure handling
- route-level admin session and protected-route checks for core auth behavior
- data import/export validation and normalization helpers in `public/server/src/routes/admin.js`
- route-level coverage for admin data tables, export, preview, invalid commit flows, and isolated success-path import commit
- upload metadata and filename normalization helpers in `public/server/src/routes/upload.js`
- route-level upload coverage for batch metadata application and duplicate filename skipping
- browser-independent shared utility coverage for query parsing, slugging, and collection sorting in `public/assets/js/content-utils.js`
- protected admin/content-management route coverage for settings, external links, and series
- protected artwork and social-post route coverage for update/delete flows, publish validation failures, and provider-mocked direct publish success/failure paths
- protected AI route coverage with mocked OpenAI responses for success and failure behavior
- browser-side admin helper and controller coverage for login redirect/session utilities, login page init/submit wiring, login form behavior, dashboard row sorting/edit-link/thumb-toggle/select-all helpers, upload session/filter controls, social-platform normalization/form metadata, and edit-screen AI-button/tab-state behavior

This gives the project a working backend and shared-utility test foundation around the most fragile admin access, social publishing, import/export logic, upload behavior, shared content ordering rules, common admin content-management flows, core artwork/social-post operations, direct publish integrations, browser-side admin utilities, controller behavior, early DOM-flow interactions, edit-screen state management, and AI-assisted admin tooling.

## Recommended Approach

Use Node's built-in test runner inside `public/server` as the default backend testing approach.

For the current milestone:

- keep the primary test scope backend-first
- avoid browser-level and E2E tooling
- prefer direct tests of pure helpers and focused route behavior
- expose small, targeted server/helper exports only where they improve testability
- use isolated temporary storage when success-path route tests would otherwise mutate real persisted data
- mock upstream providers at the network boundary when testing AI-assisted or third-party-backed routes

This keeps the testing foundation small, fast, and easy to maintain while still protecting the most important behaviors.

## Implemented Foundation

The backend test foundation now includes:

- an `npm test` script in `public/server/package.json`
- test files under `public/server/test/`
- direct coverage for session and auth helpers
- direct coverage for Bluesky and LinkedIn helper logic
- direct coverage for data import/export parsing, validation, preview summarization, and normalization helpers
- direct coverage for upload filename, tag, and metadata normalization helpers
- direct coverage for browser-independent shared content utilities
- direct coverage for browser-side admin login/session redirect helpers, login controller/page behavior, dashboard row/thumb utility and selection-controller logic, upload controller behavior, social-platform utility logic, and edit-screen controller state
- an exported app factory in `public/server/src/server.js` for route-level test bootstrapping
- route-level tests for:
  - `GET /api/admin/session/me`
  - `POST /api/admin/session/login`
  - `POST /api/admin/session/password` unauthorized behavior
  - protected admin route access with and without a legacy bearer token
  - `GET /api/admin/data/tables`
  - `POST /api/admin/data/export`
  - `POST /api/admin/data/import/preview`
  - invalid-mode, unsupported-table, and validation-failure paths for `POST /api/admin/data/import/commit`
  - successful safe-table import commit in isolated temporary storage, verified by exporting committed rows back out
  - `POST /api/admin/upload` batch metadata application
  - `POST /api/admin/upload` duplicate filename skipping
  - settings persistence for image-variant and contact settings
  - external-links create, update, replace, delete, and validation flows
  - series create, update, list, delete, and invalid/not-found flows
  - artwork patch and delete flows, including file cleanup
  - social-post list, upsert, delete, not-found, publish-validation, and provider-mocked publish success/failure routes
  - AI describe/tag routes for missing-key, missing-image, upstream-error, success, and unusable-response behavior
- browser-side admin helper/controller behavior for safe login redirects, admin login-return URL building, login page init/submit wiring, login submit/session handling, dashboard edit-link generation, thumb-toggle state, select-all click flow, upload session/filter interactions, social-platform icon/tag normalization, row sorting, edit-tab switching, and AI-button enabled/disabled state

## Next Coverage Priorities

The next testing pass should focus on:

- broader frontend/admin DOM-flow tests for the remaining high-value panel interactions now that login, dashboard, upload, social manager, and edit seams are covered
- targeted UI-side coverage for deeper edit flows such as save/publish state transitions and artwork-loading behavior before considering larger browser automation
- additional controller/DOM coverage that can still avoid a full browser harness, especially around social queue and bulk admin actions
- deeper success/error-path coverage for AI-assisted admin flows if those routes continue to evolve
