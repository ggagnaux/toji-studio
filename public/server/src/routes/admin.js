import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { Router } from "express";
import {
  db,
  nowIso,
  jsonArray,
  toJson,
  ORIGINALS_DIR,
  VARIANTS_DIR,
  getImageVariantSettings,
  setImageVariantSettings,
  getContactSettings,
  setContactSettings
} from "../db.js";
import {
  ALLOWED_SOCIAL_PLATFORMS,
  getAllowedSocialPlatform,
  getAllowedSocialPlatformIds
} from "../config/social-platforms.js";
import { publishArtworkToBluesky } from "../services/social/bluesky.js";
import { publishArtworkToLinkedIn } from "../services/social/linkedin.js";

export const adminRouter = Router();
const DATA_EXPORT_FORMAT = "toji-data-export";
const DATA_EXPORT_VERSION = 1;
const DATA_IMPORT_SAFE_TABLES = new Set(["settings", "social_platforms", "external_links"]);
const DATA_TABLE_DEFINITIONS = Object.freeze([
  { name: "artworks", label: "Artworks", exportSql: "SELECT * FROM artworks ORDER BY updatedAt DESC, createdAt DESC, id ASC", countSql: "SELECT COUNT(*) AS count FROM artworks", importSupported: false, importNotes: "Export only in v1." },
  { name: "variants", label: "Variants", exportSql: "SELECT * FROM variants ORDER BY artworkId ASC, kind ASC, id ASC", countSql: "SELECT COUNT(*) AS count FROM variants", importSupported: false, importNotes: "Export only in v1." },
  { name: "settings", label: "Settings", exportSql: "SELECT * FROM settings ORDER BY key ASC", countSql: "SELECT COUNT(*) AS count FROM settings", importSupported: true, importNotes: "Safe import supported in v1." },
  { name: "series", label: "Series", exportSql: "SELECT * FROM series ORDER BY sortOrder ASC, name COLLATE NOCASE ASC, slug ASC", countSql: "SELECT COUNT(*) AS count FROM series", importSupported: false, importNotes: "Export only in v1." },
  { name: "social_platforms", label: "Social Platforms", exportSql: "SELECT * FROM social_platforms ORDER BY id ASC", countSql: "SELECT COUNT(*) AS count FROM social_platforms", importSupported: true, importNotes: "Safe import supported in v1." },
  { name: "external_links", label: "External Links", exportSql: "SELECT * FROM external_links ORDER BY sortOrder ASC, updatedAt DESC, id ASC", countSql: "SELECT COUNT(*) AS count FROM external_links", importSupported: true, importNotes: "Safe import supported in v1." },
  { name: "artwork_social_posts", label: "Artwork Social Posts", exportSql: "SELECT * FROM artwork_social_posts ORDER BY artworkId ASC, platformId ASC, id ASC", countSql: "SELECT COUNT(*) AS count FROM artwork_social_posts", importSupported: false, importNotes: "Export only in v1." }
]);
const DATA_TABLE_DEFINITION_MAP = new Map(DATA_TABLE_DEFINITIONS.map((definition) => [definition.name, definition]));
const ALLOWED_IMPORT_SOCIAL_PLATFORM_IDS = new Set(getAllowedSocialPlatformIds());

adminRouter.get("/admin/settings/image-variants", (req, res) => {
  res.json(getImageVariantSettings());
});

adminRouter.put("/admin/settings/image-variants", (req, res) => {
  const saved = setImageVariantSettings(req.body || {});
  res.json(saved);
});

adminRouter.get("/admin/settings/contact", (req, res) => {
  res.json(getContactSettings());
});

adminRouter.put("/admin/settings/contact", (req, res) => {
  const saved = setContactSettings(req.body || {});
  res.json(saved);
});
function getDataTableDefinition(tableName) {
  return DATA_TABLE_DEFINITION_MAP.get(cleanText(tableName));
}

function listDataTableMetadata() {
  return DATA_TABLE_DEFINITIONS.map((definition) => ({
    name: definition.name,
    label: definition.label,
    rowCount: Number(db.prepare(definition.countSql).get()?.count || 0),
    exportSupported: true,
    importSupported: !!definition.importSupported,
    importNotes: definition.importNotes || ""
  }));
}

function normalizeRequestedDataTableNames(raw, { importOnly = false } = {}) {
  const input = Array.isArray(raw) ? raw : [];
  const names = [];
  const seen = new Set();
  for (const item of input) {
    const name = cleanText(item);
    if (!name || seen.has(name)) continue;
    const definition = getDataTableDefinition(name);
    if (!definition) continue;
    if (importOnly && !definition.importSupported) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function collectInvalidRequestedDataTableNames(raw, { importOnly = false } = {}) {
  const input = Array.isArray(raw) ? raw : [];
  const invalid = [];
  const seen = new Set();
  for (const item of input) {
    const name = cleanText(item);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const definition = getDataTableDefinition(name);
    if (!definition) {
      invalid.push(name);
      continue;
    }
    if (importOnly && !definition.importSupported) invalid.push(name);
  }
  return invalid;
}

function selectRowsForDataTable(tableName) {
  const definition = getDataTableDefinition(tableName);
  if (!definition) throw new Error("Unknown data table: " + tableName);
  return db.prepare(definition.exportSql).all();
}

function buildDataExportPayload(tableNames) {
  const names = Array.isArray(tableNames) && tableNames.length
    ? tableNames
    : DATA_TABLE_DEFINITIONS.map((definition) => definition.name);
  const tables = {};
  for (const name of names) tables[name] = selectRowsForDataTable(name);
  return {
    format: DATA_EXPORT_FORMAT,
    version: DATA_EXPORT_VERSION,
    exportedAt: nowIso(),
    selectedTables: names,
    tableCount: names.length,
    tables
  };
}

function buildDataExportFilename(tableNames) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (Array.isArray(tableNames) && tableNames.length === 1) {
    return "toji-" + tableNames[0] + "-export-" + stamp + ".json";
  }
  return "toji-database-export-" + stamp + ".json";
}

function sendJsonDownload(res, payload, filename) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
  res.send(JSON.stringify(payload, null, 2));
}

function parseDataImportBundle(raw) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw.bundle && typeof raw.bundle === "object" && !Array.isArray(raw.bundle) ? raw.bundle : raw)
    : null;
  if (!payload) throw new Error("Import payload must be an object.");
  const tables = payload.tables;
  if (!tables || typeof tables !== "object" || Array.isArray(tables)) {
    throw new Error("Import bundle must include a tables object.");
  }
  return {
    format: cleanText(payload.format) || DATA_EXPORT_FORMAT,
    version: Number(payload.version || 0) || 0,
    exportedAt: cleanText(payload.exportedAt),
    tables
  };
}

