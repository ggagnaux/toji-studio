import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ALLOWED_SOCIAL_PLATFORMS } from "./config/social-platforms.js";

const defaultStorageDir = path.join(os.homedir(), ".toji-studios", "storage");
export const STORAGE_DIR = path.resolve(process.env.TOJI_STORAGE_DIR || defaultStorageDir);
export const ORIGINALS_DIR = path.join(STORAGE_DIR, "originals");
export const VARIANTS_DIR = path.join(STORAGE_DIR, "variants");

const legacyStorageDir = path.resolve("storage");
const legacyDbFile = path.join(legacyStorageDir, "toji.sqlite");
const targetDbFile = path.join(STORAGE_DIR, "toji.sqlite");
if (!process.env.TOJI_STORAGE_DIR && fs.existsSync(legacyDbFile) && !fs.existsSync(targetDbFile)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.cpSync(legacyStorageDir, STORAGE_DIR, { recursive: true });
}

fs.mkdirSync(STORAGE_DIR, { recursive: true });
fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
fs.mkdirSync(VARIANTS_DIR, { recursive: true });

export const db = new Database(path.join(STORAGE_DIR, "toji.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function isReadonlySqliteError(error) {
  return String(error?.code || "").toUpperCase() === "SQLITE_READONLY";
}

function ignoreReadonlySqlite(error, context = "sqlite write") {
  if (!isReadonlySqliteError(error)) throw error;
  console.warn(`[db] Skipping ${context}; database is read-only.`);
}

db.exec(`
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  title TEXT,
  year TEXT,
  series TEXT,
  description TEXT,
  alt TEXT,
  status TEXT DEFAULT 'draft',          -- draft|published|hidden
  featured INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',               -- JSON array
  createdAt TEXT,
  updatedAt TEXT,
  publishedAt TEXT,
  originalPath TEXT,                    -- private path (originals)
  width INTEGER,
  height INTEGER
);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  artworkId TEXT NOT NULL,
  kind TEXT NOT NULL,                   -- thumb|web
  path TEXT NOT NULL,                   -- served under /media
  width INTEGER,
  height INTEGER,
  sizeBytes INTEGER,
  createdAt TEXT,
  UNIQUE(artworkId, kind)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT
);


CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  metadataJson TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions(expiresAt);

CREATE TABLE IF NOT EXISTS series (
  slug TEXT PRIMARY KEY,               -- stable key
  name TEXT NOT NULL,                  -- display name
  description TEXT DEFAULT '',
  sortOrder INTEGER DEFAULT 0,
  isPublic INTEGER DEFAULT 1,          -- 1=show publicly, 0=hidden
  coverArtworkId TEXT DEFAULT NULL,    -- optional
  imageOrderJson TEXT DEFAULT '[]',    -- ordered artwork ids for this series
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS artwork_series (
  artworkId TEXT NOT NULL,
  seriesSlug TEXT NOT NULL,
  isPrimary INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT,
  UNIQUE(artworkId, seriesSlug),
  FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (seriesSlug) REFERENCES series(slug) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_platforms (
  id TEXT PRIMARY KEY,                 -- stable slug (instagram, threads, x, etc.)
  name TEXT NOT NULL,
  category TEXT DEFAULT 'social',      -- social|newsletter|portfolio|other
  enabled INTEGER DEFAULT 1,           -- 1=enabled, 0=disabled
  iconLocation TEXT DEFAULT '',        -- remote URL or local path for the platform icon
  configJson TEXT DEFAULT '{}',        -- platform posting config (JSON)
  authJson TEXT DEFAULT '{}',          -- platform auth credentials/tokens (JSON)
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS external_links (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'social',
  enabled INTEGER DEFAULT 1,
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS artwork_social_posts (
  id TEXT PRIMARY KEY,
  artworkId TEXT NOT NULL,
  platformId TEXT NOT NULL,
  status TEXT DEFAULT 'draft',         -- draft|queued|posted|failed|skipped
  caption TEXT DEFAULT '',
  postUrl TEXT DEFAULT '',
  externalPostId TEXT DEFAULT '',
  payload TEXT DEFAULT '{}',           -- JSON blob for API request/response metadata
  errorMessage TEXT DEFAULT '',
  postedAt TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  UNIQUE(artworkId, platformId),
  FOREIGN KEY (artworkId) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (platformId) REFERENCES social_platforms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artwork_social_posts_platform_status
  ON artwork_social_posts(platformId, status);

CREATE INDEX IF NOT EXISTS idx_artwork_social_posts_artwork
  ON artwork_social_posts(artworkId);

CREATE INDEX IF NOT EXISTS idx_artwork_series_artwork
  ON artwork_series(artworkId);

CREATE INDEX IF NOT EXISTS idx_artwork_series_series
  ON artwork_series(seriesSlug);

CREATE INDEX IF NOT EXISTS idx_external_links_sort
  ON external_links(sortOrder, updatedAt);



`);

function ensureColumn(table, column, sqlTypeAndDefault) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlTypeAndDefault}`);
}

function normalizeLegacySeriesText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSeriesSlugKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function backfillArtworkSeriesMemberships() {
  const legacyRows = db.prepare(`
    SELECT id, series
    FROM artworks
    WHERE TRIM(COALESCE(series, '')) <> ''
  `).all();
  if (!legacyRows.length) return;

  const knownSeries = db.prepare(`
    SELECT slug, name
    FROM series
  `).all();
  const slugLookup = new Map();
  for (const row of knownSeries) {
    const slug = String(row?.slug || "").trim();
    if (!slug) continue;
    const name = normalizeLegacySeriesText(row?.name || "");
    slugLookup.set(slug.toLowerCase(), slug);
    slugLookup.set(normalizeSeriesSlugKey(slug), slug);
    if (name) {
      slugLookup.set(name.toLowerCase(), slug);
      slugLookup.set(normalizeSeriesSlugKey(name), slug);
    }
  }

  let inserted = 0;
  let existing = 0;
  let skippedUnknownSeries = 0;
  const skippedSamples = [];
  const insertMembership = db.prepare(`
    INSERT OR IGNORE INTO artwork_series (
      artworkId,
      seriesSlug,
      isPrimary,
      sortOrder,
      createdAt,
      updatedAt
    ) VALUES (
      @artworkId,
      @seriesSlug,
      1,
      0,
      @createdAt,
      @updatedAt
    )
  `);

  const now = nowIso();
  const runBackfill = db.transaction(() => {
    for (const row of legacyRows) {
      const artworkId = String(row?.id || "").trim();
      const legacySeries = normalizeLegacySeriesText(row?.series || "");
      if (!artworkId || !legacySeries) continue;

      const resolvedSlug =
        slugLookup.get(legacySeries.toLowerCase()) ||
        slugLookup.get(normalizeSeriesSlugKey(legacySeries)) ||
        "";
      if (!resolvedSlug) {
        skippedUnknownSeries += 1;
        if (skippedSamples.length < 20) {
          skippedSamples.push({ artworkId, legacySeries });
        }
        continue;
      }

      const result = insertMembership.run({
        artworkId,
        seriesSlug: resolvedSlug,
        createdAt: now,
        updatedAt: now
      });
      if (Number(result?.changes || 0) > 0) inserted += 1;
      else existing += 1;
    }
  });

  try {
    runBackfill();
  } catch (error) {
    ignoreReadonlySqlite(error, "artwork_series backfill");
    return;
  }

  console.info(
    `[db] artwork_series backfill: checked ${legacyRows.length} legacy artwork row(s); inserted ${inserted}, existing ${existing}, skipped ${skippedUnknownSeries}.`
  );
  if (skippedSamples.length) {
    const sampleText = skippedSamples
      .map((row) => `${row.artworkId} => ${row.legacySeries}`)
      .join(", ");
    console.warn(`[db] artwork_series backfill skipped unknown series sample(s): ${sampleText}`);
  }
}

ensureColumn("social_platforms", "configJson", "TEXT DEFAULT '{}'");
ensureColumn("social_platforms", "authJson", "TEXT DEFAULT '{}'");
ensureColumn("social_platforms", "iconLocation", "TEXT DEFAULT ''");

ensureColumn("series", "imageOrderJson", "TEXT DEFAULT '[]'");

backfillArtworkSeriesMemberships();

const socialPlatforms = db.prepare(`
  SELECT id, iconLocation, configJson
  FROM social_platforms
