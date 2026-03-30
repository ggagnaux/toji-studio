import { getAdminSessionFromRequest } from "./session.js";

export function getExpectedAdminToken() {
  return String(process.env.ADMIN_TOKEN || "").trim();
}

export function getExpectedAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || "").trim();
}

export function hasValidLegacyAdminToken(req) {
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expectedToken = getExpectedAdminToken();
  return !!token && !!expectedToken && token === expectedToken;
}

export function getAdminRequestAuthState(req) {
  const session = getAdminSessionFromRequest(req);
  if (session) {
    return {
      ok: true,
      method: "session",
      session
    };
  }

  if (hasValidLegacyAdminToken(req)) {
    return {
      ok: true,
      method: "token",
      session: null
    };
  }

  return {
    ok: false,
    method: "none",
    session: null
  };
}

export function requireAdmin(req, res, next) {
  const authState = getAdminRequestAuthState(req);
  if (authState.ok) {
    req.adminAuth = authState;
    return next();
  }

  console.warn("[admin-auth] Unauthorized request", {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    hasAuthorizationHeader: !!req.get("authorization"),
    hasCookieHeader: !!req.headers?.cookie
  });
  return res.status(401).json({ error: "Unauthorized" });
}