function validateImportRow(tableName, row, index) {
  const errors = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    errors.push("Row " + (index + 1) + " must be an object.");
    return errors;
  }
  if (tableName === "settings") {
    if (!cleanText(row.key)) errors.push("Row " + (index + 1) + ": settings.key is required.");
    return errors;
  }
  if (tableName === "social_platforms") {
    const id = cleanSlug(row.id);
    if (!id) errors.push("Row " + (index + 1) + ": social_platforms.id is required.");
    else if (!ALLOWED_IMPORT_SOCIAL_PLATFORM_IDS.has(id)) errors.push("Row " + (index + 1) + ": social_platforms.id must be an allowed platform id.");
    if (!cleanText(row.name)) errors.push("Row " + (index + 1) + ": social_platforms.name is required.");
    return errors;
  }
  if (tableName === "external_links") {
    if (!cleanSlug(row.id)) errors.push("Row " + (index + 1) + ": external_links.id is required.");
    if (!cleanText(row.label)) errors.push("Row " + (index + 1) + ": external_links.label is required.");
    if (!cleanExternalLinkUrl(row.url)) errors.push("Row " + (index + 1) + ": external_links.url is required.");
    return errors;
  }
  errors.push("Import is not supported for " + tableName + " in v1.");
  return errors;
}

function previewDataImportBundle(bundle) {
  const tables = [];
  for (const [tableName, rawRows] of Object.entries(bundle.tables || {})) {
    const definition = getDataTableDefinition(tableName);
    const issues = [];
    const warnings = [];
    const rows = Array.isArray(rawRows) ? rawRows : null;
    if (!definition) issues.push('Unknown table "' + tableName + '".');
    if (!rows) issues.push("Table payload must be an array.");
    if (definition && !definition.importSupported) warnings.push(definition.importNotes || "Export only in v1.");
    let validRowCount = 0;
    if (definition && definition.importSupported && rows) {
      rows.forEach((row, index) => {
        const rowErrors = validateImportRow(tableName, row, index);
        if (rowErrors.length) issues.push(...rowErrors);
        else validRowCount += 1;
      });
    }
    tables.push({
      name: tableName,
      label: definition?.label || tableName,
      rowCount: rows ? rows.length : 0,
      exportSupported: !!definition,
      importSupported: !!definition?.importSupported,
      importNotes: definition?.importNotes || "Unknown table.",
      validRowCount,
      issues,
      warnings
    });
  }
  const importableTableNames = tables.filter((table) => table.importSupported && !table.issues.length).map((table) => table.name);
  return {
    format: bundle.format,
    version: bundle.version,
    exportedAt: bundle.exportedAt,
    tables,
    importableTableNames,
    summary: {
      tableCount: tables.length,
      importableTableCount: importableTableNames.length,
      issueCount: tables.reduce((sum, table) => sum + table.issues.length, 0),
      warningCount: tables.reduce((sum, table) => sum + table.warnings.length, 0)
    }
  };
}

function normalizeImportedSettingRow(row, updatedAt) {
  return {
    key: cleanText(row.key),
    value: typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? ""),
    updatedAt: cleanText(row.updatedAt) || updatedAt
  };
}

function normalizeImportedSocialPlatformRow(row, timestamp) {
  const config = row?.config && typeof row.config === "object" && !Array.isArray(row.config) ? row.config : parseJsonObject(row?.configJson, {});
  const auth = row?.auth && typeof row.auth === "object" && !Array.isArray(row.auth) ? row.auth : parseJsonObject(row?.authJson, {});
  const iconLocation = cleanText(row.iconLocation || config.iconLocation);
  return {
    id: cleanSlug(row.id),
    name: cleanText(row.name),
    category: cleanCategory(row.category || "social"),
    enabled: toDbBool(row.enabled, 1),
    iconLocation,
    configJson: JSON.stringify({ ...config, iconLocation }),
    authJson: JSON.stringify(auth),
    createdAt: cleanText(row.createdAt) || timestamp,
    updatedAt: cleanText(row.updatedAt) || timestamp
  };
}

function normalizeImportedExternalLinkRow(row, timestamp) {
  return {
    id: cleanSlug(row.id),
    label: cleanText(row.label),
    url: cleanExternalLinkUrl(row.url),
    category: cleanExternalLinkCategory(row.category || "other"),
    enabled: toDbBool(row.enabled, 1),
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    createdAt: cleanText(row.createdAt) || timestamp,
    updatedAt: cleanText(row.updatedAt) || timestamp
  };
}

function importSettingsRows(rows, timestamp) {
  const existsStmt = db.prepare("SELECT 1 FROM settings WHERE key=?");
  const upsertStmt = db.prepare(`
    INSERT INTO settings (key, value, updatedAt)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value,
      updatedAt=excluded.updatedAt
  `);
  const summary = { table: "settings", inserted: 0, updated: 0, skipped: 0, failed: 0, rowCount: rows.length };
  for (const row of rows) {
    const payload = normalizeImportedSettingRow(row, timestamp);
    const exists = !!existsStmt.get(payload.key);
    upsertStmt.run(payload);
    if (exists) summary.updated += 1;
    else summary.inserted += 1;
  }
  return summary;
}

function importSocialPlatformRows(rows, timestamp) {
  const existsStmt = db.prepare("SELECT 1 FROM social_platforms WHERE id=?");
  const upsertStmt = db.prepare(`
    INSERT INTO social_platforms (
      id, name, category, enabled, iconLocation, configJson, authJson, createdAt, updatedAt
    ) VALUES (
      @id, @name, @category, @enabled, @iconLocation, @configJson, @authJson, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      category=excluded.category,
      enabled=excluded.enabled,
      iconLocation=excluded.iconLocation,
      configJson=excluded.configJson,
      authJson=excluded.authJson,
      updatedAt=excluded.updatedAt
  `);
  const summary = { table: "social_platforms", inserted: 0, updated: 0, skipped: 0, failed: 0, rowCount: rows.length };
  for (const row of rows) {
    const payload = normalizeImportedSocialPlatformRow(row, timestamp);
    const exists = !!existsStmt.get(payload.id);
    upsertStmt.run(payload);
    if (exists) summary.updated += 1;
    else summary.inserted += 1;
  }
  return summary;
}

function importExternalLinkRows(rows, timestamp) {
  const existsStmt = db.prepare("SELECT 1 FROM external_links WHERE id=?");
  const upsertStmt = db.prepare(`
    INSERT INTO external_links (
      id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    ) VALUES (
      @id, @label, @url, @category, @enabled, @sortOrder, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      label=excluded.label,
      url=excluded.url,
      category=excluded.category,
      enabled=excluded.enabled,
      sortOrder=excluded.sortOrder,
      updatedAt=excluded.updatedAt
  `);
  const summary = { table: "external_links", inserted: 0, updated: 0, skipped: 0, failed: 0, rowCount: rows.length };
  for (const row of rows) {
    const payload = normalizeImportedExternalLinkRow(row, timestamp);
    const exists = !!existsStmt.get(payload.id);
    upsertStmt.run(payload);
    if (exists) summary.updated += 1;
    else summary.inserted += 1;
  }
  return summary;
}

