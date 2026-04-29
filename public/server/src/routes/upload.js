import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  db,
  nowIso,
  jsonArray,
  toJson,
  ORIGINALS_DIR,
  VARIANTS_DIR,
  getImageVariantSettings
} from "../db.js";

export const uploadRouter = Router();

const originalsDir = ORIGINALS_DIR;
const variantsDir = VARIANTS_DIR;
fs.mkdirSync(originalsDir, { recursive: true });
fs.mkdirSync(variantsDir, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function uid(prefix="a") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function safeBase(name) {
  return String(name || "image").replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80);
}

export function normTag(t) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[#]+/, "");
}

export function parseTags(raw) {
  if (Array.isArray(raw)) return Array.from(new Set(raw.map(normTag).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) return Array.from(new Set(arr.map(normTag).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    } catch {}
  }
  return Array.from(new Set(text.split(/[,;\n]+/g).map(normTag).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function cleanSeries(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function normalizeSeriesLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSeriesSlugsInput(raw) {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const item of list) {
    if (item == null) continue;
    if (Array.isArray(item)) {
      out.push(...parseSeriesSlugsInput(item));
      continue;
    }
    const text = String(item).trim();
    if (!text) continue;
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("seriesSlugs JSON must be an array.");
        out.push(...parseSeriesSlugsInput(parsed));
        continue;
      } catch {
        throw new Error("seriesSlugs must be an array or a valid JSON array string.");
      }
    }
    out.push(...text.split(/[;,\n]+/g));
  }
  return out
    .map((value) => normalizeSeriesLookupKey(value))
    .filter(Boolean);
}

function resolveSeriesMembershipWriteInput({ rawSeriesSlugs, rawLegacySeries }) {
  const hasSeriesSlugs = rawSeriesSlugs !== undefined;
  const hasLegacySeries = rawLegacySeries !== undefined;
  if (!hasSeriesSlugs && !hasLegacySeries) {
    return { provided: false, seriesSlugs: [], primaryLegacySeries: "" };
  }

  if (!hasSeriesSlugs) {
    return {
      provided: true,
      seriesSlugs: [],
      primaryLegacySeries: cleanSeries(rawLegacySeries || "")
    };
  }

  const rows = db.prepare(`SELECT slug, name FROM series`).all();
  const canonicalByKey = new Map();
  const nameBySlug = new Map();
  for (const row of rows) {
    const slug = String(row?.slug || "").trim();
    if (!slug) continue;
    const name = cleanSeries(row?.name || "");
    canonicalByKey.set(slug.toLowerCase(), slug);
    canonicalByKey.set(normalizeSeriesLookupKey(slug), slug);
    if (name) {
      canonicalByKey.set(name.toLowerCase(), slug);
      canonicalByKey.set(normalizeSeriesLookupKey(name), slug);
      nameBySlug.set(slug, name);
    }
  }

  const requested = parseSeriesSlugsInput(rawSeriesSlugs);

  const seen = new Set();
  const unknown = [];
  const seriesSlugs = [];
  for (const value of requested) {
    const key = String(value || "").trim();
    if (!key) continue;
    const resolved =
      canonicalByKey.get(key.toLowerCase()) ||
      canonicalByKey.get(normalizeSeriesLookupKey(key)) ||
      "";
    if (!resolved) {
      unknown.push(key);
      continue;
    }
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    seriesSlugs.push(resolved);
  }

  if (unknown.length) {
    return {
      provided: true,
      seriesSlugs: [],
      primaryLegacySeries: "",
      error: `Unknown series slug(s): ${unknown.join(", ")}.`
    };
  }

  const primarySlug = seriesSlugs[0] || "";
  return {
    provided: true,
    seriesSlugs,
    primaryLegacySeries: primarySlug ? (nameBySlug.get(primarySlug) || primarySlug) : ""
  };
}

export function cleanYear(y) {
  return String(y || "").trim();
}

export function cleanStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  return v === "published" || v === "hidden" || v === "draft" ? v : "draft";
}

export function originalsPathFor(artworkId, originalname) {
  const base = safeBase(originalname);
  const origName = `${artworkId}__${base}`;
  return path.join(originalsDir, origName);
}


async function writeVariant({ artworkId, kind, inputBuffer, maxW, quality=82 }) {
  const outName = `${artworkId}_${kind}.jpg`;
  const outPath = path.join(variantsDir, outName);

  const img = sharp(inputBuffer).rotate(); // auto-orient
  const meta = await img.metadata();

  const resized = sharp(inputBuffer)
    .rotate()
    .resize({ width: maxW, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true });

  await resized.toFile(outPath);

  const stat = fs.statSync(outPath);
  const servedPath = `/media/${outName}`;

  const meta2 = await sharp(outPath).metadata();

  db.prepare(`
    INSERT INTO variants (id, artworkId, kind, path, width, height, sizeBytes, createdAt)
    VALUES (@id, @artworkId, @kind, @path, @width, @height, @sizeBytes, @createdAt)
    ON CONFLICT(artworkId, kind) DO UPDATE SET
      path=excluded.path, width=excluded.width, height=excluded.height, sizeBytes=excluded.sizeBytes
  `).run({
    id: uid("v"),
    artworkId,
    kind,
    path: servedPath,
    width: meta2.width || null,
    height: meta2.height || null,
    sizeBytes: stat.size,
    createdAt: nowIso()
  });

  return { servedPath, width: meta2.width, height: meta2.height, sizeBytes: stat.size, meta };
}

async function writeConfiguredVariants({ artworkId, inputBuffer }) {
  const settings = getImageVariantSettings();
  await writeVariant({
    artworkId,
    kind: "thumb",
    inputBuffer,
    maxW: settings.thumbMaxWidth,
    quality: settings.thumbQuality
  });
  await writeVariant({
    artworkId,
    kind: "web",
    inputBuffer,
    maxW: settings.webMaxWidth,
    quality: settings.webQuality
  });
}

// Replace the original image for an existing artwork and regenerate variants
uploadRouter.post("/admin/artworks/:id/replace-image", upload.single("file"), async (req, res) => {
  const artworkId = req.params.id;
  const f = req.file;
  if (!f) return res.status(400).json({ error: "No file" });

  const cur = db.prepare(`SELECT * FROM artworks WHERE id=?`).get(artworkId);
  if (!cur) return res.status(404).json({ error: "Not found" });

  // Write new original (private)
  const origPath = originalsPathFor(artworkId, f.originalname);
  fs.writeFileSync(origPath, f.buffer);

  // Update dimensions
  const meta = await sharp(f.buffer).rotate().metadata();
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE artworks
    SET originalPath=@originalPath, width=@width, height=@height, updatedAt=@updatedAt
    WHERE id=@id
  `).run({
    id: artworkId,
    originalPath: origPath,
    width: meta.width || null,
    height: meta.height || null,
    updatedAt
  });

  // Regenerate variants
  await writeConfiguredVariants({ artworkId, inputBuffer: f.buffer });

  const out = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image,
      (SELECT GROUP_CONCAT(seriesSlug) FROM (SELECT seriesSlug FROM artwork_series WHERE artworkId=a.id ORDER BY isPrimary DESC, createdAt ASC)) AS _seriesSlugsRaw
    FROM artworks a WHERE a.id=?
  `).get(artworkId);

  const { _seriesSlugsRaw: _replaceSlugsRaw, ...replaceOut } = out;
  res.json({ ...replaceOut, featured: !!replaceOut.featured, tags: jsonArray(replaceOut.tags), seriesSlugs: _replaceSlugsRaw ? _replaceSlugsRaw.split(',') : [] });
});

