(function () {
  const ADMIN_SESSION_KEY = "toji_admin_session_v1";
  const pathName = String(window.location.pathname || "").toLowerCase();
  if (!pathName.includes("/admin/") || pathName.endsWith("/admin/login.html")) return;

  let authenticated = false;
  try {
    authenticated = window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {}
  if (authenticated) return;

  const next = String(window.location.pathname || "") + String(window.location.search || "") + String(window.location.hash || "");
  window.location.replace("login.html?next=" + encodeURIComponent(next));
})();
