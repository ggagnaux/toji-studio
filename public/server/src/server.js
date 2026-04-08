import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { requireAdmin } from "./auth.js";
import { VARIANTS_DIR } from "./db.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { adminSessionRouter } from "./routes/admin-session.js";
import { uploadRouter } from "./routes/upload.js";
import { seriesRouter } from "./routes/series.js";

export function resolveSiteRoot() {
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

export function resolveAdminPageFile(siteRoot, pageName) {
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

function addLoopbackAlias(origins, origin) {
  let parsed = null;
  try {
    parsed = new URL(origin);
  } catch {
    return;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return;

  const alias = new URL(origin);
  alias.hostname = hostname === "localhost" ? "127.0.0.1" : "localhost";
  origins.add(alias.origin);
}

export function resolveCorsOriginOptions(rawOrigin = process.env.CORS_ORIGIN || "") {
  const configured = String(rawOrigin || "").trim();
  if (!configured) return true;

  const origins = new Set(
    configured
      .split(",")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );

  for (const origin of [...origins]) addLoopbackAlias(origins, origin);

  return (origin, callback) => {
    if (!origin || origins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Not allowed by CORS: ${origin}`));
  };
}

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "https://cdn.jsdelivr.net"]
      }
    }
  }));
  app.use(cors({ origin: resolveCorsOriginOptions(), credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/media", express.static(VARIANTS_DIR, {
    fallthrough: false,
    maxAge: "7d"
  }));

  app.use("/api", publicRouter);
  app.use("/api", adminSessionRouter);

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
    app.get(/^\/admin\/?$/, (req, res) => {
      res.sendFile(path.join(siteRoot, "admin", "index.html"));
    });

    app.get("/admin/:page", (req, res, next) => {
      const filePath = resolveAdminPageFile(siteRoot, req.params.page);
      if (!filePath) return next();
      res.sendFile(filePath);
    });

    app.use(express.static(siteRoot, {
      maxAge: "1h"
    }));
  }

  return app;
}

export function startServer(port = Number(process.env.PORT || 5179)) {
  const app = createApp();
  const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  return { app, server };
}

export function isDirectRun({ argv = process.argv, metaUrl = import.meta.url } = {}) {
  const entry = argv?.[1] ? path.resolve(argv[1]) : "";
  const current = metaUrl?.startsWith?.("file:") ? path.resolve(fileURLToPath(metaUrl)) : "";
  return !!entry && !!current && entry === current;
}

if (isDirectRun()) {
  startServer();
}
