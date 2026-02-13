import { Router } from "express";
import { db, nowIso } from "../db.js";

export const seriesRouter = Router();

function normSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

seriesRouter.get("/admin/series", (req, res) => {
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT path FROM variants v
        WHERE v.artworkId=s.coverArtworkId AND v.kind='thumb') AS coverThumb
    FROM series s
    ORDER BY s.sortOrder ASC, s.name ASC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    isPublic: !!r.isPublic
  })));
});

// Upsert series meta
seriesRouter.put("/admin/series/:slug", (req, res) => {
  const slug = normSlug(req.params.slug);
  if (!slug) return res.status(400).json({ error: "Bad slug" });

  const body = req.body || {};
  const now = nowIso();

  const existing = db.prepare(`SELECT * FROM series WHERE slug=?`).get(slug);

  const name = String(body.name ?? existing?.name ?? slug).trim() || slug;
  const description = String(body.description ?? existing?.description ?? "");
  const sortOrder = Number(body.sortOrder ?? existing?.sortOrder ?? 0);
  const isPublic = body.isPublic != null ? (body.isPublic ? 1 : 0) : (existing?.isPublic ?? 1);
  const coverArtworkId = (body.coverArtworkId === "" || body.coverArtworkId == null)
    ? null
    : String(body.coverArtworkId);

  if (!existing) {
    db.prepare(`
      INSERT INTO series (slug, name, description, sortOrder, isPublic, coverArtworkId, createdAt, updatedAt)
      VALUES (@slug, @name, @description, @sortOrder, @isPublic, @coverArtworkId, @createdAt, @updatedAt)
    `).run({
      slug, name, description, sortOrder, isPublic, coverArtworkId,
      createdAt: now, updatedAt: now
    });
  } else {
    db.prepare(`
      UPDATE series SET
        name=@name,
        description=@description,
        sortOrder=@sortOrder,
        isPublic=@isPublic,
        coverArtworkId=@coverArtworkId,
        updatedAt=@updatedAt
      WHERE slug=@slug
    `).run({
      slug, name, description, sortOrder, isPublic, coverArtworkId, updatedAt: now
    });
  }

  const out = db.prepare(`
    SELECT s.*,
      (SELECT path FROM variants v
        WHERE v.artworkId=s.coverArtworkId AND v.kind='thumb') AS coverThumb
    FROM series s WHERE slug=?
  `).get(slug);

  res.json({ ...out, isPublic: !!out.isPublic });
});

seriesRouter.delete("/admin/series/:slug", (req, res) => {
  const slug = normSlug(req.params.slug);
  const existing = db.prepare(`SELECT * FROM series WHERE slug=?`).get(slug);
  if (!existing) return res.status(404).json({ error: "Not found" });

  db.prepare(`DELETE FROM series WHERE slug=?`).run(slug);

  // Optional: do NOT mutate artworks.series here (you might want to keep it)
  res.json({ ok: true, deleted: slug });
});