function importDataRowsForTable(tableName, rows, timestamp) {
  if (tableName === "settings") return importSettingsRows(rows, timestamp);
  if (tableName === "social_platforms") return importSocialPlatformRows(rows, timestamp);
  if (tableName === "external_links") return importExternalLinkRows(rows, timestamp);
  throw new Error("Import is not supported for " + tableName + " in v1.");
}

adminRouter.get("/admin/data/tables", (req, res) => {
  res.json({ tables: listDataTableMetadata() });
});

adminRouter.post("/admin/data/export", (req, res) => {
  const invalidTableNames = collectInvalidRequestedDataTableNames(req.body?.tables);
  if (invalidTableNames.length) return res.status(400).json({ error: "Unknown export table selection: " + invalidTableNames.join(", ") });
  const tableNames = normalizeRequestedDataTableNames(req.body?.tables);
  if (!tableNames.length) return res.status(400).json({ error: "Select at least one valid table to export." });
  const payload = buildDataExportPayload(tableNames);
  sendJsonDownload(res, payload, buildDataExportFilename(tableNames));
});

adminRouter.post("/admin/data/import/preview", (req, res) => {
  try {
    const bundle = parseDataImportBundle(req.body || {});
    res.json(previewDataImportBundle(bundle));
  } catch (error) {
    res.status(400).json({ error: cleanText(error?.message || error) || "Import preview failed." });
  }
});

adminRouter.post("/admin/data/import/commit", (req, res) => {
  try {
    const mode = cleanText(req.body?.mode || "upsert").toLowerCase();
    if (mode !== "upsert") return res.status(400).json({ error: "Only upsert import mode is supported in v1." });
    const bundle = parseDataImportBundle(req.body || {});
    const preview = previewDataImportBundle(bundle);
    const previewMap = new Map(preview.tables.map((table) => [table.name, table]));
    const invalidTableNames = collectInvalidRequestedDataTableNames(req.body?.tables, { importOnly: true });
    if (invalidTableNames.length) return res.status(400).json({ error: "Unsupported import table selection: " + invalidTableNames.join(", ") });
    const selectedTables = normalizeRequestedDataTableNames(req.body?.tables, { importOnly: true });
    if (!selectedTables.length) return res.status(400).json({ error: "Select at least one supported table to import." });
    for (const tableName of selectedTables) {
      const tablePreview = previewMap.get(tableName);
      if (!tablePreview) return res.status(400).json({ error: "Selected table is not present in the import bundle: " + tableName });
      if (!tablePreview.importSupported) return res.status(400).json({ error: "Import is not supported for " + tableName + " in v1." });
      if (tablePreview.issues.length) return res.status(400).json({ error: "Import preview found validation issues for " + tableName + ". Resolve them before importing." });
    }
    const importedAt = nowIso();
    const result = { ok: true, mode, importedAt, selectedTables, tables: [], totals: { inserted: 0, updated: 0, skipped: 0, failed: 0 } };
    const runImport = db.transaction(() => {
      for (const tableName of selectedTables) {
        const tableResult = importDataRowsForTable(tableName, bundle.tables[tableName] || [], importedAt);
        result.tables.push(tableResult);
        result.totals.inserted += tableResult.inserted;
        result.totals.updated += tableResult.updated;
        result.totals.skipped += tableResult.skipped;
        result.totals.failed += tableResult.failed;
      }
    });
    runImport();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: cleanText(error?.message || error) || "Import failed." });
  }
});

adminRouter.get("/admin/export/database.json", (req, res) => {
  const allTables = DATA_TABLE_DEFINITIONS.map((definition) => definition.name);
  const payload = buildDataExportPayload(allTables);
  sendJsonDownload(res, payload, buildDataExportFilename(allTables));
});

adminRouter.get("/admin/artworks", (req, res) => {
  const rows = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a
    ORDER BY a.updatedAt DESC
  `).all();

  res.json(rows.map(r => ({ ...r, featured: !!r.featured, tags: jsonArray(r.tags) })));
});

adminRouter.patch("/admin/artworks/:id", (req, res) => {
  const id = req.params.id;
  const cur = db.prepare(`SELECT * FROM artworks WHERE id=?`).get(id);
  if (!cur) return res.status(404).json({ error: "Not found" });

  const patch = req.body || {};
  const updatedAt = nowIso();

  const next = {
    title: patch.title ?? cur.title,
    year: patch.year ?? cur.year,
    series: patch.series ?? cur.series,
    description: patch.description ?? cur.description,
    alt: patch.alt ?? cur.alt,
    status: patch.status ?? cur.status,
    featured: patch.featured != null ? (patch.featured ? 1 : 0) : cur.featured,
    sortOrder: patch.sortOrder != null ? Number(patch.sortOrder) : cur.sortOrder,
    tags: patch.tags != null ? toJson(patch.tags) : cur.tags,
    publishedAt: (patch.status === "published" && !cur.publishedAt) ? updatedAt : cur.publishedAt,
    updatedAt
  };

    db.prepare(`
    UPDATE artworks SET
        title=@title, year=@year, series=@series, description=@description, alt=@alt,
        status=@status, featured=@featured, sortOrder=@sortOrder, tags=@tags,
        publishedAt=@publishedAt, updatedAt=@updatedAt
    WHERE id=@id
    `).run({ id, ...next });


  const out = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a WHERE a.id=?
  `).get(id);

  res.json({ ...out, featured: !!out.featured, tags: jsonArray(out.tags) });
});

// Helpers
const originalsDir = ORIGINALS_DIR;
const variantsDir  = VARIANTS_DIR;

function safeUnlink(p) {
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  } catch {}
}

function variantPathToFilepath(vPath) {
  // v.path is like "/media/a_xxx_web.jpg"
  const filename = path.basename(String(vPath || ""));
  return path.join(variantsDir, filename);
}

function mimeFromFilename(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".bmp") return "image/bmp";
  return "image/jpeg";
}

function extractTextFromOpenAiResponse(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const out = payload.output;
  if (!Array.isArray(out)) return "";
  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
    }
  }
  return "";
}

