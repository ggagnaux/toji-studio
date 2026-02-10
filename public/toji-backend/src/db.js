import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("storage");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "toji.sqlite"));
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
