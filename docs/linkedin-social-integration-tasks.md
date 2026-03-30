# LinkedIn Social Integration Tasks

## Milestone 1: Manual Workflow

- [x] Confirm LinkedIn appears as an allowed platform and is seeded correctly
- [x] Document the LinkedIn workflow and rollout plan
- [x] Add LinkedIn-specific labels and placeholders in Social Media Manager
- [x] Add LinkedIn-oriented compose preview in the artwork social editor
- [x] Add composed-caption character guidance for LinkedIn
- [ ] Add manual posting helper actions:
- [x] Copy final caption
- [x] Copy posting package
- [x] Open public artwork page
- [x] Open artwork image
- [x] Open configured LinkedIn/profile destination
- [x] Support post URL and external post ID entry after manual publishing
- [x] Add LinkedIn URL to external ID extraction where practical
- [x] Verify the social editor still saves and reloads cleanly

## Milestone 1.1: Queue And UX Cleanup

- [x] Extend the social queue/dashboard so LinkedIn posts can be viewed and filtered
- [x] Review helper text and guidance copy for LinkedIn-specific terminology
- [x] Confirm LinkedIn manual mode defaults to `manual`

## Milestone 2: Direct LinkedIn Publishing

- [x] Add a LinkedIn server service module
- [x] Define required auth/config fields for LinkedIn API mode
- [x] Add admin publish endpoint support for LinkedIn artwork social posts
- [x] Add publish button in the artwork editor when LinkedIn is in API mode
- [x] Save returned post URL and external post ID automatically
- [x] Normalize and persist LinkedIn API errors

## Validation And Ops

- [ ] Enforce LinkedIn character guidance before publish
- [ ] Ensure alt text is derived consistently
- [ ] Confirm public artwork URL and image URL are generated correctly
- [ ] Add testing or validation coverage for social post composition logic