function parseTagsFromAiText(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const parts = raw
    .split(/[\n,;|]/g)
    .map((p) => p.replace(/^[-*•\d\.\)\s]+/, "").trim())
    .map((p) => p.replace(/^#/, "").replace(/["']/g, "").trim())
    .map((p) => p.toLowerCase())
    .map((p) => p.replace(/\s+/g, " "))
    .map((p) => p.replace(/[^a-z0-9 -]/g, "").trim())
    .filter(Boolean)
    .filter((p) => p.length <= 32);

  return Array.from(new Set(parts)).slice(0, 15);
}

function uid(prefix = "sp") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function cleanText(v) {
  return String(v || "").trim();
}

function cleanSlug(v) {
  return cleanText(v)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function cleanCategory(v) {
  const out = cleanText(v).toLowerCase();
  return out || "social";
}

function cleanExternalLinkCategory(v) {
  const out = cleanText(v).toLowerCase();
  return ["social", "portfolio", "shop", "video", "newsletter", "other"].includes(out) ? out : "other";
}

function cleanExternalLinkUrl(v) {
  return cleanText(v);
}

function cleanPostStatus(v) {
  const out = cleanText(v).toLowerCase();
  return ["draft", "queued", "posted", "failed", "skipped"].includes(out) ? out : "draft";
}

function toDbBool(v, fallback = 0) {
  if (v == null) return fallback ? 1 : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  const s = cleanText(v).toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return 1;
  if (["0", "false", "no", "off"].includes(s)) return 0;
  return fallback ? 1 : 0;
}

function parsePayload(raw) {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  const text = cleanText(raw);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function parseJsonObject(raw, fallback = {}) {
  if (raw == null) return { ...fallback };
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  const text = cleanText(raw);
  if (!text) return { ...fallback };
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return { ...fallback };
}

function normalizeSocialHashtag(tag) {
  return cleanText(tag)
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]+/gi, "")
    .toLowerCase();
}

function listDefaultSocialHashtags(raw) {
  const values = Array.isArray(raw)
    ? raw
    : cleanText(raw).split(/[,;\n]+/g);
  return Array.from(new Set(values.map(normalizeSocialHashtag).filter(Boolean)));
}

function composeSocialCaption({ caption, fallbackText = "", suffix = "", hashtags = [] }) {
  const base = cleanText(caption) || cleanText(fallbackText);
  const tail = cleanText(suffix);
  const hashtagLine = listDefaultSocialHashtags(hashtags).map((tag) => `#${tag}`).join(" ");
  return [base, tail, hashtagLine].filter(Boolean).join("\n\n").trim();
}
function mapSocialPostRow(row) {
  return {
    ...row,
    enabled: row.enabled == null ? undefined : !!row.enabled,
    payload: (() => {
      try { return JSON.parse(row.payload || "{}"); } catch { return {}; }
    })()
  };
}

function mapPlatformRow(row) {
  const config = parseJsonObject(row.configJson, {});
  const iconLocation = cleanText(row.iconLocation || config.iconLocation);
  return {
    ...row,
    enabled: !!row.enabled,
    iconLocation,
    config: {
      ...config,
      iconLocation
    },
    auth: parseJsonObject(row.authJson, {})
  };
}

function mapExternalLinkRow(row) {
  return {
    ...row,
    enabled: !!row.enabled,
    sortOrder: Number(row.sortOrder || 0)
  };
}

function selectExternalLinks() {
  return db.prepare(`
    SELECT id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    FROM external_links
    ORDER BY sortOrder ASC, updatedAt ASC, createdAt ASC, id ASC
  `).all();
}

function reindexExternalLinks() {
  const rows = selectExternalLinks();
  const stmt = db.prepare(`
    UPDATE external_links
    SET sortOrder=@sortOrder, updatedAt=@updatedAt
    WHERE id=@id
  `);
  const timestamp = nowIso();
  const tx = db.transaction((items) => {
    items.forEach((row, index) => {
      stmt.run({
        id: row.id,
        sortOrder: index,
        updatedAt: timestamp
      });
    });
  });
  tx(rows);
}

function validateExternalLinkInput(row, rowLabel = "Link") {
  const label = cleanText(row?.label);
  const url = cleanExternalLinkUrl(row?.url);
  if (!label || !url) {
    return { error: `${rowLabel} must include both a label and a URL.` };
  }
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    return { error: `${rowLabel} URL must start with https://, http://, mailto:, or tel:.` };
  }
  if (/^https?:\/\//i.test(url)) {
    try {
      new URL(url);
    } catch {
      return { error: `${rowLabel} has an invalid URL.` };
    }
  }

  return {
    value: {
      id: cleanSlug(row?.id) || uid("lnk"),
      label,
      url,
      category: cleanExternalLinkCategory(row?.category),
      enabled: toDbBool(row?.enabled, 1),
      sortOrder: Math.max(0, Math.floor(Number(row?.sortOrder) || 0))
    }
  };
}

adminRouter.get("/admin/external-links", (req, res) => {
  res.json(selectExternalLinks().map(mapExternalLinkRow));
});

adminRouter.put("/admin/external-links", (req, res) => {
  const body = req.body;
  const input = Array.isArray(body) ? body : body?.links;
  if (!Array.isArray(input)) {
    return res.status(400).json({ error: "Request body must be an array of links or an object with a links array." });
  }

  const normalized = [];
  const seen = new Set();
  for (let i = 0; i < input.length; i += 1) {
    const parsed = validateExternalLinkInput(input[i], `Link ${i + 1}`);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    let id = parsed.value.id;
    while (seen.has(id)) id = uid("lnk");
    seen.add(id);
    normalized.push({
      ...parsed.value,
      id,
      sortOrder: i
    });
  }

  const existingMap = new Map(
    db.prepare(`SELECT id, createdAt FROM external_links`).all().map((row) => [row.id, row.createdAt || nowIso()])
  );
  const saveLinksTxn = db.transaction((links) => {
    db.prepare(`DELETE FROM external_links`).run();
    const stmt = db.prepare(`
      INSERT INTO external_links (
        id, label, url, category, enabled, sortOrder, createdAt, updatedAt
      ) VALUES (
        @id, @label, @url, @category, @enabled, @sortOrder, @createdAt, @updatedAt
      )
    `);
    const timestamp = nowIso();
    for (const link of links) {
      stmt.run({
        ...link,
        createdAt: existingMap.get(link.id) || timestamp,
        updatedAt: timestamp
      });
    }
  });
  saveLinksTxn(normalized);

  res.json(selectExternalLinks().map(mapExternalLinkRow));
});

