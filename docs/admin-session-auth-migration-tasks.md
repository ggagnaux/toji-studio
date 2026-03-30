# Admin Session Auth Migration Tasks

## Milestone 1: Server Session Foundation

- [x] Add a server-side session helper module.
- [x] Generate secure session ids.
- [x] Store active sessions in memory.
- [x] Track session creation and expiry timestamps.
- [x] Add helper methods for create, read, validate, and destroy session records.

## Milestone 2: Session Endpoints

- [x] Add `POST /api/admin/session/login`.
- [x] Validate submitted admin credentials against server configuration.
- [x] Set an `HttpOnly` session cookie on successful login.
- [x] Add `POST /api/admin/session/logout`.
- [x] Clear the session cookie and invalidate the server session on logout.
- [x] Add `GET /api/admin/session/me` for session status checks.

## Milestone 3: Replace Token-Based Middleware

- [x] Update `requireAdmin()` to validate the admin session cookie.
- [ ] Remove dependency on `Authorization: Bearer <ADMIN_TOKEN>` for admin API access.
- [x] Preserve good unauthorized responses for expired or invalid sessions.
- [x] Keep logs useful without leaking sensitive auth material.

## Milestone 4: Frontend Login Migration

- [x] Remove the token field from the admin login page.
- [x] Update the login form to call the new login endpoint.
- [x] Preserve redirect-after-login behavior.
- [x] Show clean invalid-login feedback.
- [x] Update logout to call the logout endpoint.

## Milestone 5: Shared Admin Fetch Migration

- [x] Update shared admin fetch logic to rely on same-origin cookie auth.
- [ ] Remove bearer token injection from admin requests.
- [x] Handle `401 Unauthorized` responses centrally.
- [x] Keep admin redirect behavior predictable when a session expires.

## Milestone 6: Remove Token UX From Admin Pages

- [ ] Remove token storage helpers no longer needed in admin frontend code.
- [x] Remove token-related guidance from login and upload pages.
- [ ] Remove missing-token warnings from admin tools.
- [x] Replace token-specific messaging with session/auth messaging where needed.

## Milestone 7: Security Hardening

- [x] Set cookie options appropriately for local and production environments.
- [ ] Add origin checks for admin mutating requests.
- [ ] Review admin routes for cross-site request risks.
- [x] Ensure logout invalidates the server session fully.

## Milestone 8: Verification

- [ ] Verify login succeeds with correct credentials.
- [ ] Verify login fails with incorrect credentials.
- [ ] Verify page refresh keeps the admin session active.
- [ ] Verify logout removes access to admin APIs.
- [ ] Verify expired or invalid sessions redirect back to login.
- [ ] Verify admin pages continue working without any pasted token flow.

## Deferred / Later Improvements

- [ ] Replace shared password auth with user accounts.
- [ ] Store password hashes instead of plain environment-based password comparisons.
- [ ] Move sessions to persistent storage if needed.
- [ ] Add admin audit logging.
- [ ] Add explicit CSRF token support if we want stronger defense-in-depth.

