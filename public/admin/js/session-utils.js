export function getSafeAdminNext(search = "", origin = "") {
  const raw = new URLSearchParams(String(search || "")).get("next");
  if (!raw) return "index.html";
  try {
    const next = new URL(raw, String(origin || ""));
    const path = String(next.pathname || "").toLowerCase();
    if (next.origin !== String(origin || "")) return "index.html";
    if (!path.includes("/admin/")) return "index.html";
    if (path.endsWith("/admin/login.html")) return "index.html";
    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return "index.html";
  }
}

export function buildAdminLoginRedirect(pathname = "", search = "", hash = "") {
  const next = `${pathname || ""}${search || ""}${hash || ""}`;
  return `login.html?next=${encodeURIComponent(next)}`;
}
