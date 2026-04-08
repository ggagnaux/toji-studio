# Toji Studios Website Cleanup Tasks

This task list converts the requested website cleanup items into trackable implementation work.

Purpose:
- turn the cleanup notes into executable tasks
- group related public and admin fixes into practical phases
- keep implementation tracking separate from code changes

Status legend:
- `Pending`
- `In Progress`
- `Done`
- `Deferred`

## Phase 1 - Public Interface Cleanup

### Task 1 - Update the site version to 1.0.0
Status: `Pending`

Tasks:
- [ ] locate the current version string used across the public and admin experience
- [ ] update the displayed version number to `1.0.0`
- [ ] verify no stale version string remains in visible UI or supporting metadata

Deliverables:
- [ ] site version updated to `1.0.0`

### Task 2 - Reposition the animated splashscreen title
Status: `Done`

Tasks:
- [x] review the graphing animated splashscreen layout rules
- [x] move the title to the top-center of the viewport
- [x] move the `Random x/y function plot` function-name badge from the top-left to the top-center position
- [x] verify the title remains correctly placed across desktop and mobile sizes

Deliverables:
- [x] splashscreen title aligned to the top-center of the viewport

### Task 3 - Remove obsolete archive filter status text from Gallery
Status: `Done`

Tasks:
- [x] locate the archive subsection that still renders the retired filter status copy
- [x] remove the section that states `Showing tags starting with the following: 'A'`
- [x] remove the section that states `Showing images containing the following tags: 'abstract' and 'advertising' ...`
- [x] verify the replacement cleaner section is the only active archive status block

Deliverables:
- [x] obsolete archive filter status section removed from Gallery

### Task 4 - Restore default typography for the Series list
Status: `In Progress`

Tasks:
- [x] review typography rules for the public `All Series` list
- [x] reduce the title font size slightly
- [x] change the title and related text back to the default site font
- [x] verify the adjusted typography still preserves hierarchy and readability

Deliverables:
- [s] updated `All Series` list typography

## Phase 2 - Admin Navigation And Image Manager Cleanup

### Task 5 - Normalize admin root routing to index.html
Status: `Done`

Tasks:
- [x] review how the admin landing route resolves when visiting `/public/admin`
- [x] ensure the default route explicitly resolves to `index.html`
- [x] verify the `Image Manager` menu item is highlighted correctly on direct entry

Deliverables:
- [x] admin root entry consistently resolves to `index.html`

### Task 6 - Improve thumbnail interaction in Image Manager
Status: `Done`

Tasks:
- [x] update thumbnail view selection behavior so the full thumbnail icon can be clicked to select or deselect
- [x] add a hover-visible edit shortcut icon for each thumbnail
- [x] wire the hover edit shortcut to open the Edit page for the selected item
- [x] make selected thumbnail highlighting more prominent
- [x] restore the default border around unselected thumbnails

Deliverables:
- [x] full-thumbnail selection behavior in thumbnail view
- [x] hover edit shortcut for thumbnails
- [x] clearer selected and unselected thumbnail states

### Task 7 - Tighten Series Manager edit and artwork controls
Status: `Done`

Tasks:
- [x] restyle the `Details` and `Images` tabs in the edit panel so they match other site tabs
- [x] add clearer reorder affordance or instructional text in the edit panel `Images` tab
- [x] reduce the orange border intensity on selected thumbnails in `Manage Series Artwork`
- [x] change the `Include`, `Exclude`, and `Select None/Select All` buttons to the standard admin font

Deliverables:
- [x] consistent Series Manager tab styling
- [x] clearer image reordering cues
- [x] corrected artwork selection and action button styling

## Phase 3 - Admin Form And Control Styling Cleanup

### Task 8 - Standardize Link Manager typography
Status: `Done`

Tasks:
- [x] change the `Add Link` and `Remove` buttons to the standard admin font
- [x] update Link Manager edit boxes and dropdown controls to the standard admin font
- [x] verify typography consistency across the full Link Manager form

Deliverables:
- [x] Link Manager buttons and inputs using the standard font

### Task 9 - Update homepage section visibility copy
Status: `Done`

Tasks:
- [x] locate the current description text for homepage section visibility
- [x] replace it with `Show or hide different sections on the primary landing page.`
- [x] verify the updated description renders correctly in context

Deliverables:
- [x] revised homepage section visibility description

### Task 10 - Clean up Social Media Manager controls
Status: `Pending`

Tasks:
- [ ] change the `Add Platform` and `Delete` buttons to the standard admin font
- [ ] remove the `Auto-save enabled` text next to the `Delete` button
- [ ] verify the action row spacing still works after removing the text

Deliverables:
- [ ] Social Media Manager action row using consistent typography without the retired helper text

### Task 11 - Fix Social Queue dropdown and button styling
Status: `Done`

Tasks:
- [x] correct dropdown styling so text remains readable against the control background
- [x] standardize button fonts with the rest of the admin UI
- [x] verify all Social Queue controls remain legible in the supported themes

Deliverables:
- [x] readable Social Queue dropdown styling
- [x] consistent Social Queue button typography

### Task 12 - Standardize Other Settings tabs and spacing
Status: `Done`

Tasks:
- [x] restyle all Other Settings tabs so they match tab patterns used on other admin pages
- [x] add more vertical space between the `Active animation` label and dropdown control in the Splash tab
- [x] correct the `Active animation` dropdown styling in the Splash tab
- [x] add more vertical space for the `Change interval (seconds)` control in the Splash tab
- [x] correct the Banner Logo tab dropdown styling
- [x] add more vertical space for floating-label controls in the Banner Logo tab
- [x] add more vertical space for the `Tag cap per artwork` control in the AI Integration tab
- [x] add more vertical space around Image Variants controls
- [x] change Image Variants buttons to the standard admin font
- [x] remove the `Loaded from backend.` label in Image Variants
- [x] add more vertical space in the Contact tab edit box control

Deliverables:
- [x] consistent Other Settings tab styling
- [x] corrected spacing and control styling across Splash, Banner Logo, AI Integration, Image Variants, and Contact tabs

### Task 13 - Standardize Data Manager tabs and import button state
Status: `Done`

Tasks:
- [x] restyle all Data Manager tabs so they match tab patterns used on other admin pages
- [x] add logic to disable `Import selected safe tables` when no file has been selected
- [x] verify the button enables correctly after a valid file is chosen

Deliverables:
- [x] consistent Data Manager tab styling
- [x] disabled-until-valid import button behavior

## Suggested Execution Order

### First Pass
- Task 1 - Update the site version to 1.0.0
- Task 5 - Normalize admin root routing to index.html
- Task 6 - Improve thumbnail interaction in Image Manager
- Task 12 - Standardize Other Settings tabs and spacing

### Second Pass
- Task 2 - Reposition the animated splashscreen title
- Task 3 - Remove obsolete archive filter status text from Gallery
- Task 4 - Restore default typography for the Series list
- Task 7 - Tighten Series Manager edit and artwork controls
- Task 13 - Standardize Data Manager tabs and import button state

### Final Polish
- Task 8 - Standardize Link Manager typography
- Task 9 - Update homepage section visibility copy
- Task 10 - Clean up Social Media Manager controls
- Task 11 - Fix Social Queue dropdown and button styling