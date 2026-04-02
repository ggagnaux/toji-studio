# Toast Notification Enhancements Tasks

## Phase 1: Shared Admin Toast Merge Behavior

### Planning
- [x] Document the toast enhancement plan in `docs/toast-notification-enhancements-plan.md`
- [x] Create this task list for implementation tracking

### Shared Admin Toast Logic
- [x] Add single active-toast state in `public/admin/admin.js`
- [x] Rework `showToast()` to append new messages into the currently visible toast
- [x] Preserve manual close for the merged toast
- [x] Limit the merged toast message list to the last 6 entries
- [x] Escalate the toast shell tone based on the highest-severity merged message

### Auto-Close Behavior
- [x] Reset the countdown timer when a new `info` or `success` message is appended
- [x] Disable auto-close when one or more merged messages is `warn` or `error`
- [x] Hide or remove countdown UI when auto-close is disabled
- [x] Keep warning/error merged toasts open until manually dismissed

### Action Handling
- [x] Keep the close button available on the merged toast
- [x] Allow the latest toast call to define the current action bar
- [x] Ensure action button callbacks still work after merging

### Styling
- [x] Add stacked message styling for merged toasts
- [x] Add separators or spacing between merged message entries
- [x] Ensure taller merged toasts remain readable and stable
- [x] Preserve existing tone styling for info, success, warn, and error

### Verification
- [x] Verify two rapid success toasts merge into one toast
- [x] Verify merged success/info toasts reset the countdown
- [x] Verify a warning disables auto-close for the merged toast
- [x] Verify an error disables auto-close for the merged toast
- [x] Verify manual close dismisses the merged toast
- [x] Verify custom action toasts still function after merge updates

## Phase 2: Public / Contact Toast Follow-Up
- [x] Review `public/assets/js/contact-page.js`
- [x] Decide to mirror the merged-toast behavior there for now instead of extracting a shared helper
- [x] Implement the chosen public toast path after phase 1 is stable

## Later Follow-Up
- [x] Consider extracting the admin and contact merged-toast implementations into one shared helper
- [x] Browser-verify merged toast behavior on the contact page
- [x] Browser-verify merged toast behavior on the admin pages