// Rebuild thumb/web variants from the stored original (no change to metadata)
uploadRouter.post("/admin/artworks/:id/regenerate-variants", async (req, res) => {
  const artworkId = req.params.id;

  const cur = db.prepare(`SELECT * FROM artworks WHERE id=?`).get(artworkId);
  if (!cur) return res.status(404).json({ error: "Not found" });

  if (!cur.originalPath || !fs.existsSync(cur.originalPath)) {
    return res.status(400).json({ error: "Original file missing on server" });
  }

  const buf = fs.readFileSync(cur.originalPath);

  await writeConfiguredVariants({ artworkId, inputBuffer: buf });

  const out = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image,
      (SELECT GROUP_CONCAT(seriesSlug) FROM (SELECT seriesSlug FROM artwork_series WHERE artworkId=a.id ORDER BY isPrimary DESC, createdAt ASC)) AS _seriesSlugsRaw
    FROM artworks a WHERE a.id=?
  `).get(artworkId);

  const { _seriesSlugsRaw: _regenSlugsRaw, ...regenOut } = out;
  res.json({ ...regenOut, featured: !!regenOut.featured, tags: jsonArray(regenOut.tags), seriesSlugs: _regenSlugsRaw ? _regenSlugsRaw.split(',') : [] });
});


uploadRouter.post("/admin/upload", upload.array("files", 30), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: "No files" });

  const created = [];
  const skipped = [];
  const createdAt = nowIso();
  const batchTags = parseTags(req.body?.tags);
  let seriesWrite;
  try {
    seriesWrite = resolveSeriesMembershipWriteInput({
      rawSeriesSlugs: req.body?.seriesSlugs,
      rawLegacySeries: req.body?.series
    });
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || error || "Invalid series input.") });
  }
  if (seriesWrite.error) {
    return res.status(400).json({ error: seriesWrite.error });
  }
  const batchSeriesSlugs = seriesWrite.seriesSlugs;
  const batchSeries = seriesWrite.primaryLegacySeries;
  const batchYear = cleanYear(req.body?.year);
  const batchStatus = cleanStatus(req.body?.status);
  const batchPublishedAt = batchStatus === "published" ? createdAt : null;
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
      @isPrimary,
      0,
      @createdAt,
      @updatedAt
    )
  `);

  for (const f of files) {
    const base = safeBase(f.originalname);

    // Prevent duplicate uploads by original filename (case-insensitive).
    const existing = db.prepare(`
      SELECT id
      FROM artworks
      WHERE lower(originalPath) LIKE '%' || '__' || lower(@base)
      LIMIT 1
    `).get({ base });
    if (existing?.id) {
      skipped.push({
        filename: base,
        reason: "duplicate_filename",
        existingId: String(existing.id)
      });
      continue;
    }

    const artworkId = uid("a");
    const origName = `${artworkId}__${base}`;
    const origPath = path.join(originalsDir, origName);

    // Save original privately
    fs.writeFileSync(origPath, f.buffer);

    // Determine dimensions from original
    const meta = await sharp(f.buffer).rotate().metadata();

    // Insert artwork record (draft by default)
    db.prepare(`
      INSERT INTO artworks (
        id, title, year, series, description, alt, status, featured, sortOrder, tags,
        createdAt, updatedAt, publishedAt, originalPath, width, height
      ) VALUES (
        @id, @title, @year, @series, '', '', @status, 0, 0, @tags,
        @createdAt, @updatedAt, @publishedAt, @originalPath, @width, @height
      )
    `).run({
      id: artworkId,
      title: base.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled",
      year: batchYear,
      series: batchSeries,
      status: batchStatus,
      tags: toJson(batchTags),
      createdAt,
      updatedAt: createdAt,
      publishedAt: batchPublishedAt,
      originalPath: origPath,
      width: meta.width || null,
      height: meta.height || null
    });

    if (batchSeriesSlugs.length) {
      for (let index = 0; index < batchSeriesSlugs.length; index += 1) {
        insertMembership.run({
          artworkId,
          seriesSlug: batchSeriesSlugs[index],
          isPrimary: index === 0 ? 1 : 0,
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    // Create variants (only these are served)
    await writeConfiguredVariants({ artworkId, inputBuffer: f.buffer });

    const out = db.prepare(`
      SELECT a.*,
        (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
        (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image,
        (SELECT GROUP_CONCAT(seriesSlug) FROM (SELECT seriesSlug FROM artwork_series WHERE artworkId=a.id ORDER BY isPrimary DESC, createdAt ASC)) AS _seriesSlugsRaw
      FROM artworks a WHERE a.id=?
    `).get(artworkId);

    const { _seriesSlugsRaw: _uploadSlugsRaw, ...uploadOut } = out;
    created.push({ ...uploadOut, featured: !!uploadOut.featured, tags: jsonArray(uploadOut.tags), seriesSlugs: _uploadSlugsRaw ? _uploadSlugsRaw.split(',') : [] });
  }

  res.json({ created, skipped });
});