`).all();
const backfillPlatformIconStmt = db.prepare(`
  UPDATE social_platforms
  SET iconLocation=@iconLocation
  WHERE id=@id
`);
for (const platform of socialPlatforms) {
  if (String(platform.iconLocation || "").trim()) continue;
  try {
    const config = JSON.parse(platform.configJson || "{}");
    const iconLocation = String(config?.iconLocation || "").trim();
    if (!iconLocation) continue;
    try {
      backfillPlatformIconStmt.run({ id: platform.id, iconLocation });
    } catch (error) {
      ignoreReadonlySqlite(error, "social platform icon backfill");
      break;
    }
  } catch {}
}

const seedSocialPlatformStmt = db.prepare(`
  INSERT OR IGNORE INTO social_platforms (id, name, category, enabled, iconLocation, createdAt, updatedAt)
  VALUES (@id, @name, @category, 1, @iconLocation, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);
const syncSocialPlatformStmt = db.prepare(`
  UPDATE social_platforms
  SET name=@name, category=@category, iconLocation=@iconLocation, updatedAt=CURRENT_TIMESTAMP
  WHERE id=@id
`);
for (const platform of ALLOWED_SOCIAL_PLATFORMS) {
  try {
    seedSocialPlatformStmt.run(platform);
    syncSocialPlatformStmt.run(platform);
  } catch (error) {
    ignoreReadonlySqlite(error, "social platform seed");
    break;
  }
}

