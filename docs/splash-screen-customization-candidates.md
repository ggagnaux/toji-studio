# Splash Screen Customization Candidates

This document catalogs the current animated splash screens and identifies good candidates for future user-facing customization.

Scope:
- Based on the current splash mode catalog in [public/assets/js/splash-mode-config.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/assets/js/splash-mode-config.js)
- Based on seed/render behavior in [public/assets/js/splash-runtime.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/assets/js/splash-runtime.js)
- This is an analysis/planning document only. No splash customization settings have been implemented yet.

## Shared Customization Categories

Across most splash modes, these setting types would be broadly useful:

- `Primary color` or `palette`
- `Background color` or `background intensity`
- `Animation speed`
- `Element density` or `count`
- `Trail length` / `fade persistence`
- `Glow strength`
- `Element size`
- `Spawn frequency`
- `Label visibility` where text overlays exist

## Per Animation

### 1. Nodes and edges
Current feel:
- Network of moving nodes with connecting lines

Good candidates:
- Node count
- Connection distance threshold
- Node size
- Line opacity
- Line thickness
- Motion speed
- Palette or single accent color
- Background darkness

### 2. Flocking triangles (mouse follow)
Current feel:
- Boids/flocking behavior with triangular agents

Good candidates:
- Boid count
- Triangle size
- Max speed
- Turn strength / cohesion strength
- Mouse attraction strength
- Trail opacity or afterimage amount
- Accent color / palette
- Background darkness

### 3. Outlined circles grid (fill/unfill)
Current feel:
- Grid of circles that pulse and randomly fill/unfill in vivid colors

Good candidates:
- Grid density
- Circle radius
- Outline thickness
- Fill shuffle frequency
- Pulse amount
- Palette choice
- Max fill opacity
- Background brightness

### 4. Matrix digital rain
Current feel:
- Animated glyph rain with color-tinted base tone and direction logic

Good candidates:
- Character set
- Font size
- Drop count
- Drop speed
- Tail length
- Movement direction preset
- Color theme
- Highlight brightness for lead glyphs
- Background darkness

### 5. Conway's Game of Life
Current feel:
- Cellular automata with age-based color variation

Good candidates:
- Cell size
- Simulation speed
- Initial fill density
- Color palette
- Aging color shift strength
- Grid visibility
- Wrap mode on/off
- Random reseed interval

### 6. Random x/y function plot
Current feel:
- Animated parametric/function plot with ghost trails, random colors, and on-screen labels

Good candidates:
- Function family pool
- Complexity level
- Plot line thickness
- Live-path color mode
- Ghost trail count
- Ghost fade speed
- Axis visibility
- Grid visibility
- Formula label visibility
- Function-type label visibility
- Plot speed / time scale

### 7. Bouncing ball + logo deflect
Current feel:
- Balls bounce around and interact with the logo region

Good candidates:
- Ball count
- Ball size range
- Gravity
- Bounce elasticity
- Drag/friction
- Trail persistence
- Palette
- Logo collision strength
- Background darkness

### 8. Turning circles + fade trails
Current feel:
- Colored circles moving on orthogonal turns with long fade trails

Good candidates:
- Circle count
- Circle size range
- Turn frequency
- Movement speed
- Trail length
- Trail fade rate
- Palette
- Glow/highlight strength
- Background darkness

### 9. Asteroids simulation (auto-play)
Current feel:
- Neon asteroids auto-play scene with ship, rocks, and shots

Good candidates:
- Ship color mode / neon palette
- Asteroid spawn rate
- Asteroid size range
- Asteroid speed range
- Shot frequency
- Simulation intensity
- Wrap-around on/off
- Background darkness
- Outline thickness

### 10. Tempest simulation (auto-play)
Current feel:
- Arcade-style Tempest scene

Good candidates:
- Tunnel segment count
- Rotation speed
- Enemy spawn rate
- Shot frequency
- Difficulty/intensity
- Accent color / palette
- Grid brightness
- Background darkness

### 11. Missile Command simulation (auto-play)
Current feel:
- City/base defense scene with enemy missiles and explosions

Good candidates:
- Enemy missile spawn rate
- Defense missile speed
- Explosion size
- Explosion duration
- City count
- Base count
- Difficulty scaling
- Color palette
- Background darkness

### 12. Radar screen sweep
Current feel:
- Circular radar sweep with blips, echoes, and generated radar palette

Good candidates:
- Sweep speed
- Sweep direction
- Blip count
- Blip size range
- Blip spawn frequency
- Echo persistence
- Radar hue / palette lock
- Grid brightness
- Text visibility
- Outer/inner glow intensity

