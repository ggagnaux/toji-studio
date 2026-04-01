import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanExternalLinkUrl,
  cleanSlug,
  cleanText,
  collectInvalidRequestedDataTableNames,
  normalizeImportedExternalLinkRow,
  normalizeImportedSettingRow,
  normalizeImportedSocialPlatformRow,
  normalizeRequestedDataTableNames,
  parseDataImportBundle,
  previewDataImportBundle,
  validateImportRow,
  getDataTableSchema
} from "../src/routes/admin.js";
import { restoreEnv } from "./helpers.js";

test.afterEach(() => {
  restoreEnv();
});

test("clean helpers normalize simple text, slugs, and urls", () => {
  assert.equal(cleanText("  hello  "), "hello");
  assert.equal(cleanSlug(" Hello World! "), "hello-world");
  assert.equal(cleanExternalLinkUrl(" https://example.com "), "https://example.com");
});

test("normalizeRequestedDataTableNames keeps valid unique tables and respects import-only mode", () => {
  assert.deepEqual(
    normalizeRequestedDataTableNames([" settings ", "social_platforms", "settings", "missing"]),
    ["settings", "social_platforms"]
  );
  assert.deepEqual(
    normalizeRequestedDataTableNames(["settings", "artworks", "external_links"], { importOnly: true }),
    ["settings", "external_links"]
  );
});

test("collectInvalidRequestedDataTableNames reports unknown and unsupported import tables", () => {
  assert.deepEqual(
    collectInvalidRequestedDataTableNames(["missing", "missing", "artworks"], { importOnly: true }),
    ["missing", "artworks"]
  );
});

test("parseDataImportBundle accepts direct bundle objects and nested bundle wrappers", () => {
  const direct = parseDataImportBundle({
    format: "custom-format",
    version: 2,
    exportedAt: "2026-03-30T00:00:00.000Z",
    tables: { settings: [] }
  });
  const wrapped = parseDataImportBundle({
    bundle: {
      schema: { external_links: [{ name: "id" }, { name: "label" }] },
      tables: { external_links: [] }
    }
  });

  assert.equal(direct.format, "custom-format");
  assert.equal(direct.version, 2);
  assert.equal(direct.exportedAt, "2026-03-30T00:00:00.000Z");
  assert.deepEqual(Object.keys(wrapped.tables), ["external_links"]);
  assert.equal(wrapped.format, "toji-data-export");
  assert.equal(wrapped.version, 0);
});

test("parseDataImportBundle rejects invalid payload shapes", () => {
  assert.throws(() => parseDataImportBundle(null), /Import payload must be an object/);
  assert.throws(() => parseDataImportBundle({ tables: [] }), /tables object/);
});

test("validateImportRow enforces supported import table requirements", () => {
  assert.deepEqual(validateImportRow("settings", { key: "siteTitle" }, 0), []);
  assert.match(validateImportRow("settings", {}, 0)[0], /settings.key is required/);
  assert.deepEqual(validateImportRow("social_platforms", { id: "bluesky", name: "Bluesky" }, 0), []);
  assert.match(validateImportRow("social_platforms", { id: "unknown", name: "Unknown" }, 0)[0], /allowed platform id/);
  assert.deepEqual(validateImportRow("external_links", { id: "site", label: "Site", url: "https://example.com" }, 0), []);
  assert.match(validateImportRow("external_links", { id: "site", label: "Site", url: "" }, 0)[0], /external_links.url is required/);
  assert.match(validateImportRow("artworks", { id: "a1" }, 0)[0], /Import is not supported/);
});

test("previewDataImportBundle summarizes importable, unsupported, and invalid tables", () => {
  const preview = previewDataImportBundle({
    format: "toji-data-export",
    version: 1,
    exportedAt: "2026-03-30T00:00:00.000Z",
    tables: {
      settings: [{ key: "siteTitle", value: "Toji" }],
      artworks: [{ id: "art-1" }],
      missing_table: [{ id: "x" }],
      external_links: [{ id: "portfolio", label: "Portfolio", url: "" }]
    }
  });

  assert.deepEqual(preview.importableTableNames, ["settings"]);
  assert.equal(preview.summary.tableCount, 4);
  assert.equal(preview.summary.importableTableCount, 1);
  assert.equal(preview.summary.warningCount, 1);
  assert.ok(preview.summary.issueCount >= 2);
  assert.match(preview.tables.find((table) => table.name === "artworks").warnings[0], /Export only in v1/);
  assert.match(preview.tables.find((table) => table.name === "missing_table").issues[0], /Unknown table/);
  assert.match(preview.tables.find((table) => table.name === "external_links").issues[0], /external_links.url is required/);
});

test("previewDataImportBundle warns when bundled schema drifts from the current schema", () => {
  const preview = previewDataImportBundle({
    format: "toji-data-export",
    version: 1,
    exportedAt: "2026-03-30T00:00:00.000Z",
    schema: {
      settings: [{ name: "key" }]
    },
    tables: {
      settings: [{ key: "siteTitle", value: "Toji" }]
    }
  });

  const settingsPreview = preview.tables.find((table) => table.name === "settings");
  assert.ok(settingsPreview.warnings.some((warning) => /missing current settings columns: value, updatedAt/i.test(warning)));
  assert.deepEqual(settingsPreview.schemaColumns, getDataTableSchema("settings").map((column) => column.name));
});

test("normalize imported rows produces persisted payload shapes", () => {
  const timestamp = "2026-03-30T00:00:00.000Z";

  assert.deepEqual(normalizeImportedSettingRow({ key: "siteTitle", value: { text: "Toji" } }, timestamp), {
    key: "siteTitle",
    value: JSON.stringify({ text: "Toji" }),
    updatedAt: timestamp
  });

  const social = normalizeImportedSocialPlatformRow({
    id: " Bluesky ",
    name: " Bluesky ",
    config: { iconLocation: "/assets/bluesky.svg", mode: "manual" },
    auth: { accessToken: "token" }
  }, timestamp);
  assert.equal(social.id, "bluesky");
  assert.equal(social.name, "Bluesky");
  assert.equal(social.enabled, 1);
  assert.equal(social.iconLocation, "/assets/bluesky.svg");
  assert.deepEqual(JSON.parse(social.configJson), { iconLocation: "/assets/bluesky.svg", mode: "manual" });
  assert.deepEqual(JSON.parse(social.authJson), { accessToken: "token" });
  assert.equal(social.createdAt, timestamp);
  assert.equal(social.updatedAt, timestamp);

  const link = normalizeImportedExternalLinkRow({
    id: " Portfolio ",
    label: " Portfolio ",
    url: " https://example.com ",
    category: "SHOP",
    enabled: false,
    sortOrder: "7"
  }, timestamp);
  assert.deepEqual(link, {
    id: "portfolio",
    label: "Portfolio",
    url: "https://example.com",
    category: "shop",
    enabled: 0,
    sortOrder: 7,
    createdAt: timestamp,
    updatedAt: timestamp
  });
});
