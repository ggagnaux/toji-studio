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



`);

export function nowIso() {
  return new Date().toISOString();
}

export function jsonArray(s) {
  try { return JSON.parse(s || "[]"); } catch { return []; }
}
export function toJson(v) {
  return JSON.stringify(v ?? []);
}
