import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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


CREATE TABLE IF NOT EXISTS series (
  slug TEXT PRIMARY KEY,               -- stable key
  name TEXT NOT NULL,                  -- display name
  description TEXT DEFAULT '',
  sortOrder INTEGER DEFAULT 0,
  isPublic INTEGER DEFAULT 1,          -- 1=show publicly, 0=hidden
  coverArtworkId TEXT DEFAULT NULL,    -- optional
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS social_platforms (
  id TEXT PRIMARY KEY,                 -- stable slug (instagram, threads, x, etc.)
  name TEXT NOT NULL,
  category TEXT DEFAULT 'social',      -- social|newsletter|portfolio|other
  enabled INTEGER DEFAULT 1,           -- 1=enabled, 0=disabled
  configJson TEXT DEFAULT '{}',        -- platform posting config (JSON)
  authJson TEXT DEFAULT '{}',          -- platform auth credentials/tokens (JSON)
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

INSERT OR IGNORE INTO social_platforms (id, name, category, enabled, createdAt, updatedAt)
VALUES
  ('instagram', 'Instagram', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('threads', 'Threads', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('x', 'X', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('facebook', 'Facebook', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('linkedin', 'LinkedIn', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bluesky', 'Bluesky', 'social', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('youtube', 'YouTube', 'video', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('substack', 'Substack', 'newsletter', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('medium', 'Medium', 'newsletter', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);



`);

function ensureColumn(table, column, sqlTypeAndDefault) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlTypeAndDefault}`);
}

ensureColumn("social_platforms", "configJson", "TEXT DEFAULT '{}'");
ensureColumn("social_platforms", "authJson", "TEXT DEFAULT '{}'");

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