adminRouter.post("/admin/external-links", (req, res) => {
  const parsed = validateExternalLinkInput(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const sortOrder = req.body?.sortOrder != null
    ? Math.max(0, Math.floor(Number(req.body.sortOrder) || 0))
    : (db.prepare(`SELECT COUNT(*) AS count FROM external_links`).get().count || 0);
  const now = nowIso();
  db.prepare(`
    INSERT INTO external_links (
      id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    ) VALUES (
      @id, @label, @url, @category, @enabled, @sortOrder, @createdAt, @updatedAt
    )
  `).run({
    ...parsed.value,
    sortOrder,
    createdAt: now,
    updatedAt: now
  });

  const row = db.prepare(`
    SELECT id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    FROM external_links
    WHERE id=?
  `).get(parsed.value.id);

  res.status(201).json(mapExternalLinkRow(row));
});

adminRouter.patch("/admin/external-links/:id", (req, res) => {
  const id = cleanSlug(req.params.id);
  const cur = db.prepare(`
    SELECT id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    FROM external_links
    WHERE id=?
  `).get(id);
  if (!cur) return res.status(404).json({ error: "External link not found." });

  const parsed = validateExternalLinkInput({ ...cur, ...(req.body || {}), id }, "Link");
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  db.prepare(`
    UPDATE external_links
    SET label=@label, url=@url, category=@category, enabled=@enabled, sortOrder=@sortOrder, updatedAt=@updatedAt
    WHERE id=@id
  `).run({
    ...parsed.value,
    id,
    sortOrder: parsed.value.sortOrder,
    updatedAt: nowIso()
  });

  const row = db.prepare(`
    SELECT id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    FROM external_links
    WHERE id=?
  `).get(id);

  res.json(mapExternalLinkRow(row));
});

adminRouter.delete("/admin/external-links/:id", (req, res) => {
  const id = cleanSlug(req.params.id);
  const deleted = db.prepare(`DELETE FROM external_links WHERE id=?`).run(id);
  if (!deleted.changes) return res.status(404).json({ error: "External link not found." });
  reindexExternalLinks();
  res.json({ ok: true, id });
});

function resolveArtworkImageDataUri({ artworkId, imageUrl }) {
  const candidates = [];

  const fromInput = path.basename(String(imageUrl || ""));
  if (fromInput) candidates.push(fromInput);

  if (artworkId) {
    const web = db
      .prepare(`SELECT path FROM variants WHERE artworkId=? AND kind='web'`)
      .get(String(artworkId));
    const thumb = db
      .prepare(`SELECT path FROM variants WHERE artworkId=? AND kind='thumb'`)
      .get(String(artworkId));
    const webName = path.basename(String(web?.path || ""));
    const thumbName = path.basename(String(thumb?.path || ""));
    if (webName) candidates.push(webName);
    if (thumbName) candidates.push(thumbName);
  }

  const seen = new Set();
  for (const fileName of candidates) {
    if (!fileName || seen.has(fileName)) continue;
    seen.add(fileName);
    const fp = path.join(variantsDir, fileName);
    if (!fs.existsSync(fp)) continue;
    const b64 = fs.readFileSync(fp).toString("base64");
    const mime = mimeFromFilename(fileName);
    return `data:${mime};base64,${b64}`;
  }

  return "";
}

adminRouter.post("/admin/ai/describe-artwork", async (req, res) => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  const body = req.body || {};
  const artworkId = String(body.artworkId || "").trim();
  const imageUrl = String(body.imageUrl || "").trim();
  const title = String(body.title || "").trim();
  const year = String(body.year || "").trim();
  const series = String(body.series || "").trim();
  const alt = String(body.alt || "").trim();
  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t || "").trim()).filter(Boolean) : [];

  const imageDataUri = resolveArtworkImageDataUri({ artworkId, imageUrl });
  if (!imageDataUri) {
    return res.status(400).json({ error: "Unable to locate artwork image for AI description." });
  }

  const prompt = [
    "You are writing a concise artwork description for a gallery website.",
    "Write 2-4 sentences, clear and specific, no hype, no markdown.",
    `Title: ${title || "Untitled"}`,
    `Year: ${year || "Unknown"}`,
    `Series: ${series || "None"}`,
    `Alt text: ${alt || "None"}`,
    `Tags: ${tags.length ? tags.join(", ") : "None"}`,
    "Describe visual composition, color/mood, and texture or style if visible."
  ].join("\n");

  const model = String(process.env.OPENAI_IMAGE_DESCRIPTION_MODEL || "gpt-4.1-mini");
  const maxTokens = Number(process.env.OPENAI_IMAGE_DESCRIPTION_MAX_TOKENS || 220);

  try {
    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_output_tokens: Number.isFinite(maxTokens) ? maxTokens : 220,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUri }
            ]
          }
        ]
      })
    });

    let aiJson = null;
    try { aiJson = await aiRes.json(); } catch {}
    if (!aiRes.ok) {
      return res.status(aiRes.status).json({
        error: aiJson?.error?.message || `OpenAI request failed (${aiRes.status}).`
      });
    }

    const description = extractTextFromOpenAiResponse(aiJson);
    if (!description) {
      return res.status(502).json({ error: "OpenAI returned no description text." });
    }

    return res.json({ description });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "OpenAI request failed." });
  }
});

adminRouter.post("/admin/ai/generate-tags", async (req, res) => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  const body = req.body || {};
  const artworkId = String(body.artworkId || "").trim();
  const imageUrl = String(body.imageUrl || "").trim();
  const title = String(body.title || "").trim();
  const year = String(body.year || "").trim();
  const series = String(body.series || "").trim();
  const alt = String(body.alt || "").trim();
  const description = String(body.description || "").trim();
  const existingTags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];

  const imageDataUri = resolveArtworkImageDataUri({ artworkId, imageUrl });
  if (!imageDataUri) {
    return res.status(400).json({ error: "Unable to locate artwork image for AI tag generation." });
  }

  const prompt = [
    "Generate concise tags for a gallery artwork image.",
    "Return 6-14 tags as plain text only, comma-separated.",
    "Use lowercase, no hashtags, no numbering, no commentary.",
    "Prefer visual/style/theme terms over generic words.",
    `Title: ${title || "Untitled"}`,
    `Year: ${year || "Unknown"}`,
    `Series: ${series || "None"}`,
    `Alt text: ${alt || "None"}`,
    `Description: ${description || "None"}`,
    `Existing tags: ${existingTags.length ? existingTags.join(", ") : "None"}`
  ].join("\n");

  const model = String(process.env.OPENAI_IMAGE_TAGS_MODEL || "gpt-4.1-mini");
  const maxTokens = Number(process.env.OPENAI_IMAGE_TAGS_MAX_TOKENS || 140);

  try {
    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_output_tokens: Number.isFinite(maxTokens) ? maxTokens : 140,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUri }
            ]
          }
        ]
      })
    });

    let aiJson = null;
    try { aiJson = await aiRes.json(); } catch {}
    if (!aiRes.ok) {
      return res.status(aiRes.status).json({
        error: aiJson?.error?.message || `OpenAI request failed (${aiRes.status}).`
      });
    }

    const raw = extractTextFromOpenAiResponse(aiJson);
    const tags = parseTagsFromAiText(raw);
    if (!tags.length) {
      return res.status(502).json({ error: "OpenAI returned no usable tags." });
    }

    return res.json({ tags });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "OpenAI request failed." });
  }
});

adminRouter.get("/admin/social/platforms", (req, res) => {
  const allowedIds = getAllowedSocialPlatformIds();
  const placeholders = allowedIds.map(() => "?").join(", ");
  const rows = db.prepare(`
    SELECT id, name, category, enabled, iconLocation, configJson, authJson, createdAt, updatedAt
    FROM social_platforms
    WHERE id IN (${placeholders})
    ORDER BY enabled DESC, name COLLATE NOCASE ASC
  `).all(...allowedIds);

  res.json(rows.map(mapPlatformRow));
});

adminRouter.get("/admin/social/platform-options", (req, res) => {
  res.json(ALLOWED_SOCIAL_PLATFORMS);
});

