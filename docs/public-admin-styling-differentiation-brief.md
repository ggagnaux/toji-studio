# Public/Admin Styling Differentiation Brief

Purpose:
- clarify where public and admin styling still feel too related
- define what each side of the product should feel like
- give future implementation work a clear separation rule set

## Desired split

Public should feel:
- atmospheric
- spacious
- editorial
- curated
- immersive
- visitor-facing

Admin should feel:
- denser
- clearer
- operational
- information-efficient
- task-oriented
- maker-facing

## Current shared visual-language audit

### Shared DNA that is currently too strong

Public and admin currently share too much of the same:
- base theme tokens and color relationships
- card/panel styling language
- pill and chip styling
- segmented-control patterns
- sticky hero/page-toolbar treatment
- glassy or gradient-tinted surfaces
- rounded “presentation” controls used in both visitor and admin contexts

This makes the admin feel more atmospheric than necessary and makes the public site feel more system-driven than it should.

## Where admin is too atmospheric

### 1. Admin inherits too much of the public shell mood

The shared site shell establishes a moody, gradient-driven, brand-heavy presentation layer that works for the public site, but it spills into admin.

Effect:
- admin pages can feel like branded scenes rather than workspaces
- visual emphasis is placed on shell atmosphere instead of task clarity

### 2. Admin surfaces use too many decorative gradients and glow-style accents

Across admin views, highlighted states, table shells, cards, selection states, and modal surfaces often use rich gradients, glow-like shadows, and presentation-heavy color mixing.

Effect:
- high-signal UI states compete with one another
- operational actions can feel more ornamental than functional

### 3. Admin controls are often styled like public-facing components

Buttons, pills, floating fields, and segmented controls carry a polished showcase feel that is attractive, but not always optimal for speed and clarity.

Effect:
- interaction patterns read as brand-forward first, utility-first second
- dense tasks like filtering, editing, sorting, and batch actions feel heavier than they need to

### 4. Admin layout framing still borrows exhibition patterns

Sticky heroes, framed cards, rounded panels, and layered page treatments make sense for public storytelling, but in admin they can add ceremony around utilitarian actions.

Effect:
- repetitive publishing work has more visual friction
- the UI feels more like navigating sections of a site than using a tool

## Where public is too operational or system-like

### 1. Public pages still rely heavily on card-and-panel browsing logic

The public site often presents content inside structured system containers that feel closer to dashboard organization than exhibition composition.

Effect:
- visitors are encouraged to browse blocks instead of enter a curated atmosphere
- the work can read as organized inventory rather than staged presentation

### 2. Series page still carries product-navigation energy

The current list/detail structure is strong for clarity, but the interaction pattern still reads partly like a management or browsing interface.

Effect:
- the page succeeds as a navigator, but not yet fully as an exhibition room

### 3. Artwork pages are clear, but still too metadata-forward in feel

Artwork pages prioritize image, facts, tags, and actions in a way that is useful, but still somewhat transactional.

Effect:
- the work can feel documented rather than staged
- the page reads more like a detail sheet than a curated stop in a larger sequence

### 4. Public utility controls share too much language with admin controls

Theme toggles, pills, segmented controls, and certain button treatments feel consistent across the site, but that consistency comes at the cost of distinction.

Effect:
- public interactions feel slightly tool-like
- admin interactions feel slightly brand-like

## Separation rules

### Rule 1 - Public prioritizes atmosphere over interface density

Public pages should:
- use fewer visible control clusters
- allow larger spacing and quieter pacing
- let imagery and sequence carry more of the experience
- reduce overt system framing where possible

### Rule 2 - Admin prioritizes clarity over mood

Admin pages should:
- reduce decorative gradients and ornamental glow
- use flatter, more neutral work surfaces
- emphasize hierarchy through spacing, labeling, and grouping rather than atmosphere
- favor fast scanning over immersive composition

### Rule 3 - Public uses curation language; admin uses workflow language

Public should visually communicate:
- entry points
- highlights
- bodies of work
- narrative sequence
- inquiry and exploration

Admin should visually communicate:
- edit state
- completeness
- status
- sort/order
- visibility
- save/publish confidence

### Rule 4 - Public components can be more sculpted; admin components should be more utilitarian

Public components can support:
- asymmetry
- richer image emphasis
- stronger whitespace
- softer framing
- more expressive hierarchy

Admin components should prefer:
- compact controls
- direct labels
- repeatable structures
- clearer tables/lists/forms
- lower visual drama per action

### Rule 5 - Shared design tokens should diverge at the surface level

It is acceptable to keep some underlying tokens shared for maintainability, but the surface expression should split.

Public should move toward:
- more atmospheric backgrounds
- softer or less system-like containers
- display-oriented typography emphasis
- more restrained utility chrome

Admin should move toward:
- flatter backgrounds
- clearer separators
- more neutral tables/cards/forms
- smaller, more compact interaction elements
- stronger contrast for task states rather than decorative states

## Recommended styling direction by area

### Public

Recommended moves:
- reduce the dashboard feel of list/detail and card grids where possible
- let featured work and series entry points feel more staged and less boxed
- make artwork pages feel more like presentation pages and less like metadata summaries
- keep utility controls present but visually subordinate to content

### Admin

Recommended moves:
- simplify panel surfaces and reduce gradient intensity
- use more restrained selection/highlight treatments
- tighten spacing for repeated actions and controls
- make tables, filters, and edit forms feel faster and more legible
- reserve stronger color emphasis for warnings, completeness, publish state, and destructive actions

## Practical guardrails for future work

When adding or revising a public UI element, ask:
- does this feel like part of an exhibition experience?
- is the interface getting out of the way of the work?
- would this still make sense if the visitor never sees admin?

When adding or revising an admin UI element, ask:
- does this help someone publish faster or more accurately?
- is the visual treatment clearer than it is stylish?
- could any decorative effect be reduced without losing function?

## Summary

The public site and admin tool should not feel like two skins of the same application.

Public should feel authored, atmospheric, and curatorial.
Admin should feel reliable, dense, and operational.

The clearest next step is not a full redesign of either side. It is consistently biasing future public work toward exhibition presentation and future admin work toward information-rich utility.
