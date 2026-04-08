import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

import { restoreEnv, startTestServer } from "./helpers.js";

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

test.afterEach(() => {
  restoreEnv();
});

test("db startup backfills artwork_series memberships from legacy artworks.series values", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-multi-series-backfill-"));
  const dbFile = path.join(storageDir, "toji.sqlite");
  const seedDb = new Database(dbFile);
  seedDb.exec(`
    CREATE TABLE artworks (
      id TEXT PRIMARY KEY,
      series TEXT
    );
    CREATE TABLE series (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  seedDb.prepare(`INSERT INTO series (slug, name) VALUES (?, ?), (?, ?)`)
    .run("night-forms", "Night Forms", "signal-bloom", "Signal Bloom");
  seedDb.prepare(`INSERT INTO artworks (id, series) VALUES (?, ?), (?, ?), (?, ?)`)
    .run("art-1", "Night Forms", "art-2", "signal-bloom", "art-3", "Unknown Series");
  seedDb.close();

  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);
  await server.close();

  const verifyDb = new Database(dbFile, { readonly: true });
  const rows = verifyDb.prepare(`SELECT artworkId, seriesSlug, isPrimary FROM artwork_series ORDER BY artworkId, seriesSlug`).all();
  verifyDb.close();

  assert.deepEqual(rows, [
    { artworkId: "art-1", seriesSlug: "night-forms", isPrimary: 1 },
    { artworkId: "art-2", seriesSlug: "signal-bloom", isPrimary: 1 }
  ]);
});