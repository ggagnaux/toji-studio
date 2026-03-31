import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/server.js";
import { resetAdminSessionsForTests } from "../src/session.js";
import { restoreEnv, startTestServer } from "./helpers.js";

function authHeaders() {
  return {
    Authorization: "Bearer legacy-token",
    "Content-Type": "application/json"
  };
}

async function readJson(res) {
  return res.json();
}

test.afterEach(() => {
  restoreEnv();
  resetAdminSessionsForTests();
});

test("GET /api/admin/data/tables requires auth and returns table metadata", async () => {
  process.env.ADMIN_TOKEN = "legacy-token";
  const server = await startTestServer(createApp);
  try {
    const unauthorized = await fetch(`${server.baseUrl}/api/admin/data/tables`);
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`${server.baseUrl}/api/admin/data/tables`, {
      headers: { Authorization: "Bearer legacy-token" }
    });
    const body = await readJson(authorized);

    assert.equal(authorized.status, 200);
    assert.ok(Array.isArray(body.tables));
    assert.ok(body.tables.length >= 3);
    assert.ok(body.tables.some((table) => table.name === "settings" && table.importSupported === true));
    assert.ok(body.tables.some((table) => table.name === "artworks" && table.exportSupported === true));
  } finally {
    await server.close();
  }
});

test("POST /api/admin/data/export rejects invalid selections and returns a JSON attachment for valid tables", async () => {
  process.env.ADMIN_TOKEN = "legacy-token";
  const server = await startTestServer(createApp);
  try {
    const invalid = await fetch(`${server.baseUrl}/api/admin/data/export`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tables: ["missing_table"] })
    });
    const invalidBody = await readJson(invalid);
    assert.equal(invalid.status, 400);
    assert.match(invalidBody.error, /Unknown export table selection/);

    const valid = await fetch(`${server.baseUrl}/api/admin/data/export`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tables: ["settings", "external_links"] })
    });
    const text = await valid.text();
    const body = JSON.parse(text);
    const disposition = valid.headers.get("content-disposition") || "";

    assert.equal(valid.status, 200);
    assert.match(valid.headers.get("content-type") || "", /application\/json/i);
    assert.match(disposition, /attachment;/i);
    assert.deepEqual(body.selectedTables, ["settings", "external_links"]);
    assert.equal(body.tableCount, 2);
    assert.ok(body.tables.settings);
    assert.ok(body.tables.external_links);
  } finally {
    await server.close();
  }
});

test("POST /api/admin/data/import/preview rejects malformed payloads and summarizes valid bundles", async () => {
  process.env.ADMIN_TOKEN = "legacy-token";
  const server = await startTestServer(createApp);
  try {
    const invalid = await fetch(`${server.baseUrl}/api/admin/data/import/preview`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tables: [] })
    });
    const invalidBody = await readJson(invalid);
    assert.equal(invalid.status, 400);
    assert.match(invalidBody.error, /tables object/);

    const valid = await fetch(`${server.baseUrl}/api/admin/data/import/preview`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        tables: {
          settings: [{ key: "siteTitle", value: "Toji" }],
          artworks: [{ id: "art-1" }],
          external_links: [{ id: "portfolio", label: "Portfolio", url: "" }]
        }
      })
    });
    const body = await readJson(valid);

    assert.equal(valid.status, 200);
    assert.deepEqual(body.importableTableNames, ["settings"]);
    assert.ok(body.tables.some((table) => table.name === "artworks" && table.warnings.length > 0));
    assert.ok(body.tables.some((table) => table.name === "external_links" && table.issues.length > 0));
  } finally {
    await server.close();
  }
});

test("POST /api/admin/data/import/commit rejects invalid mode, unsupported tables, and preview issues", async () => {
  process.env.ADMIN_TOKEN = "legacy-token";
  const server = await startTestServer(createApp);
  try {
    const invalidMode = await fetch(`${server.baseUrl}/api/admin/data/import/commit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ mode: "replace", tables: { settings: [] } })
    });
    const invalidModeBody = await readJson(invalidMode);
    assert.equal(invalidMode.status, 400);
    assert.match(invalidModeBody.error, /Only upsert import mode is supported/);

    const unsupportedSelection = await fetch(`${server.baseUrl}/api/admin/data/import/commit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mode: "upsert",
        tables: ["artworks"],
        bundle: {
          tables: {
            artworks: [{ id: "art-1" }]
          }
        }
      })
    });
    const unsupportedBody = await readJson(unsupportedSelection);
    assert.equal(unsupportedSelection.status, 400);
    assert.match(unsupportedBody.error, /Unsupported import table selection/);

    const validationIssue = await fetch(`${server.baseUrl}/api/admin/data/import/commit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mode: "upsert",
        tables: ["external_links"],
        bundle: {
          tables: {
            external_links: [{ id: "portfolio", label: "Portfolio", url: "" }]
          }
        }
      })
    });
    const validationBody = await readJson(validationIssue);
    assert.equal(validationIssue.status, 400);
    assert.match(validationBody.error, /Import preview found validation issues for external_links/);
  } finally {
    await server.close();
  }
});
