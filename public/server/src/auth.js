export function requireAdmin(req, res, next) {
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expectedToken = String(process.env.ADMIN_TOKEN || "");
  if (!token || token !== expectedToken) {
    const maskedToken = token ? `${token.slice(0, 6)}...(${token.length})` : "<missing>";
    const maskedExpectedToken = expectedToken
      ? `${expectedToken.slice(0, 6)}...(${expectedToken.length})`
      : "<missing>";
    console.warn("[admin-auth] Unauthorized request", {
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip,
      hasAuthorizationHeader: !!auth,
      tokenPreview: maskedToken,
      expectedTokenPreview: maskedExpectedToken
    });
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
