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
    WHERE id='${id}'
  `).run(next);

  const out = db.prepare(`
    SELECT a.*,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='thumb') AS thumb,
      (SELECT path FROM variants v WHERE v.artworkId=a.id AND v.kind='web') AS image
    FROM artworks a WHERE a.id=?
  `).get(id);

  res.json({ ...out, featured: !!out.featured, tags: jsonArray(out.tags) });
});