adminRouter.post("/admin/social/platforms", (req, res) => {
  const body = req.body || {};
  const id = cleanSlug(body.id);
  const allowedPlatform = getAllowedSocialPlatform(id);
  const name = cleanText(body.name);
  if (!id) return res.status(400).json({ error: "Platform id is required." });
  if (!allowedPlatform) return res.status(400).json({ error: "Platform id is not allowed." });
  if (name && name !== allowedPlatform.name) {
    return res.status(400).json({ error: "Platform name must match the configured platform." });
  }

  const exists = db.prepare(`SELECT id FROM social_platforms WHERE id=?`).get(id);
  if (exists) return res.status(409).json({ error: "Platform id already exists." });

  const now = nowIso();
  const config = parseJsonObject(body.config, {});
  const iconLocation = cleanText(body.iconLocation || config.iconLocation);
  delete config.iconLocation;
  db.prepare(`
    INSERT INTO social_platforms (
      id, name, category, enabled, iconLocation, configJson, authJson, createdAt, updatedAt
    ) VALUES (
      @id, @name, @category, @enabled, @iconLocation, @configJson, @authJson, @createdAt, @updatedAt
    )
  `).run({
    id,
    name: allowedPlatform.name,
    category: allowedPlatform.category,
    enabled: toDbBool(body.enabled, 1),
    iconLocation,
    configJson: JSON.stringify(config),
    authJson: JSON.stringify(parseJsonObject(body.auth, {})),
    createdAt: now,
    updatedAt: now
  });

  const out = db.prepare(`
    SELECT id, name, category, enabled, iconLocation, configJson, authJson, createdAt, updatedAt
    FROM social_platforms
    WHERE id=?
  `).get(id);

  res.status(201).json(mapPlatformRow(out));
});

adminRouter.patch("/admin/social/platforms/:id", (req, res) => {
  const id = cleanText(req.params.id);
  const allowedPlatform = getAllowedSocialPlatform(id);
  if (!allowedPlatform) return res.status(404).json({ error: "Platform not found." });
  const cur = db.prepare(`SELECT * FROM social_platforms WHERE id=?`).get(id);
  if (!cur) return res.status(404).json({ error: "Platform not found." });

  const patch = req.body || {};
  const nextConfig =
    patch.config != null
      ? parseJsonObject(patch.config, {})
      : parseJsonObject(cur.configJson, {});
  const nextIconLocation =
    patch.iconLocation != null || patch.config != null
      ? cleanText(patch.iconLocation || nextConfig.iconLocation)
      : cleanText(cur.iconLocation || nextConfig.iconLocation);
  delete nextConfig.iconLocation;
  const next = {
    name: allowedPlatform.name,
    category: allowedPlatform.category,
    enabled: patch.enabled != null ? toDbBool(patch.enabled, !!cur.enabled) : cur.enabled,
    iconLocation: nextIconLocation,
    configJson: JSON.stringify(nextConfig),
    authJson:
      patch.auth != null
        ? JSON.stringify(parseJsonObject(patch.auth, {}))
        : (cur.authJson || "{}"),
    updatedAt: nowIso()
  };

  db.prepare(`
    UPDATE social_platforms
    SET
      name=@name,
      category=@category,
      enabled=@enabled,
      iconLocation=@iconLocation,
      configJson=@configJson,
      authJson=@authJson,
      updatedAt=@updatedAt
    WHERE id=@id
  `).run({ id, ...next });

  const out = db.prepare(`
    SELECT id, name, category, enabled, iconLocation, configJson, authJson, createdAt, updatedAt
    FROM social_platforms
    WHERE id=?
  `).get(id);

  res.json(mapPlatformRow(out));
});

adminRouter.delete("/admin/social/platforms/:id", (req, res) => {
  const id = cleanText(req.params.id);
  const deleted = db.prepare(`DELETE FROM social_platforms WHERE id=?`).run(id);
  if (!deleted.changes) return res.status(404).json({ error: "Platform not found." });
  res.json({ ok: true, id });
});

adminRouter.get("/admin/social/posts", (req, res) => {
  const artworkId = cleanText(req.query.artworkId);
  const platformId = cleanText(req.query.platformId);
  const status = cleanText(req.query.status).toLowerCase();
  const enabledOnly = toDbBool(req.query.enabledOnly, 0);

  const where = [];
  const params = {};

  if (artworkId) {
    where.push("asp.artworkId = @artworkId");
    params.artworkId = artworkId;
  }
  if (platformId) {
    where.push("asp.platformId = @platformId");
    params.platformId = platformId;
  }
  if (status) {
    where.push("asp.status = @status");
    params.status = status;
  }
  if (enabledOnly) {
    where.push("sp.enabled = 1");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`
    SELECT
      asp.*,
      sp.name AS platformName,
      sp.category AS platformCategory,
      sp.iconLocation AS platformIconLocation,
      sp.enabled AS platformEnabled,
      a.title AS artworkTitle,
      a.status AS artworkStatus,
      (SELECT path FROM variants v WHERE v.artworkId = a.id AND v.kind = 'thumb') AS artworkThumb,
      (SELECT path FROM variants v WHERE v.artworkId = a.id AND v.kind = 'web') AS artworkImage
    FROM artwork_social_posts asp
    JOIN social_platforms sp ON sp.id = asp.platformId
    JOIN artworks a ON a.id = asp.artworkId
    ${whereSql}
    ORDER BY asp.updatedAt DESC
  `).all(params);

  res.json(rows.map((r) => ({
    ...mapSocialPostRow(r),
    platformEnabled: !!r.platformEnabled
  })));
});

adminRouter.get("/admin/artworks/:id/social-posts", (req, res) => {
  const artworkId = cleanText(req.params.id);
  const art = db.prepare(`SELECT id, title FROM artworks WHERE id=?`).get(artworkId);
  if (!art) return res.status(404).json({ error: "Artwork not found." });

  const rows = db.prepare(`
    SELECT
      sp.id AS platformId,
      sp.name AS platformName,
      sp.category AS platformCategory,
      sp.iconLocation AS platformIconLocation,
      sp.enabled AS platformEnabled,
      asp.id,
      asp.status,
      asp.caption,
      asp.postUrl,
      asp.externalPostId,
      asp.payload,
      asp.errorMessage,
      asp.postedAt,
      asp.createdAt,
      asp.updatedAt
    FROM social_platforms sp
    LEFT JOIN artwork_social_posts asp
      ON asp.platformId = sp.id
      AND asp.artworkId = @artworkId
    ORDER BY sp.enabled DESC, sp.name COLLATE NOCASE ASC
  `).all({ artworkId });

  res.json({
    artwork: art,
    posts: rows.map((r) => ({
      ...mapSocialPostRow(r),
      platformEnabled: !!r.platformEnabled
    }))
  });
});