### 13. Mountain night pan
Current feel:
- Large scenic night scene with stars, ranges, cars, birds, UFOs, runners, and events

Good candidates:
- Pan speed
- Star density
- Star twinkle strength
- Mountain layer count
- Mountain jaggedness
- Bird count
- Car count
- UFO spawn frequency
- Shooting star frequency
- Runner count
- Scene brightness / moonlight level
- Overall ?activity level?

### 14. Serpentine sphere sweep
Current feel:
- Sphere-oriented sweeping motion effect

Good candidates:
- Sphere size
- Sweep speed
- Line thickness
- Path density
- Glow strength
- Palette
- Background darkness
- Perspective strength

### 15. Wireframe sphere globe
Current feel:
- Neon wireframe globe with rotating node network, drifting center, star field, and periodic spaceship fly-bys

Good candidates:
- Sphere size
- Rotation speed
- Zoom pulse amount
- Node count
- Connection distance threshold
- Point size
- Line opacity
- Neon color palette or fixed color
- Background star density
- Background star size range
- Background star brightness
- Spaceship enabled on/off
- Spaceship spawn frequency
- Spaceship speed range
- Smoke puff amount

### 16. Pixel title drift
Current feel:
- Responsive square-pixel grid with drifting `TOJI STUDIOS` bitmap

Good candidates:
- Phrase text
- Text scale
- Pixel size
- Pixel gap
- Drift speed
- Reposition interval
- Lit pixel color
- Unlit pixel color
- Background darkness
- Font/bitmap style preset

### 17. Pixel noise shimmer
Current feel:
- Sparse border-only pixel shimmer with random colors, fades, and expirations

Good candidates:
- Pixel size
- Pixel gap
- Active pixel density
- Fade speed
- Maximum active lifetime
- Border thickness
- Random color palette
- Update tick frequency
- Background darkness
- Unlit pixel visibility

### 18. Pixel snake drift
Current feel:
- Snake-like moving path across the pixel grid with fading trail and periodic radial burst effects

Good candidates:
- Pixel size
- Pixel gap
- Snake speed
- Snake max length
- Snake color mode
- Trail fade speed
- Trail brightness
- Explosion enabled on/off
- Explosion frequency
- Explosion ray count
- Explosion radius
- Background darkness

### 19. Black Holes vs Bubbles
Current feel:
- Central orb, bubbles, raiders, black holes, orbit capture, ghost trails, and phase/color changes

Good candidates:
- Bubble spawn rate
- Bubble size range
- Bubble trail length
- Bubble trail brightness
- Black hole count
- Black hole size range
- Black hole drift speed
- Raider spawn frequency
- Raider shot frequency
- Central orb color cycle speed
- Neon palette
- Warp grid brightness
- Scene intensity preset

## Strong Initial Candidates

If customization is added incrementally, these are the best first-wave settings because they are high-impact and easy for users to understand:

- Global splash background brightness
- Per-mode primary color or palette
- Per-mode animation speed
- Per-mode element density/count
- Per-mode trail persistence

Recommended mode-specific first-wave settings:

- `Radar screen sweep`
  - Sweep speed
  - Radar hue
  - Blip density

- `Wireframe sphere globe`
  - Sphere size
  - Rotation speed
  - Neon color
  - Star density
  - Spaceship frequency

- `Random x/y function plot`
  - Complexity level
  - Plot speed
  - Ghost trail count
  - Label visibility

- `Pixel title drift`
  - Phrase text
  - Pixel size
  - Drift speed

- `Pixel noise shimmer`
  - Density
  - Fade speed
  - Color palette

- `Pixel snake drift`
  - Snake speed
  - Trail fade
  - Explosion frequency

- `Mountain night pan`
  - Activity level
  - Star density
  - UFO frequency

## Implementation Notes

When these settings are implemented later, it would be best to organize them in three layers:

1. Global splash settings
- Shared defaults such as background intensity, allowed modes, and randomization behavior

2. Per-mode setting groups
- Only show controls relevant to the currently selected splash mode

3. Presets + advanced controls
- Offer simple presets first
- Keep detailed numeric controls in an expandable advanced section

## Files Likely To Change Later

When this work is implemented, the main files likely involved will be:

- [public/assets/js/splash-mode-config.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/assets/js/splash-mode-config.js)
- [public/assets/js/splash-runtime.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/assets/js/splash-runtime.js)
- [public/admin/js/other-settings.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/admin/js/other-settings.js)
- [public/admin/OtherSettings.html](e:/Sync/Companies/Toji%20Studios/Website/V1/public/admin/OtherSettings.html)
- [public/server/src/db.js](e:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/db.js)
