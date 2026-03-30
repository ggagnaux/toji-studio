# Admin Session Auth Migration Plan

## Goal

Replace the current browser-stored admin bearer token flow with a server-managed session cookie, so admin users no longer need to paste or carry `ADMIN_TOKEN` in the browser.

## Current State

The current admin authentication model is split across two mechanisms:

- A client-side admin session flag stored in browser session storage.
- A real API authorization check based on `Authorization: Bearer <ADMIN_TOKEN>`.

This means the browser currently stores and reuses the same server secret that protects the admin API.

## Problems With The Current Model

- The browser stores the real admin API secret in `localStorage`.
- Admin users have to manually paste the token into the UI.
- Frontend code is responsible for attaching authorization headers everywhere.
- Any XSS issue would make a browser-stored bearer token especially risky.
- The UX is clunky and easy to misconfigure.

## Recommended Replacement

Use a server-side authenticated session backed by an `HttpOnly` cookie.

### High-level flow

1. Admin user submits credentials to a server login endpoint.
2. Server verifies the credentials.
3. Server creates a session record.
4. Server sends back a signed session cookie.
5. Admin API routes validate that cookie instead of a bearer token.
6. Logout clears the cookie and invalidates the session.

## Recommended Phase 1 Scope

Phase 1 should keep things simple:

- One admin password stored in server environment config.
- Cookie-based session login/logout.
- No pasted token flow in the admin UI.
- Same-origin admin API access only.
- No `dist` sync.

## Server Changes

### 1. Add session endpoints

Add the following endpoints:

- `POST /api/admin/session/login`
- `POST /api/admin/session/logout`
- `GET /api/admin/session/me`

### 2. Add a session store

Start with an in-memory session store.

Each session should track:

- session id
- created time
- expiry time

This is enough for a first pass and can later be replaced by a database-backed store if needed.

### 3. Set a secure cookie

Use a cookie with these properties:

- `HttpOnly`
- `SameSite=Strict`
- `Secure` in production
- bounded expiration / max age
- path scoped to `/`

### 4. Update admin auth middleware

Change the admin auth middleware so it validates the server session cookie instead of looking for `Authorization: Bearer ...`.

That means the current token-based protection should be replaced in the server auth layer.

## Frontend Changes

### 1. Update the login page

The login page should:

- remove the admin token field
- submit credentials to the new login endpoint
- redirect after successful login
- show a clean error when login fails

### 2. Update shared admin request logic

The shared admin fetch helper should:

- stop attaching bearer tokens
- rely on same-origin cookie auth
- continue to handle unauthorized responses centrally

### 3. Remove token UI and token messaging

Remove token-specific UI and guidance from admin pages that currently mention:

- setting a token
- saving a token
- missing token warnings

### 4. Keep session UX clean

The admin frontend should:

- continue redirecting unauthenticated users to login
- support logout cleanly
- handle expired sessions gracefully

## Security Hardening

If we switch to cookies, we should also harden admin write requests.

Recommended protections:

- `SameSite=Strict`
- origin checking on mutating admin routes
- optional CSRF token layer later if needed

Because the admin UI is same-origin, this is a good fit.

## Migration Steps

1. Add a session helper module on the server.
2. Add login/logout/me routes.
3. Change admin auth middleware to cookie-session validation.
4. Update the shared admin fetch helper.
5. Remove token entry from the login page.
6. Remove token storage and token messaging from admin pages.
7. Test login, refresh, logout, unauthorized, and expired-session flows.

## Suggested File Areas

Server:

- `public/server/src/auth.js`
- `public/server/src/server.js`
- `public/server/src/routes/admin.js`
- new session helper module under `public/server/src/`

Frontend:

- `public/admin/login.html`
- `public/admin/js/login.js`
- `public/admin/admin.js`
- admin page scripts that currently depend on `getAdminToken()` or manual `Authorization` headers

## Later Improvements

After Phase 1, we can improve the system further with:

- username + password accounts instead of a single shared password
- hashed credentials in the database
- persistent session storage
- session revocation / session management
- audit logging for admin actions

## Recommendation

Implement Phase 1 first:

- password-only login
- server-managed cookie session
- removal of browser-stored admin bearer tokens

This gives a much better security posture and a simpler admin experience without requiring a large auth system upfront.
