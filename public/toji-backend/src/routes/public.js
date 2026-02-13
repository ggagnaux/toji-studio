import { Router } from "express";
import { db, jsonArray } from "../db.js";

export const publicRouter = Router();

publicRouter.get("/public/artworks", (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, 
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a
    WHERE a.status='published'
    ORDER BY a.featured DESC, a.sortOrder DESC, COALESCE(a.publishedAt, a.createdAt) DESC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    featured: !!r.featured,
    tags: jsonArray(r.tags)
  })));
});

publicRouter.get("/public/artworks/:id", (req, res) => {
  const r = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a
    WHERE a.id=? AND a.status='published'
  `).get(req.params.id);

  if (!r) return res.status(404).json({ error: "Not found" });

  res.json({ ...r, featured: !!r.featured, tags: jsonArray(r.tags) });
});


publicRouter.get("/public/series", (req, res) => {
  // Public series meta (isPublic=1) + coverThumb + published piece count
  const rows = db.prepare(`
    SELECT
      s.slug,
      s.name,
      s.description,
      s.sortOrder,
      s.isPublic,
      s.coverArtworkId,
      (SELECT path FROM variants v
        WHERE v.artworkId=s.coverArtworkId AND v.kind='thumb') AS coverThumb,
      (SELECT COUNT(*) FROM artworks a
        WHERE a.status='published' AND a.series = s.name) AS publishedCount
    FROM series s
    WHERE s.isPublic=1
    ORDER BY s.sortOrder ASC, s.name ASC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    isPublic: !!r.isPublic
  })));
});