const allowedSocialPlatformIds = ALLOWED_SOCIAL_PLATFORMS.map((platform) => platform.id);
const deleteDisallowedSocialPlatformsStmt = db.prepare(`
  DELETE FROM social_platforms
  WHERE id NOT IN (${allowedSocialPlatformIds.map(() => "?").join(", ")})
`);
try {
  deleteDisallowedSocialPlatformsStmt.run(...allowedSocialPlatformIds);
} catch (error) {
  ignoreReadonlySqlite(error, "social platform cleanup");
}

export function nowIso() {
  return new Date().toISOString();
}

export function jsonArray(s) {
  try { return JSON.parse(s || "[]"); } catch { return []; }
}
export function toJson(v) {
  return JSON.stringify(v ?? []);
}

export const IMAGE_VARIANT_SETTINGS_KEY = "imageVariantSettings";
export const DEFAULT_IMAGE_VARIANT_SETTINGS = Object.freeze({
  thumbMaxWidth: 560,
  thumbQuality: 78,
  webMaxWidth: 1800,
  webQuality: 84
});
export const CONTACT_SETTINGS_KEY = "contactSettings";
export const DEFAULT_CONTACT_SETTINGS = Object.freeze({
  contactEmail: "you@example.com"
});
export const SPLASH_SETTINGS_KEY = "splashSettings";
export const DEFAULT_SPLASH_ALLOWED_MODES = Object.freeze([
  "nodes",
  "flock",
  "circles",
  "matrix",
  "life",
  "plot",
  "bounce",
  "turningcircles",
  "asteroids",
  "tempest",
  "missilecommand",
  "radar",
  "mountains",
  "serpentinesphere",
  "wireframesphere",
  "pixeltitle",
  "pixelnoise",
  "pixelsnake",
  "orbitalbeams"
]);
export const DEFAULT_SPLASH_SETTINGS = Object.freeze({
  enabled: true,
  mode: "nodes",
  randomCycleEnabled: false,
  randomCycleSeconds: 12,
  allowedModes: DEFAULT_SPLASH_ALLOWED_MODES
});