adminRouter.put("/admin/artworks/:id/social-posts/:platformId", (req, res) => {
  const artworkId = cleanText(req.params.id);
  const platformId = cleanText(req.params.platformId);

  const art = db.prepare(`SELECT id FROM artworks WHERE id=?`).get(artworkId);
  if (!art) return res.status(404).json({ error: "Artwork not found." });
  const platform = db.prepare(`SELECT id FROM social_platforms WHERE id=?`).get(platformId);
  if (!platform) return res.status(404).json({ error: "Platform not found." });

  const cur = db
    .prepare(`SELECT * FROM artwork_social_posts WHERE artworkId=? AND platformId=?`)
    .get(artworkId, platformId);

  const patch = req.body || {};
  const now = nowIso();
  const status = patch.status != null ? cleanPostStatus(patch.status) : (cur?.status || "draft");
  const next = {
    caption: patch.caption != null ? cleanText(patch.caption) : (cur?.caption || ""),
    postUrl: patch.postUrl != null ? cleanText(patch.postUrl) : (cur?.postUrl || ""),
    externalPostId: patch.externalPostId != null ? cleanText(patch.externalPostId) : (cur?.externalPostId || ""),
    status,
    payload: patch.payload != null ? JSON.stringify(parsePayload(patch.payload)) : (cur?.payload || "{}"),
    errorMessage: patch.errorMessage != null ? cleanText(patch.errorMessage) : (cur?.errorMessage || ""),
    postedAt:
      patch.postedAt != null
        ? cleanText(patch.postedAt) || null
        : (status === "posted" ? (cur?.postedAt || now) : (cur?.postedAt || null)),
    updatedAt: now
  };

  if (cur) {
    db.prepare(`
      UPDATE artwork_social_posts
      SET status=@status, caption=@caption, postUrl=@postUrl, externalPostId=@externalPostId,
          payload=@payload, errorMessage=@errorMessage, postedAt=@postedAt, updatedAt=@updatedAt
      WHERE artworkId=@artworkId AND platformId=@platformId
    `).run({ artworkId, platformId, ...next });
  } else {
    db.prepare(`
      INSERT INTO artwork_social_posts (
        id, artworkId, platformId, status, caption, postUrl, externalPostId,
        payload, errorMessage, postedAt, createdAt, updatedAt
      ) VALUES (
        @id, @artworkId, @platformId, @status, @caption, @postUrl, @externalPostId,
        @payload, @errorMessage, @postedAt, @createdAt, @updatedAt
      )
    `).run({
      id: uid("asp"),
      artworkId,
      platformId,
      ...next,
      createdAt: now
    });
  }

  const out = db.prepare(`
    SELECT
      asp.*,
      sp.name AS platformName,
      sp.category AS platformCategory,
      sp.iconLocation AS platformIconLocation,
      sp.enabled AS platformEnabled
    FROM artwork_social_posts asp
    JOIN social_platforms sp ON sp.id = asp.platformId
    WHERE asp.artworkId=? AND asp.platformId=?
  `).get(artworkId, platformId);

  res.json({
    ...mapSocialPostRow(out),
    platformEnabled: !!out.platformEnabled
  });
});

