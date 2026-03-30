# Bluesky Social Integration Plan

## Goal

Make Bluesky the first fully supported social platform in the studio admin so artwork posts can be prepared, tracked, and eventually published directly from the CMS.

## Current Foundation

The repo already contains the main pieces needed to build on:

- Platform configuration lives in `public/server/src/config/social-platforms.js`
- Platform CRUD exists in `public/server/src/routes/admin.js`
- Artwork-level social post records exist in `artwork_social_posts`
- The artwork editor already supports binding a platform and saving caption/status metadata in `public/admin/js/edit.js`
- The Social Media Manager UI already exists in `public/admin/js/social-media-manager.js`

This means the work is mostly about finishing the workflow, not starting from zero.

## Recommended Product Shape

For Bluesky, v1 should support:

- enabling or disabling Bluesky in admin
- storing Bluesky platform settings and credentials
- binding an artwork to Bluesky
- editing a Bluesky-specific caption per artwork
- tracking post status: `draft`, `queued`, `posted`, `failed`, `skipped`
- storing the live post URL and external post ID
- supporting a polished manual posting workflow first

After that, we can layer on direct API publishing.

## Data Model

Two tables should remain the main contract:

### `social_platforms`

Stores platform-level configuration and secrets.

Suggested Bluesky config fields:

- `postingMode`: `manual`, `api`, later optionally `webhook`
- `accountHandle`
- `profileUrl`
- `defaultHashtags`
- `defaultCaptionSuffix`
- `notes`

Suggested Bluesky auth fields:

- `identifier`
- `appPassword`
- optional cached access token / refresh token later if needed

### `artwork_social_posts`

Stores one row per artwork per platform.

Expected fields already fit the use case:

- `status`
- `caption`
- `postUrl`
- `externalPostId`
- `payload`
- `errorMessage`
- `postedAt`

## Bluesky Posting Payload

Each bound Bluesky post should be able to produce:

- final caption text
- artwork title
- public artwork URL
- image URL
- alt text
- hashtags
- status metadata

The final caption should be composed from:

1. platform-specific caption
2. optional default caption suffix
3. optional default hashtags

We should also enforce Bluesky character guidance in the editor before posting.

## Milestone 1: Manual Posting Workflow

This milestone is the fastest path to a usable system.

### Admin platform setup

In Social Media Manager:

- configure Bluesky as an enabled platform
- save handle/profile URL/default hashtags/default suffix
- keep posting mode set to `manual` by default

### Artwork editor workflow

In the artwork editor:

- bind Bluesky to an artwork
- edit the artwork-specific caption
- preview the final composed post
- show a Bluesky character count / warning
- provide manual helpers:
  - copy final caption
  - copy a posting package
  - open the public artwork page
  - open the artwork image
  - open Bluesky/profile destination when configured
- let the admin save the final Bluesky post URL and external post ID

### Outcome

At the end of Milestone 1, the CMS should work as a reliable internal posting companion even without API automation.

## Milestone 2: Direct Bluesky Publishing

After manual mode is stable, add a server-side Bluesky adapter:

- authenticate with Bluesky
- upload the artwork image
- create the post
- store canonical post URL
- store external post ID
- normalize and save failures into `errorMessage`

Suggested service path:

- `public/server/src/services/social/bluesky.js`

Suggested admin route:

- `POST /api/admin/artworks/:id/social-posts/:platformId/publish`

This route should only allow publish when:

- `platformId === "bluesky"`
- the platform is enabled
- posting mode is `api`
- required auth fields are present

## Recommended Delivery Order

1. finish the Bluesky manual workflow
2. tighten validation on caption length and required fields
3. improve Social Media Manager copy and Bluesky guidance
4. add direct Bluesky publishing
5. add queue/failed dashboard views later

## Recommended v1 Deliverable

The first usable Bluesky release should include:

- configurable Bluesky platform settings
- artwork-to-Bluesky binding
- caption composition and preview
- manual posting helpers
- post URL and status tracking

That will make the integration operational immediately while keeping the path open for one-click publishing later.
