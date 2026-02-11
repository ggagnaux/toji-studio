import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import { db, nowIso, jsonArray, toJson } from "../db.js";

export const adminRouter = Router();

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
const originalsDir = path.resolve("storage/originals");
const variantsDir  = path.resolve("storage/variants");

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
