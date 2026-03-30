import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";

import { requireAdmin } from "./auth.js";
import { VARIANTS_DIR } from "./db.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { adminSessionRouter } from "./routes/admin-session.js";
import { uploadRouter } from "./routes/upload.js";
import { seriesRouter } from "./routes/series.js";

function resolveSiteRoot() {
  const envDir = String(process.env.TOJI_SITE_DIR || "").trim();
  const cwd = process.cwd();
  const candidates = [
    envDir,
    path.join(cwd, "site"),
    path.join(cwd, "..", "site"),
    path.join(cwd, "..")
  ].filter(Boolean);

  for (const dir of candidates) {
    const abs = path.resolve(dir);
    const indexPath = path.join(abs, "index.html");
    if (fs.existsSync(indexPath)) return abs;
  }

  return null;
}

function resolveAdminPageFile(siteRoot, pageName) {
  if (!siteRoot || !pageName) return null;
  const adminDir = path.join(siteRoot, "admin");
  if (!fs.existsSync(adminDir)) return null;

  const normalizedPageName = String(pageName).trim().toLowerCase();
  if (!normalizedPageName || normalizedPageName.includes(".")) return null;

  const entries = fs.readdirSync(adminDir, { withFileTypes: true });
  const exactMatch = entries.find((entry) =>
    entry.isFile() && entry.name.toLowerCase() === `${normalizedPageName}.html`
  );

  return exactMatch ? path.join(adminDir, exactMatch.name) : null;
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "https://cdn.jsdelivr.net"]
    }
  }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Serve ONLY variants (never serve /storage/originals)
app.use("/media", express.static(VARIANTS_DIR, {
  fallthrough: false,
  maxAge: "7d"
}));

// Public read APIs
app.use("/api", publicRouter);
app.use("/api", adminSessionRouter);

// Admin APIs (session/cookie protected, with temporary token fallback)
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/admin")) return requireAdmin(req, res, next);
  next();
});
app.use("/api", adminRouter);
app.use("/api", uploadRouter);
app.use("/api", seriesRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const siteRoot = resolveSiteRoot();
if (siteRoot) {
  app.get("/admin/:page", (req, res, next) => {
    const filePath = resolveAdminPageFile(siteRoot, req.params.page);
    if (!filePath) return next();
    res.sendFile(filePath);
  });

  app.use(express.static(siteRoot, {
    maxAge: "1h"
  }));
}

const port = Number(process.env.PORT || 5179);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
