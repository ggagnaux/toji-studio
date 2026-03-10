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

function safeBase(name) {
  return String(name || "image").replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80);
}

function normTag(t) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[#]+/, "");
}

function parseTags(raw) {
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

function cleanSeries(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function cleanYear(y) {
  return String(y || "").trim();
}

function cleanStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  return v === "published" || v === "hidden" || v === "draft" ? v : "draft";
}

function originalsPathFor(artworkId, originalname) {
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
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a WHERE a.id=?
  `).get(artworkId);

  res.json({ ...out, featured: !!out.featured, tags: jsonArray(out.tags) });
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
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a WHERE a.id=?
  `).get(artworkId);

  res.json({ ...out, featured: !!out.featured, tags: jsonArray(out.tags) });
});


uploadRouter.post("/admin/upload", upload.array("files", 30), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: "No files" });

  const created = [];
  const skipped = [];
  const createdAt = nowIso();
  const batchTags = parseTags(req.body?.tags);
  const batchSeries = cleanSeries(req.body?.series);
  const batchYear = cleanYear(req.body?.year);
  const batchStatus = cleanStatus(req.body?.status);
  const batchPublishedAt = batchStatus === "published" ? createdAt : null;

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

    // Create variants (only these are served)
    await writeConfiguredVariants({ artworkId, inputBuffer: f.buffer });

    const out = db.prepare(`
      SELECT a.*,
        (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
        (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
      FROM artworks a WHERE a.id=?
    `).get(artworkId);

    created.push({ ...out, featured: !!out.featured, tags: jsonArray(out.tags) });
  }

  res.json({ created, skipped });
});
