import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { requireAdmin } from "./auth.js";
import { VARIANTS_DIR } from "./db.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { uploadRouter } from "./routes/upload.js";
import { seriesRouter } from "./routes/series.js";


const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));

// Serve ONLY variants (never serve /storage/originals)
app.use("/media", express.static(VARIANTS_DIR, {
  fallthrough: false,
  maxAge: "7d"
}));

// Public read APIs
app.use("/api", publicRouter);

// Admin APIs (token protected)
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/admin")) return requireAdmin(req, res, next);
  next();
});
app.use("/api", adminRouter);
app.use("/api", uploadRouter);
app.use("/api", seriesRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 5179);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
