import { getAdminSessionFromRequest } from "./session.js";

export function getExpectedAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || "").trim();
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
