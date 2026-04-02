import crypto from "node:crypto";

import { db } from "./db.js";

export const ADMIN_SESSION_COOKIE = "toji_admin_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const insertAdminSessionStmt = db.prepare(`
  INSERT INTO admin_sessions (id, createdAt, expiresAt, metadataJson)
  VALUES (@id, @createdAt, @expiresAt, @metadataJson)
`);
const selectAdminSessionStmt = db.prepare(`
  SELECT id, createdAt, expiresAt, metadataJson
  FROM admin_sessions
  WHERE id = ?
`);
const deleteAdminSessionStmt = db.prepare(`
  DELETE FROM admin_sessions
  WHERE id = ?
`);
const deleteExpiredAdminSessionsStmt = db.prepare(`
  DELETE FROM admin_sessions
  WHERE expiresAt <= ?
`);
const deleteAllAdminSessionsStmt = db.prepare(`DELETE FROM admin_sessions`);
const expireAdminSessionStmt = db.prepare(`
  UPDATE admin_sessions
  SET expiresAt = ?
  WHERE id = ?
`);

function parseSessionMetadata(raw) {
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hydrateSession(row) {
  if (!row) return null;
  return {
    id: String(row.id || "").trim(),
    createdAt: String(row.createdAt || ""),
    expiresAt: String(row.expiresAt || ""),
    metadata: parseSessionMetadata(row.metadataJson)
  };
}

export function nowMs() {
  return Date.now();
}

export function resolveSessionTtlMs() {
  const raw = Number(process.env.ADMIN_SESSION_TTL_HOURS || "");
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw * 60 * 60 * 1000);
  return DEFAULT_SESSION_TTL_MS;
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(String(value || ""))}`];
  if (options.maxAge != null) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
  return parts.join("; ");
}

export function parseCookies(req) {
  const header = String(req?.headers?.cookie || "");
  const cookies = {};
  header.split(";").forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key) return;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });
  return cookies;
}

export function isSecureRequest(req) {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") return true;
  return !!(req?.secure || String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase() === "https");
}

export function getAdminSessionCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "Strict",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: Math.floor(resolveSessionTtlMs() / 1000)
  };
}

export function createAdminSession(metadata = {}) {
  cleanupExpiredAdminSessions();
  const id = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date(nowMs()).toISOString();
  const expiresAt = new Date(nowMs() + resolveSessionTtlMs()).toISOString();
  const session = {
    id,
    createdAt,
    expiresAt,
    metadata: metadata && typeof metadata === "object" ? { ...metadata } : {}
  };
  insertAdminSessionStmt.run({
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    metadataJson: JSON.stringify(session.metadata || {})
  });
  return session;
}

export function getAdminSession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  const session = hydrateSession(selectAdminSessionStmt.get(id));
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= nowMs()) {
    deleteAdminSessionStmt.run(id);
    return null;
  }
  return session;
}

export function destroyAdminSession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) return false;
  const result = deleteAdminSessionStmt.run(id);
  return result.changes > 0;
}

export function cleanupExpiredAdminSessions() {
  deleteExpiredAdminSessionsStmt.run(new Date(nowMs()).toISOString());
}

export function getAdminSessionFromRequest(req) {
  cleanupExpiredAdminSessions();
  const cookies = parseCookies(req);
  const sessionId = String(cookies[ADMIN_SESSION_COOKIE] || "").trim();
  if (!sessionId) return null;
  return getAdminSession(sessionId);
}

export function setAdminSessionCookie(res, session, req) {
  const options = getAdminSessionCookieOptions(req);
  res.append("Set-Cookie", serializeCookie(ADMIN_SESSION_COOKIE, session.id, options));
}

export function clearAdminSessionCookie(res, req) {
  const options = getAdminSessionCookieOptions(req);
  res.append("Set-Cookie", serializeCookie(ADMIN_SESSION_COOKIE, "", {
    ...options,
    expires: new Date(0),
    maxAge: 0
  }));
}

export function expireAdminSessionForTests(sessionId, expiresAt = new Date(0).toISOString()) {
  const id = String(sessionId || "").trim();
  if (!id) return;
  expireAdminSessionStmt.run(String(expiresAt || new Date(0).toISOString()), id);
}

export function resetAdminSessionsForTests() {
  deleteAllAdminSessionsStmt.run();
}