adminRouter.post("/admin/artworks/:id/social-posts/:platformId/publish", async (req, res) => {
  const artworkId = cleanText(req.params.id);
  const platformId = cleanText(req.params.platformId).toLowerCase();
  if (platformId !== "bluesky" && platformId !== "linkedin") {
    return res.status(400).json({ error: "Direct publish is currently supported only for Bluesky and LinkedIn." });
  }

  const artwork = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a
    WHERE a.id=?
  `).get(artworkId);
  if (!artwork) return res.status(404).json({ error: "Artwork not found." });

  const platformRow = db.prepare(`SELECT * FROM social_platforms WHERE id=?`).get(platformId);
  if (!platformRow) return res.status(404).json({ error: "Platform not found." });
  const platform = mapPlatformRow(platformRow);
  if (!platform.enabled) return res.status(400).json({ error: "Platform is disabled." });

  const postingMode = cleanText(platform.config?.postingMode || "manual").toLowerCase();
  if (postingMode !== "api") {
    return res.status(400).json({ error: `${platform.name || platformId} is not in API mode.` });
  }

  const currentPost = db.prepare(`SELECT * FROM artwork_social_posts WHERE artworkId=? AND platformId=?`).get(artworkId, platformId);
  const text = composeSocialCaption({
    caption: currentPost?.caption,
    fallbackText: artwork.description || artwork.title,
    suffix: platform.config?.defaultCaptionSuffix,
    hashtags: platform.config?.defaultHashtags
  });
  if (!text) {
    return res.status(400).json({ error: `${platform.name || platformId} post text is empty.` });
  }
  if (platformId === "bluesky" && text.length > 300) {
    return res.status(400).json({ error: `Bluesky post exceeds 300 characters (${text.length}).` });
  }
  if (platformId === "linkedin" && text.length > 3000) {
    return res.status(400).json({ error: `LinkedIn post exceeds 3000 characters (${text.length}).` });
  }

  const imagePath = cleanText(artwork.image || artwork.thumb);
  if (!imagePath) {
    return res.status(400).json({ error: "Artwork image is not available for publishing." });
  }
  const imageFile = variantPathToFilepath(imagePath);
  if (!imageFile || !fs.existsSync(imageFile)) {
    return res.status(400).json({ error: "Artwork media file could not be found on the server." });
  }

  const imageBuffer = fs.readFileSync(imageFile);
  const imageMimeType = mimeFromFilename(imageFile);
  const altText = cleanText(artwork.alt || artwork.title || artwork.description || "Artwork");
  const now = nowIso();

  try {
    let published;
    let publishPayload;

    if (platformId === "bluesky") {
      const identifier = cleanText(platform.auth?.clientId || platform.config?.accountHandle);
      const appPassword = cleanText(platform.auth?.clientSecret);
      if (!identifier || !appPassword) {
        return res.status(400).json({ error: "Bluesky identifier and app password are required." });
      }

      published = await publishArtworkToBluesky({
        identifier,
        appPassword,
        text,
        imageBuffer,
        imageMimeType,
        altText,
        aspectRatio: {
          width: Number(artwork.width || 0),
          height: Number(artwork.height || 0)
        },
        serviceUrl: cleanText(process.env.BLUESKY_PDS_URL || "https://bsky.social"),
        handle: cleanText(platform.config?.accountHandle)
      });

      publishPayload = {
        provider: "bluesky",
        publishedAt: now,
        uri: published.uri,
        cid: published.cid,
        did: published.did,
        handle: published.handle,
        textLength: text.length
      };
    } else {
      const accessToken = cleanText(platform.auth?.accessToken || platform.auth?.clientSecret);
      const owner = cleanText(platform.config?.accountId || platform.auth?.clientId || platform.config?.accountHandle);
      if (!accessToken || !owner) {
        return res.status(400).json({ error: "LinkedIn access token and organization/account id are required." });
      }

      published = await publishArtworkToLinkedIn({
        accessToken,
        commentary: text,
        imageBuffer,
        imageMimeType,
        altText,
        title: cleanText(artwork.title || "Artwork"),
        owner,
        apiBaseUrl: cleanText(process.env.LINKEDIN_API_BASE_URL || "https://api.linkedin.com"),
        apiVersion: cleanText(process.env.LINKEDIN_API_VERSION || "202601")
      });

      publishPayload = {
        provider: "linkedin",
        publishedAt: now,
        owner: published.owner,
        imageUrn: published.imageUrn,
        postUrn: published.postUrn,
        apiVersion: published.apiVersion,
        textLength: text.length
      };
    }

    const next = {
      caption: currentPost?.caption || "",
      postUrl: published.postUrl,
      externalPostId: published.externalPostId,
      status: "posted",
      payload: JSON.stringify(publishPayload),
      errorMessage: "",
      postedAt: now,
      updatedAt: now
    };

    if (currentPost) {
      db.prepare(`
        UPDATE artwork_social_posts
        SET status=@status, caption=@caption, postUrl=@postUrl, externalPostId=@externalPostId,
            payload=@payload, errorMessage=@errorMessage, postedAt=@postedAt, updatedAt=@updatedAt
        WHERE artworkId=@artworkId AND platformId=@platformId
      `).run({ artworkId, platformId, ...next });
    } else {
      db.prepare(`
        INSERT INTO artwork_social_posts (
          id, artworkId, platformId, status, caption, postUrl, externalPostId,
          payload, errorMessage, postedAt, createdAt, updatedAt
        ) VALUES (
          @id, @artworkId, @platformId, @status, @caption, @postUrl, @externalPostId,
          @payload, @errorMessage, @postedAt, @createdAt, @updatedAt
        )
      `).run({
        id: uid("asp"),
        artworkId,
        platformId,
        ...next,
        createdAt: now
      });
    }

    const out = db.prepare(`
      SELECT
        asp.*,
        sp.name AS platformName,
        sp.category AS platformCategory,
        sp.iconLocation AS platformIconLocation,
        sp.enabled AS platformEnabled
      FROM artwork_social_posts asp
      JOIN social_platforms sp ON sp.id = asp.platformId
      WHERE asp.artworkId=? AND asp.platformId=?
    `).get(artworkId, platformId);

    return res.json({
      ...mapSocialPostRow(out),
      platformEnabled: !!out.platformEnabled
    });
  } catch (err) {
    const failure = {
      caption: currentPost?.caption || "",
      postUrl: currentPost?.postUrl || "",
      externalPostId: currentPost?.externalPostId || "",
      status: "failed",
      payload: JSON.stringify({
        provider: platformId,
        attemptedAt: now,
        textLength: text.length
      }),
      errorMessage: cleanText(err?.message || err) || `${platform.name || platformId} publish failed.`,
      postedAt: currentPost?.postedAt || null,
      updatedAt: now
    };

    if (currentPost) {
      db.prepare(`
        UPDATE artwork_social_posts
        SET status=@status, caption=@caption, postUrl=@postUrl, externalPostId=@externalPostId,
            payload=@payload, errorMessage=@errorMessage, postedAt=@postedAt, updatedAt=@updatedAt
        WHERE artworkId=@artworkId AND platformId=@platformId
      `).run({ artworkId, platformId, ...failure });
    } else {
      db.prepare(`
        INSERT INTO artwork_social_posts (
          id, artworkId, platformId, status, caption, postUrl, externalPostId,
          payload, errorMessage, postedAt, createdAt, updatedAt
        ) VALUES (
          @id, @artworkId, @platformId, @status, @caption, @postUrl, @externalPostId,
          @payload, @errorMessage, @postedAt, @createdAt, @updatedAt
        )
      `).run({
        id: uid("asp"),
        artworkId,
        platformId,
        ...failure,
        createdAt: now
      });
    }

    return res.status(502).json({ error: failure.errorMessage });
  }
});
adminRouter.delete("/admin/artworks/:id/social-posts/:platformId", (req, res) => {
  const artworkId = cleanText(req.params.id);
  const platformId = cleanText(req.params.platformId);

  const deleted = db
    .prepare(`DELETE FROM artwork_social_posts WHERE artworkId=? AND platformId=?`)
    .run(artworkId, platformId);

  if (!deleted.changes) return res.status(404).json({ error: "Social post not found." });
  res.json({ ok: true, artworkId, platformId });
});

/**
 * DELETE an artwork:
 * - delete variant files (thumb/web)
 * - delete original file
 * - delete DB rows from variants + artworks
 */
adminRouter.delete("/admin/artworks/:id", (req, res) => {
  const id = req.params.id;

  const art = db.prepare(`SELECT * FROM artworks WHERE id=?`).get(id);
  if (!art) return res.status(404).json({ error: "Not found" });

  const vars = db.prepare(`SELECT * FROM variants WHERE artworkId=?`).all(id);

  // Delete variant files
  for (const v of vars) {
    safeUnlink(variantPathToFilepath(v.path));
  }

  // Delete original file (private)
  safeUnlink(art.originalPath);

  // Delete DB rows
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM variants WHERE artworkId=?`).run(id);
    db.prepare(`DELETE FROM artworks WHERE id=?`).run(id);
  });
  tx();

  res.json({
    ok: true,
    deleted: {
      artworkId: id,
      variantCount: vars.length,
      originalDeleted: !!art.originalPath
    }
  });
});

/**
 * Cleanup orphan files + broken DB rows:
 * - remove variant files not referenced by DB
 * - remove original files not referenced by DB
 * - remove DB variant rows whose files are missing
 */
adminRouter.post("/admin/cleanup", (req, res) => {
  fs.mkdirSync(originalsDir, { recursive: true });
  fs.mkdirSync(variantsDir, { recursive: true });

  // Build referenced sets from DB
  const dbVariants = db.prepare(`SELECT id, path FROM variants`).all();
  const referencedVariantFiles = new Set(
    dbVariants.map(v => path.basename(String(v.path || ""))).filter(Boolean)
  );

  const dbArtworks = db.prepare(`SELECT id, originalPath FROM artworks`).all();
  const referencedOriginalFiles = new Set(
    dbArtworks.map(a => path.basename(String(a.originalPath || ""))).filter(Boolean)
  );

  // Delete orphan variant files on disk
  let deletedVariantFiles = 0;
  for (const f of fs.readdirSync(variantsDir)) {
    if (!referencedVariantFiles.has(f)) {
      safeUnlink(path.join(variantsDir, f));
      deletedVariantFiles++;
    }
  }

  // Delete orphan original files on disk
  // (only if filename looks like our pattern "a_xxx__whatever.ext" to avoid surprises)
  let deletedOriginalFiles = 0;
  for (const f of fs.readdirSync(originalsDir)) {
    const looksOurs = /^a_[0-9a-f]{16}__/.test(f) || /^a_[0-9a-f]{8,}__/.test(f);
    if (!looksOurs) continue;

    if (!referencedOriginalFiles.has(f)) {
      safeUnlink(path.join(originalsDir, f));
      deletedOriginalFiles++;
    }
  }

  // Remove DB variant rows whose files are missing
  let deletedBrokenVariantRows = 0;
  const delStmt = db.prepare(`DELETE FROM variants WHERE id=?`);
  for (const v of dbVariants) {
    const fp = variantPathToFilepath(v.path);
    if (!fs.existsSync(fp)) {
      delStmt.run(v.id);
      deletedBrokenVariantRows++;
    }
  }

  res.json({
    ok: true,
    deletedVariantFiles,
    deletedOriginalFiles,
    deletedBrokenVariantRows
  });
});









