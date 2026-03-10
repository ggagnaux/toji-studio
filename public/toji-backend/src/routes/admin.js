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
  setImageVariantSettings
} from "../db.js";

export const adminRouter = Router();

adminRouter.get("/admin/settings/image-variants", (req, res) => {
  res.json(getImageVariantSettings());
});

adminRouter.put("/admin/settings/image-variants", (req, res) => {
  const saved = setImageVariantSettings(req.body || {});
  res.json(saved);
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
  return {
    ...row,
    enabled: !!row.enabled,
    config: parseJsonObject(row.configJson, {}),
    auth: parseJsonObject(row.authJson, {})
  };
}

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
  const rows = db.prepare(`
    SELECT id, name, category, enabled, configJson, authJson, createdAt, updatedAt
    FROM social_platforms
    ORDER BY enabled DESC, name COLLATE NOCASE ASC
  `).all();

  res.json(rows.map(mapPlatformRow));
});

adminRouter.post("/admin/social/platforms", (req, res) => {
  const body = req.body || {};
  const id = cleanSlug(body.id);
  const name = cleanText(body.name);
  if (!id) return res.status(400).json({ error: "Platform id is required." });
  if (!name) return res.status(400).json({ error: "Platform name is required." });

  const exists = db.prepare(`SELECT id FROM social_platforms WHERE id=?`).get(id);
  if (exists) return res.status(409).json({ error: "Platform id already exists." });

  const now = nowIso();
  db.prepare(`
    INSERT INTO social_platforms (
      id, name, category, enabled, configJson, authJson, createdAt, updatedAt
    ) VALUES (
      @id, @name, @category, @enabled, @configJson, @authJson, @createdAt, @updatedAt
    )
  `).run({
    id,
    name,
    category: cleanCategory(body.category),
    enabled: toDbBool(body.enabled, 1),
    configJson: JSON.stringify(parseJsonObject(body.config, {})),
    authJson: JSON.stringify(parseJsonObject(body.auth, {})),
    createdAt: now,
    updatedAt: now
  });

  const out = db.prepare(`
    SELECT id, name, category, enabled, configJson, authJson, createdAt, updatedAt
    FROM social_platforms
    WHERE id=?
  `).get(id);

  res.status(201).json(mapPlatformRow(out));
});

adminRouter.patch("/admin/social/platforms/:id", (req, res) => {
  const id = cleanText(req.params.id);
  const cur = db.prepare(`SELECT * FROM social_platforms WHERE id=?`).get(id);
  if (!cur) return res.status(404).json({ error: "Platform not found." });

  const patch = req.body || {};
  const next = {
    name: patch.name != null ? cleanText(patch.name) : cur.name,
    category: patch.category != null ? cleanCategory(patch.category) : cur.category,
    enabled: patch.enabled != null ? toDbBool(patch.enabled, !!cur.enabled) : cur.enabled,
    configJson:
      patch.config != null
        ? JSON.stringify(parseJsonObject(patch.config, {}))
        : (cur.configJson || "{}"),
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
      configJson=@configJson,
      authJson=@authJson,
      updatedAt=@updatedAt
    WHERE id=@id
  `).run({ id, ...next });

  const out = db.prepare(`
    SELECT id, name, category, enabled, configJson, authJson, createdAt, updatedAt
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
      sp.enabled AS platformEnabled,
      a.title AS artworkTitle
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
