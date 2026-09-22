import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { clearArtworkData } from "../src/clear-artwork-data.js";
import { startTestServer, createAuthenticatedHeaders, restoreEnv } from "./helpers.js";

test("clear artwork data preserves other tables, bounds image deletion, rolls back failures and requires authorization", async () => {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), "toji-clear-test-"));
  process.env.TOJI_STORAGE_DIR = storage;
  process.env.ADMIN_PASSWORD = "clear-test-password";
  const { createApp } = await import("../src/server.js");
  const { db } = await import("../src/db.js");
  const server = await startTestServer(createApp);
  try {
    const headers = await createAuthenticatedHeaders(server.baseUrl, { json: true });
    db.prepare("INSERT INTO artworks (id, title, originalPath) VALUES (?, ?, ?)").run("a", "Test", path.join(storage, "keep.txt"));
    db.prepare("INSERT INTO series (slug, name) VALUES ('s', 'Test')").run();
    db.prepare("INSERT INTO artwork_series (artworkId, seriesSlug) VALUES ('a', 's')").run();
    db.prepare("INSERT INTO variants (id, artworkId, kind, path) VALUES ('v', 'a', 'web', '/media/a.jpg')").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('clear-test', 'keep')").run();
    db.prepare("INSERT INTO external_links (id, label, url) VALUES ('keep', 'Keep', 'https://example.com')").run();
    const platform = db.prepare("SELECT id FROM social_platforms LIMIT 1").get().id;
    db.prepare("INSERT INTO artwork_social_posts (id, artworkId, platformId) VALUES ('post', 'a', ?)").run(platform);
    fs.writeFileSync(path.join(storage, "keep.txt"), "unrelated asset");
    fs.writeFileSync(path.join(storage, "originals", "a.png"), "original");
    fs.mkdirSync(path.join(storage, "variants", "nested"));
    fs.writeFileSync(path.join(storage, "variants", "nested", "orphan.jpg"), "orphan");
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
    const snapshot = () => Object.fromEntries(tables.map(name => [name, db.prepare(`SELECT * FROM ${name}`).all()]));
    const before = snapshot();
    const endpoint = `${server.baseUrl}/api/admin/data/clear`;
    const body = JSON.stringify({ confirmation: "clear-artwork-data-and-images" });
    assert.equal((await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 401);
    assert.equal((await fetch(endpoint, { method: "POST", headers, body: "{}" })).status, 400);
    assert.deepEqual(snapshot(), before);

    assert.throws(() => clearArtworkData(db, storage, {
      ...fs,
      lstatSync(target) {
        return target === path.join(storage, "originals")
          ? { isSymbolicLink: () => true }
          : fs.lstatSync(target);
      }
    }), /ordinary directories/);
    assert.deepEqual(snapshot(), before);

    // A database failure restores all rows and both image directories.
    db.exec("CREATE TRIGGER block_clear BEFORE DELETE ON artworks BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    assert.throws(() => clearArtworkData(db, storage), /test failure/);
    assert.deepEqual(snapshot(), before);
    assert.equal(fs.readFileSync(path.join(storage, "originals", "a.png"), "utf8"), "original");
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
    db.exec("DROP TRIGGER block_clear");

    // A staging failure also leaves the database and images untouched.
    assert.throws(() => clearArtworkData(db, storage, {
      ...fs,
      renameSync(from, to) {
        if (from === path.join(storage, "variants")) throw new Error("test rename denied");
        return fs.renameSync(from, to);
      }
    }), /test rename denied/);
    assert.deepEqual(snapshot(), before);
    assert.equal(fs.existsSync(path.join(storage, "originals", "a.png")), true);

    const response = await fetch(endpoint, { method: "POST", headers, body });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.imagesDeleted, true);
    assert.deepEqual(result.deletedRows, { artwork_series: 1, variants: 1, artworks: 1, series: 1 });
    const after = snapshot();
    for (const table of tables) {
      assert.deepEqual(after[table], ["artwork_series", "artworks", "variants", "series"].includes(table) ? [] : before[table], table);
    }
    assert.deepEqual(fs.readdirSync(path.join(storage, "originals")), []);
    assert.deepEqual(fs.readdirSync(path.join(storage, "variants")), []);
    assert.equal(fs.readFileSync(path.join(storage, "keep.txt"), "utf8"), "unrelated asset");
    assert.equal(db.pragma("foreign_keys", { simple: true }), 1);

    // A post-commit disk failure is reported and can be retried.
    fs.writeFileSync(path.join(storage, "originals", "retry.png"), "retry");
    const partial = clearArtworkData(db, storage, {
      ...fs,
      rmSync(target, options) {
        if (target === path.join(storage, ".clear-originals") && fs.existsSync(target)) throw new Error("test file locked");
        return fs.rmSync(target, options);
      }
    });
    assert.equal(partial.imagesDeleted, false);
    assert.equal(partial.warnings.length, 1);
    assert.equal(clearArtworkData(db, storage).imagesDeleted, true);
    assert.equal(fs.existsSync(path.join(storage, ".clear-originals")), false);
  } finally {
    await server.close();
    db.close();
    // This exact directory was created by mkdtemp above, exclusively for this test.
    assert.equal(path.dirname(storage), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(storage).startsWith("toji-clear-test-"));
    fs.rmSync(storage, { recursive: true, force: true });
    restoreEnv();
  }
});

test("clear UI requires both confirmations and reports server failures", async () => {
  const source = fs.readFileSync(new URL("../../admin/js/data-manager.js", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf("async function confirmClearDatabase()"), source.indexOf("function setCleanupStatus("));
  for (const scenario of [
    { answers: [false], calls: 0 },
    { answers: [true, false], calls: 0 },
    { answers: [true, true], calls: 1 },
    { answers: [true, true], calls: 1, fail: true }
  ]) {
    const answers = [...scenario.answers];
    let calls = 0;
    let saved = false;
    const notices = [];
    const button = { disabled: false, focus() {} };
    const context = vm.createContext({
      clearDatabaseBtn: button, clearDatabaseStatus: {},
      confirmToast: async () => answers.shift(),
      setInlineStatus: (_, message) => notices.push(message),
      showToast: message => notices.push(message),
      loadState: async () => ({ artworks: [{ id: "a" }], settings: { keep: true } }),
      saveState: state => { assert.deepEqual(state.settings, { keep: true }); assert.equal(state.artworks.length, 0); saved = true; },
      loadTableMetadata: async () => {},
      apiFetch: async (url, options) => {
        calls++;
        assert.equal(url, "/api/admin/data/clear");
        assert.equal(options.method, "POST");
        assert.equal(JSON.parse(options.body).confirmation, "clear-artwork-data-and-images");
        if (scenario.fail) throw new Error("test server error");
        return { imagesDeleted: true, warnings: [] };
      }
    });
    await vm.runInContext(handler + "\nconfirmClearDatabase()", context);
    assert.equal(calls, scenario.calls);
    assert.equal(saved, scenario.calls > 0 && !scenario.fail);
    assert.equal(button.disabled, false);
    if (scenario.fail) assert.match(notices.at(-1), /Clear failed: test server error/);
  }
});
