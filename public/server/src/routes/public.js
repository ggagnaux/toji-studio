import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { db, jsonArray, getContactSettings, getSplashSettings } from "../db.js";

export const publicRouter = Router();
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
function resolvePublicSiteRoot() {
  const candidates = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), ".."),
    path.resolve(MODULE_DIR, "../../..")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return candidates[0];
}
const SITE_ROOT = resolvePublicSiteRoot();
const BANNER_LOGOS_DIR = path.join(SITE_ROOT, "assets", "img", "logos");

function listBannerLogoEntries() {
  if (!fs.existsSync(BANNER_LOGOS_DIR)) return [];
  return fs.readdirSync(BANNER_LOGOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(png|jpe?g)$/i.test(entry.name))
    .map((entry) => ({ name: entry.name, src: "/assets/img/logos/" + entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}


publicRouter.get("/public/site-meta", (req, res) => {
  const version = String(process.env.PUBLIC_SITE_VERSION || "").trim();
  res.json({ version });
});

publicRouter.get("/public/settings/contact", (req, res) => {
  res.json(getContactSettings());
});

publicRouter.get("/public/settings/splash", (req, res) => {
  res.json(getSplashSettings());
});

publicRouter.get("/public/banner-logos", (req, res) => {
  res.json({ items: listBannerLogoEntries() });
});

publicRouter.get("/public/external-links", (req, res) => {
  const rows = db.prepare(`
    SELECT id, label, url, category, enabled, sortOrder, createdAt, updatedAt
    FROM external_links
    WHERE enabled = 1
    ORDER BY sortOrder ASC, updatedAt ASC, createdAt ASC, id ASC
  `).all();

  res.json(rows.map((row) => ({
    ...row,
    enabled: !!row.enabled,
    sortOrder: Number(row.sortOrder || 0)
  })));
});

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
  const rows = db.prepare(`
    SELECT
      s.slug,
      s.name,
      s.description,
      s.sortOrder,
      s.isPublic,
      s.coverArtworkId,
      s.imageOrderJson,
      (SELECT path FROM variants v
        WHERE v.artworkId=s.coverArtworkId AND v.kind='thumb') AS coverThumb,
      (SELECT COUNT(*) FROM artworks a
        WHERE a.status='published'
          AND (
            LOWER(TRIM(COALESCE(a.series, ''))) = LOWER(TRIM(COALESCE(s.name, '')))
            OR LOWER(TRIM(COALESCE(a.series, ''))) = LOWER(TRIM(COALESCE(s.slug, '')))
          )) AS publishedCount
    FROM series s
    WHERE s.isPublic=1
    ORDER BY s.sortOrder ASC, s.name ASC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    isPublic: !!r.isPublic,
    imageOrder: parseImageOrder(r.imageOrderJson)
  })));
});