function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeImageVariantSettings(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    thumbMaxWidth: clampInt(input.thumbMaxWidth, DEFAULT_IMAGE_VARIANT_SETTINGS.thumbMaxWidth, 64, 6000),
    thumbQuality: clampInt(input.thumbQuality, DEFAULT_IMAGE_VARIANT_SETTINGS.thumbQuality, 1, 100),
    webMaxWidth: clampInt(input.webMaxWidth, DEFAULT_IMAGE_VARIANT_SETTINGS.webMaxWidth, 64, 12000),
    webQuality: clampInt(input.webQuality, DEFAULT_IMAGE_VARIANT_SETTINGS.webQuality, 1, 100)
  };
}

function normalizeSplashModeValue(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "random") return "random";
  return DEFAULT_SPLASH_ALLOWED_MODES.includes(mode) ? mode : DEFAULT_SPLASH_SETTINGS.mode;
}

function normalizeAllowedSplashModes(raw) {
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
    if (!DEFAULT_SPLASH_ALLOWED_MODES.includes(mode) || seen.has(mode)) continue;
    seen.add(mode);
    modes.push(mode);
  }
  return modes;
}

function normalizeBooleanSetting(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized !== "0" && normalized !== "false" && normalized !== "off" && normalized !== "no";
}

export function normalizeSplashSettings(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: normalizeBooleanSetting(input.enabled, DEFAULT_SPLASH_SETTINGS.enabled),
    mode: normalizeSplashModeValue(input.mode),
    randomCycleEnabled: normalizeBooleanSetting(input.randomCycleEnabled, DEFAULT_SPLASH_SETTINGS.randomCycleEnabled),
    randomCycleSeconds: clampInt(input.randomCycleSeconds, DEFAULT_SPLASH_SETTINGS.randomCycleSeconds, 1, 600),
    allowedModes: normalizeAllowedSplashModes(input.allowedModes)
  };
}

export function getSettingJson(key, fallback) {
  const row = db.prepare(`SELECT value FROM settings WHERE key=?`).get(String(key));
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export function setSettingJson(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updatedAt)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value,
      updatedAt=excluded.updatedAt
  `).run({
    key: String(key),
    value: JSON.stringify(value ?? null),
    updatedAt: new Date().toISOString()
  });
}

export function getImageVariantSettings() {
  return normalizeImageVariantSettings(
    getSettingJson(IMAGE_VARIANT_SETTINGS_KEY, DEFAULT_IMAGE_VARIANT_SETTINGS)
  );
}

export function setImageVariantSettings(value) {
  const normalized = normalizeImageVariantSettings(value);
  setSettingJson(IMAGE_VARIANT_SETTINGS_KEY, normalized);
  return normalized;
}

export function normalizeContactSettings(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    contactEmail: String(input.contactEmail || DEFAULT_CONTACT_SETTINGS.contactEmail).trim() || DEFAULT_CONTACT_SETTINGS.contactEmail
  };
}

export function getContactSettings() {
  return normalizeContactSettings(
    getSettingJson(CONTACT_SETTINGS_KEY, DEFAULT_CONTACT_SETTINGS)
  );
}

export function setContactSettings(value) {
  const normalized = normalizeContactSettings(value);
  setSettingJson(CONTACT_SETTINGS_KEY, normalized);
  return normalized;
}

export function getSplashSettings() {
  return normalizeSplashSettings(
    getSettingJson(SPLASH_SETTINGS_KEY, DEFAULT_SPLASH_SETTINGS)
  );
}

export function setSplashSettings(value) {
  const normalized = normalizeSplashSettings(value);
  setSettingJson(SPLASH_SETTINGS_KEY, normalized);
  return normalized;
}


