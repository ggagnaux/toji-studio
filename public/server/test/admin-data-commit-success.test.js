import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { restoreEnv, startTestServer, createAuthenticatedHeaders } from "./helpers.js";

async function authHeaders(server, json = true) {
  return createAuthenticatedHeaders(server.baseUrl, { json });
}

async function importFreshServerModule() {
  const stamp = `${Date.now()}-${Math.random()}`.replace(/[^a-z0-9.-]+/gi, "");
  return import(`../src/server.js?fresh=${stamp}`);
}

test.afterEach(() => {
  restoreEnv();
});

test("POST /api/admin/data/import/commit succeeds for safe tables in isolated storage", async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-test-storage-"));
  process.env.TOJI_STORAGE_DIR = storageDir;
  process.env.ADMIN_PASSWORD = "secret-pass";

  const { createApp } = await importFreshServerModule();
  const server = await startTestServer(createApp);

  try {
    const commitResponse = await fetch(`${server.baseUrl}/api/admin/data/import/commit`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: JSON.stringify({
        mode: "upsert",
        tables: ["settings", "external_links"],
        bundle: {
          tables: {
            settings: [
              { key: "siteTitle", value: "Toji Studios" },
              { key: "homepageTheme", value: "ember" }
            ],
            external_links: [
              {
                id: "portfolio",
                label: "Portfolio",
                url: "https://example.com/portfolio",
                category: "portfolio",
                enabled: true,
                sortOrder: 0
              }
            ]
          }
        }
      })
    });
    const commitBody = await commitResponse.json();

    assert.equal(commitResponse.status, 200);
    assert.equal(commitBody.ok, true);
    assert.deepEqual(commitBody.selectedTables, ["settings", "external_links"]);
    assert.equal(commitBody.tables.length, 2);
    assert.equal(commitBody.totals.inserted, 3);
    assert.equal(commitBody.totals.updated, 0);
    assert.equal(commitBody.totals.failed, 0);

    const exportResponse = await fetch(`${server.baseUrl}/api/admin/data/export`, {
      method: "POST",
      headers: await authHeaders(server, ),
      body: JSON.stringify({ tables: ["settings", "external_links"] })
    });
    const exportPayload = await exportResponse.json();

    assert.equal(exportResponse.status, 200);
    assert.deepEqual(exportPayload.selectedTables, ["settings", "external_links"]);

    const settingRows = exportPayload.tables.settings;
    const linkRows = exportPayload.tables.external_links;

    assert.ok(settingRows.some((row) => row.key === "siteTitle" && row.value === "Toji Studios"));
    assert.ok(settingRows.some((row) => row.key === "homepageTheme" && row.value === "ember"));
    assert.ok(linkRows.some((row) => row.id === "portfolio" && row.url === "https://example.com/portfolio"));
  } finally {
    await server.close();
  }
});
