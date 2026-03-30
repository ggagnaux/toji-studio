# LinkedIn Social Integration Plan

## Goal

Make LinkedIn a fully supported social platform in the studio admin so artwork posts can be prepared, tracked, and eventually published directly from the CMS.

## Current Foundation

The repo already contains the main pieces needed to build on:

- Platform configuration lives in `public/server/src/config/social-platforms.js`
- Platform CRUD exists in `public/server/src/routes/admin.js`
- Artwork-level social post records exist in `artwork_social_posts`
- The artwork editor already supports binding a platform and saving caption/status metadata in `public/admin/js/edit.js`
- The Social Media Manager UI already exists in `public/admin/js/social-media-manager.js`

This means the work is mostly about finishing the workflow, not starting from zero.

## Recommended Product Shape

For LinkedIn, v1 should support:

- enabling or disabling LinkedIn in admin
- storing LinkedIn platform settings and credentials
- binding an artwork to LinkedIn
- editing a LinkedIn-specific caption per artwork
- tracking post status: `draft`, `queued`, `posted`, `failed`, `skipped`
- storing the live post URL and external post ID
- supporting a polished manual posting workflow first

After that, we can layer on direct API publishing.

## Data Model

Two tables should remain the main contract:

### `social_platforms`

Stores platform-level configuration and secrets.

Suggested LinkedIn config fields:

- `postingMode`: `manual`, `api`, later optionally `webhook`
- `accountHandle`
- `profileUrl`
- `defaultHashtags`
- `defaultCaptionSuffix`
- `notes`
- `accountId`

Suggested LinkedIn auth fields:

- `clientId`
- `clientSecret`
- `accessToken`
- `refreshToken`
- optional `identifier` for admin/operator reference

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

## LinkedIn Posting Payload

Each bound LinkedIn post should be able to produce:

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

We should also enforce LinkedIn character guidance in the editor before posting.

## Milestone 1: Manual Posting Workflow

This milestone is the fastest path to a usable system.

### Admin platform setup

In Social Media Manager:

- configure LinkedIn as an enabled platform
- save company/profile URL, organization/account ID, default hashtags, and default suffix
- keep posting mode set to `manual` by default
- use LinkedIn-specific labels and placeholders for the detail and security fields

### Artwork editor workflow

In the artwork editor:

- bind LinkedIn to an artwork
- edit the artwork-specific caption
- preview the final composed post
- show LinkedIn character guidance
- provide manual helpers:
  - copy final caption
  - copy a posting package
  - open the public artwork page
  - open the artwork image
  - open LinkedIn/profile destination when configured
- let the admin save the final LinkedIn post URL and external post ID
- support LinkedIn URL to external ID extraction where possible

### Queue and operational view

The social queue should be extended so LinkedIn posts are visible and filterable alongside Bluesky posts.

### Outcome

At the end of Milestone 1, the CMS should work as a reliable internal LinkedIn posting companion even without API automation.

## Milestone 2: Direct LinkedIn Publishing

After manual mode is stable, add a server-side LinkedIn adapter:

- authenticate with LinkedIn
- register/upload the artwork media
- create the post
- store canonical post URL
- store external post ID
- normalize and save failures into `errorMessage`

Suggested service path:

- `public/server/src/services/social/linkedin.js`

Suggested admin route:

- `POST /api/admin/artworks/:id/social-posts/:platformId/publish`

This route should only allow publish when:

- `platformId === "linkedin"`
- the platform is enabled
- posting mode is `api`
- required auth fields are present

## Recommended Delivery Order

1. tune LinkedIn-specific labels and placeholders in Social Media Manager
2. finish the LinkedIn manual workflow in the artwork editor
3. add LinkedIn external ID extraction and tracking polish
4. extend the queue/dashboard for LinkedIn visibility
5. add direct LinkedIn publishing

## Recommended v1 Deliverable

The first usable LinkedIn release should include:

- configurable LinkedIn platform settings
- artwork-to-LinkedIn binding
- caption composition and preview
- manual posting helpers
- post URL and status tracking

That will make the integration operational immediately while keeping the path open for one-click publishing later.
