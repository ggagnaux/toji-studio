export function setLoginStatus(statusEl, message = "", tone = "info") {
  if (!statusEl) return;
  statusEl.textContent = String(message || "");
  statusEl.className = "login-status";
  if (!message) return;
  statusEl.classList?.add("is-visible", tone === "error" ? "is-error" : "is-info");
}

export async function submitLoginForm({
  password = "",
  statusEl = null,
  apiBase = "",
  redirectTarget = "index.html",
  fetchImpl = globalThis.fetch,
  sessionStorageRef = globalThis.sessionStorage,
  setAdminSessionAuthenticated,
  clearAdminSession,
  onRedirect
} = {}) {
  const nextPassword = String(password || "");
  if (!nextPassword) {
    setLoginStatus(statusEl, "Password is required.", "error");
    return { ok: false, reason: "missing-password" };
  }

  setLoginStatus(statusEl, "Signing in...", "info");

  try {
    const res = await fetchImpl(`${apiBase}/api/admin/session/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: nextPassword })
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(payload?.error || "Sign-in failed.");
    }

    sessionStorageRef?.setItem?.("toji_admin_just_logged_in_v1", "1");
    setAdminSessionAuthenticated?.(true);
    onRedirect?.(redirectTarget);
    return { ok: true, redirectTarget };
  } catch (error) {
    clearAdminSession?.();
    setLoginStatus(statusEl, error?.message || "Sign-in failed.", "error");
    return { ok: false, reason: "request-failed", error };
  }
}

export async function checkExistingAdminSession({
  apiBase = "",
  fetchImpl = globalThis.fetch,
  isAdminSessionAuthenticated,
  clearAdminSession,
  setAdminSessionAuthenticated
} = {}) {
  try {
    const res = await fetchImpl(`${apiBase}/api/admin/session/me`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("No active session");
    setAdminSessionAuthenticated?.(true);
    return true;
  } catch {
    if (isAdminSessionAuthenticated?.()) clearAdminSession?.();
    return false;
  }
}
