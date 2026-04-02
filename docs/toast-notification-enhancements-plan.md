# Toast Notification Enhancements Plan

## Goal
Update toast notifications so rapid successive messages are consolidated into one live toast instead of stacking multiple separate popups.

## Desired Behavior
- If no toast is visible, create a new toast normally.
- If a toast is already visible and another toast message is triggered, append the new message into the existing toast window.
- Allow the existing toast window to grow vertically as additional messages are added.
- Reset the auto-close countdown whenever a new message is appended.
- If one or more appended messages has tone `warn` or `error`, disable auto-close for that merged toast.
- Preserve a manual close action so the merged toast can still be dismissed explicitly.

## Scope
Phase 1 covers the shared admin toast path in `public/admin/admin.js`.

Phase 1 includes:
- one active shared admin toast instance
- appended multi-message toast body
- restartable countdown behavior
- warning/error auto-close suppression
- updated merged-toast styling

Phase 1 does not include:
- the contact-page-specific toast implementation in `public/assets/js/contact-page.js`
- a fully extracted shared toast utility for both public and admin pages
- grouped per-message action buttons

## Current State
The current shared admin toast implementation in `public/admin/admin.js`:
- creates a new toast element for every `showToast()` call
- keeps one countdown per toast
- closes each toast independently
- does not merge messages

The contact page has a separate local toast implementation in `public/assets/js/contact-page.js`.

## Phase 1 Design

### 1. Single Active Admin Toast
Keep one active admin toast state in memory.

When `showToast()` is called:
- if no active toast exists, create one
- if an active toast exists, append the new message into it instead of creating another toast

### 2. Message Body Structure
Change the toast body from a single paragraph to a message list.

Recommended structure:
- `.admin-toast__messages`
- one `.admin-toast__entry` per appended message
- newest message appended at the bottom

Each entry should contain:
- message text
- optional tone marker via class for styling

### 3. Tone Escalation
The visible toast shell should reflect the highest severity currently present.

Severity order:
- `error`
- `warn`
- `success`
- `info`

If an appended message has higher severity than the current toast tone, update the toast shell class.

### 4. Auto-Close Rules
Auto-close behavior should be restartable for non-warning/non-error merged toasts.

Rules:
- `info` and `success` messages may auto-close
- when a new `info` or `success` message is appended, reset the countdown timer
- if any merged message is `warn` or `error`, disable auto-close entirely for that toast
- once auto-close is disabled for the active merged toast, it remains disabled until the toast is manually closed

### 5. Countdown Display
Only show the countdown when auto-close is enabled.

If auto-close is disabled because the toast contains a warning or error:
- remove or hide the countdown text
- keep the close button available

### 6. Action Bar Handling
For phase 1, keep action handling simple.

Recommended behavior:
- support the existing close button
- if a new toast call includes custom actions, let the latest toast call define the current action bar
- do not attempt per-message action history inside one merged toast

This keeps the implementation predictable without building a complex stacked action model.

### 7. Message Retention Limit
Prevent the merged toast from becoming a runaway log.

Recommended initial limit:
- keep only the last 6 messages in the merged toast body

If the limit is exceeded:
- drop the oldest visible message entry

### 8. Styling Updates
Update the admin toast CSS so merged messages remain readable.

Recommended additions:
- stacked message container
- subtle separators between message entries
- optional per-entry tone tinting
- support for taller toast content without layout breakage

### 9. Verification
Verify these cases after implementation:
- two rapid success toasts merge into one popup
- each appended success/info toast resets the countdown
- warning appended after success disables auto-close
- error appended after success disables auto-close
- manual close dismisses the whole merged toast
- custom action toasts still render and remain usable

## Phase 2 Implementation
Phase 2 extends the same merged-toast behavior to `public/assets/js/contact-page.js`.

Phase 2 includes:
- one active contact-page toast instance
- appended multi-message toast body
- restartable countdown behavior for `info` and `success`
- warning/error auto-close suppression
- manual close for the merged contact toast
- stacked merged-toast styling on the contact page

Phase 2 intentionally does not yet extract a shared toast helper. The admin and contact page now follow the same behavior model, but remain implemented in their local modules for lower migration risk.
