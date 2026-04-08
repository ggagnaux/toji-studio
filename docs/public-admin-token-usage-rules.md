# Public/Admin Token Usage Rules

Purpose:
- define which visual tokens remain shared
- define which token expressions should diverge between public and admin
- reduce future one-off overrides by establishing default usage rules

Scope:
- current implementation state after Phase A and Phase B
- primary source files include `public/assets/css/site.css`, `public/assets/css/index.css`, `public/assets/css/series.css`, `public/assets/css/artwork.css`, `public/admin/css/index.css`, `public/admin/css/upload.css`, and `public/admin/css/OtherSettings.css`

## Shared foundation tokens

These should remain shared unless a strong maintenance or UX reason appears:
- `--bg`
- `--panel`
- `--text`
- `--muted`
- `--line`
- `--accent`
- `--accent-soft`
- `--accent-border`
- `--focus-ring`
- `--hover-line`
- `--chip-bg`
- `--chip-border`
- `--thumb-bg`
- `--radius`
- `--shadow`

Reason:
- these preserve theme consistency across light/dark mode
- they keep public/admin recognizably part of one product
- they reduce duplicated theme infrastructure

## Split surface tokens

These are the current experience-level split tokens introduced in `public/assets/css/site.css`:
- `--surface-public`
- `--surface-public-strong`
- `--surface-admin`
- `--surface-admin-muted`

Recommended usage:
- `--surface-public`
  Use for light public shell framing where content should remain dominant.
- `--surface-public-strong`
  Use for slightly stronger public containers like toolbar shells when a surface is needed but should still feel quiet.
- `--surface-admin`
  Use for admin cards, panels, tables, and control group surfaces that should feel flat and dependable.
- `--surface-admin-muted`
  Use for secondary admin zones, lower-priority framing, or subdued support regions.

## Public token usage rules

Public should bias toward:
- `var(--bg)` and transparent layering as the first surface choice
- `--surface-public` or `color-mix` values derived from `var(--panel)` only when a section needs structure
- `var(--accent)` for subtle hierarchy, not constant interaction emphasis
- lighter border presence using `color-mix(in srgb, var(--line) X%, transparent)`
- `--chip-bg` and `--chip-border` only for supportive metadata, not dominant navigation

Public should avoid by default:
- dense repeated `var(--panel)` card stacks
- heavy gradient/table-shell treatments
- strong active states on every utility control
- using status-like colors unless the content truly communicates status

Public pattern guidance:
- hero and section framing should feel open first, boxed second
- image containers may be sculpted or atmospheric
- metadata should support the artwork or series rather than define the whole page
- buttons and pills should remain quieter than imagery and headings

## Admin token usage rules

Admin should bias toward:
- `--surface-admin` for cards, controls, filter bars, and utility shells
- `--surface-admin-muted` for lower-priority support framing
- higher-clarity borders using stronger `var(--line)` mixes
- smaller controls and denser spacing before adding more color emphasis
- `var(--accent-soft)` and `var(--accent-border)` for functional active states only

Admin should avoid by default:
- theatrical gradients on everyday panels
- shadow-heavy elevation for routine controls
- oversized pills, chips, or segmented controls
- atmospheric image-led framing patterns borrowed from public pages

Admin pattern guidance:
- status, completeness, destructive actions, and publish visibility may use stronger contrast
- repeated controls should be compact and uniform
- tables and forms should read as work surfaces, not showcases
- grouping and labels should carry hierarchy more than decorative framing does

## Guardrails for future work

When adding shared CSS in `site.css`:
- only keep a rule shared if both public and admin benefit from the same expression
- if the rule changes surface mood, spacing density, or control weight, prefer an experience-specific override
- introduce a public/admin surface token before copying large selector overrides repeatedly

When adding public page styles:
- prefer transparent or lightly mixed surfaces over full panel blocks
- let artwork, series covers, and spacing create hierarchy first
- use expressive layout before increasing chrome

When adding admin page styles:
- prefer flatter backgrounds and clearer separators over mood-heavy gradients
- solve readability with spacing, sizing, and labeling first
- reserve bold visual emphasis for task-critical states

## Current interpretation of the split

Public currently means:
- quieter shells
- less panel framing
- stronger image presentation
- more editorial hierarchy

Admin currently means:
- flatter surfaces
- tighter controls
- more uniform utility components
- lower decorative intensity

## Future recommendation

If Phase D or later styling work happens, the next improvement should be converting more of the public/admin split from selector-level overrides into named experience tokens, especially for:
- section framing
- card density
- control sizing
- muted text levels
- table and panel separators