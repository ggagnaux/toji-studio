export const SPLASH_MODE_CATALOG = Object.freeze([
  { id: "tojistudios", label: "Tojistudios dot chase" },
  { id: "nodes", label: "Nodes and edges" },
  { id: "flock", label: "Flocking triangles (mouse follow)" },
  { id: "circles", label: "Outlined circles grid (fill/unfill)" },
  { id: "matrix", label: "Matrix digital rain" },
  { id: "life", label: "Conway's Game of Life" },
  { id: "plot", label: "Random x/y function plot" },
  { id: "bounce", label: "Bouncing ball + logo deflect" },
  { id: "turningcircles", label: "Turning circles + fade trails" },
  { id: "asteroids", label: "Asteroids simulation (auto-play)" },
  { id: "tempest", label: "Tempest simulation (auto-play)" },
  { id: "missilecommand", label: "Missile Command simulation (auto-play)" },
  { id: "radar", label: "Radar screen sweep" },
  { id: "mountains", label: "Mountain night pan" },
  { id: "serpentinesphere", label: "Serpentine sphere sweep" },
  { id: "orbitalbeams", label: "Black Holes vs Bubbles" }
]);

export const SPLASH_MODE_IDS = Object.freeze(SPLASH_MODE_CATALOG.map((mode) => mode.id));
export const DEFAULT_ALLOWED_SPLASH_MODES = Object.freeze([...SPLASH_MODE_IDS]);

const SPLASH_MODE_LABEL_MAP = new Map(SPLASH_MODE_CATALOG.map((mode) => [mode.id, mode.label]));

export function normalizeSpecificSplashMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return SPLASH_MODE_LABEL_MAP.has(mode) ? mode : "nodes";
}

export function normalizeSplashMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "random") return "random";
  return normalizeSpecificSplashMode(mode);
}

export function describeSplashMode(mode) {
  if (String(mode || "").trim().toLowerCase() === "random") return "Randomize each visit";
  return SPLASH_MODE_LABEL_MAP.get(normalizeSpecificSplashMode(mode)) || SPLASH_MODE_LABEL_MAP.get("nodes") || "Nodes and edges (existing)";
}

export function normalizeAllowedSplashModes(raw) {
  let input = [];
  if (Array.isArray(raw)) input = raw;
  else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        input = Array.isArray(parsed) ? parsed : [];
      } catch {
        input = trimmed.split(",");
      }
    } else {
      input = trimmed.split(",");
    }
  }
  const seen = new Set();
  const modes = [];
  for (const item of input) {
    const mode = String(item || "").trim().toLowerCase();
    if (!SPLASH_MODE_LABEL_MAP.has(mode) || seen.has(mode)) continue;
    seen.add(mode);
    modes.push(mode);
  }
  return modes;
}
