import fs from "node:fs";
import path from "node:path";
import { Router } from "express";

import { getExpectedAdminPassword, getAdminRequestAuthState } from "../auth.js";
import {
  createAdminSession,
  destroyAdminSession,
  getAdminSessionFromRequest,
  clearAdminSessionCookie,
  setAdminSessionCookie
} from "../session.js";

export const adminSessionRouter = Router();

function getWritableEnvFilePath() {
  const explicit = String(process.env.TOJI_ENV_FILE || "").trim();
  if (explicit) return path.resolve(explicit);
  return path.resolve(process.cwd(), ".env");
}

function upsertEnvValue(filePath, key, value) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) throw new Error("Missing env key");
  const nextLine = `${normalizedKey}=${String(value ?? "")}`;
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, "utf8") : "";
  const pattern = new RegExp(`^${normalizedKey}=.*$`, "m");
  let nextContent = "";
  if (pattern.test(current)) {
    nextContent = current.replace(pattern, nextLine);
  } else {
    const suffix = current && !current.endsWith("\n") ? "\n" : "";
    nextContent = `${current}${suffix}${nextLine}\n`;
  }
  fs.writeFileSync(filePath, nextContent, "utf8");
}

adminSessionRouter.post("/admin/session/login", (req, res) => {
  const password = String(req.body?.password || "");
  const expectedPassword = getExpectedAdminPassword();
  if (!expectedPassword) {
    return res.status(500).json({ error: "Admin password is not configured on the server." });
  }
  if (!password || password !== expectedPassword) {
    clearAdminSessionCookie(res, req);
    return res.status(401).json({ error: "Invalid password." });
  }

  const session = createAdminSession({
    ip: req.ip,
    userAgent: String(req.get("user-agent") || "")
  });
  setAdminSessionCookie(res, session, req);
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    ok: true,
    authenticated: true,
    session: {
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }
  });
});

adminSessionRouter.post("/admin/session/logout", (req, res) => {
  const session = getAdminSessionFromRequest(req);
  if (session) destroyAdminSession(session.id);
  clearAdminSessionCookie(res, req);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ ok: true, authenticated: false });
});

adminSessionRouter.post("/admin/session/password", (req, res) => {
  const authState = getAdminRequestAuthState(req);
  if (!authState.ok || authState.method !== "session") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const currentPassword = String(req.body?.currentPassword || "");
  const nextPassword = String(req.body?.newPassword || "").trim();
  const expectedPassword = getExpectedAdminPassword();

  if (!currentPassword || currentPassword !== expectedPassword) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }
  if (nextPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  try {
    process.env.ADMIN_PASSWORD = nextPassword;
    upsertEnvValue(getWritableEnvFilePath(), "ADMIN_PASSWORD", nextPassword);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ok: true, updated: true });
  } catch (error) {
    console.error("[admin-session] Failed to persist admin password", error);
    return res.status(500).json({ error: "Failed to persist admin password." });
  }
});

adminSessionRouter.get("/admin/session/me", (req, res) => {
  const authState = getAdminRequestAuthState(req);
  res.setHeader("Cache-Control", "no-store");
  if (!authState.ok) {
    return res.status(401).json({ ok: true, authenticated: false });
  }

  return res.json({
    ok: true,
    authenticated: true,
    authMethod: authState.method,
    session: authState.session
      ? {
          createdAt: authState.session.createdAt,
          expiresAt: authState.session.expiresAt
        }
      : null
  });
});
