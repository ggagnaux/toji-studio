(function () {
  const ADMIN_SESSION_KEY = "toji_admin_session_v1";
  const pathName = String(window.location.pathname || "").toLowerCase();
  if (!pathName.includes("/admin/") || pathName.endsWith("/admin/login.html")) return;

  const root = document.documentElement;
  root.dataset.adminSessionBootstrap = "pending";
  root.classList.add("admin-auth-pending");

  if (!document.getElementById("admin-auth-pending-style")) {
    const style = document.createElement("style");
    style.id = "admin-auth-pending-style";
    style.textContent = "html.admin-auth-pending body{visibility:hidden;}";
    document.head.appendChild(style);
  }

  function resolveApiBase() {
    const override = String(window.localStorage?.getItem?.("toji_api_base") || "").trim().replace(/\/+$/, "");
    if (override) return override;

    const origin = String(window.location.origin || "").replace(/\/+$/, "");
    if (!origin) return "";

    try {
      const current = new URL(origin);
      const isLocalHost = ["localhost", "127.0.0.1"].includes(current.hostname);
      if (isLocalHost && current.port && current.port !== "5179") {
        return `${current.protocol}//${current.hostname}:5179`;
      }
    } catch {}

    return origin;
  }

  function finishAuthenticated() {
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    } catch {}
    root.dataset.adminSessionBootstrap = "ready";
    root.classList.remove("admin-auth-pending");
  }

  function redirectToLogin() {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
    const next = String(window.location.pathname || "") + String(window.location.search || "") + String(window.location.hash || "");
    window.location.replace("login.html?next=" + encodeURIComponent(next));
  }

  async function verify() {
    const apiBase = resolveApiBase();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 4000) : null;
    try {
      const res = await fetch(`${apiBase}/api/admin/session/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller?.signal
      });
      if (!res.ok) {
        redirectToLogin();
        return;
      }
      const body = await res.json().catch(() => null);
      if (body?.authenticated) {
        finishAuthenticated();
        return;
      }
      redirectToLogin();
    } catch {
      let hadLocalSession = false;
      try {
        hadLocalSession = window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
      } catch {}
      if (hadLocalSession) {
        root.dataset.adminSessionBootstrap = "fallback";
        root.classList.remove("admin-auth-pending");
        return;
      }
      redirectToLogin();
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  window.__tojiAdminSessionBootstrapPromise = verify();
})();
