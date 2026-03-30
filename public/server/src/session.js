import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "toji_admin_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const sessions = new Map();

function nowMs() {
  return Date.now();
}

function resolveSessionTtlMs() {
  const raw = Number(process.env.ADMIN_SESSION_TTL_HOURS || "");
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw * 60 * 60 * 1000);
  return DEFAULT_SESSION_TTL_MS;
}

function serializeCookie(name, value, options = {}) {
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

function isSecureRequest(req) {
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
  sessions.set(id, session);
  return session;
}

export function getAdminSession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= nowMs()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function destroyAdminSession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) return false;
  return sessions.delete(id);
}

export function cleanupExpiredAdminSessions() {
  const now = nowMs();
  for (const [id, session] of sessions.entries()) {
    if (Date.parse(session.expiresAt) <= now) sessions.delete(id);
  }
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
