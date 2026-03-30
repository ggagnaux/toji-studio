import {
  API_BASE,
  clearAdminSession,
  isAdminSessionAuthenticated,
  setAdminSessionAuthenticated
} from "../admin.js";

const form = document.getElementById("loginForm");
const passwordEl = document.getElementById("password");
const statusEl = document.getElementById("status");

function setStatus(message = "", tone = "info") {
  if (!statusEl) return;
  statusEl.textContent = String(message || "");
  statusEl.className = "login-status";
  if (!message) return;
  statusEl.classList.add("is-visible", tone === "error" ? "is-error" : "is-info");
}

function getSafeNext() {
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw) return "index.html";
  try {
    const next = new URL(raw, window.location.origin);
    const path = String(next.pathname || "").toLowerCase();
    if (next.origin !== window.location.origin) return "index.html";
    if (!path.includes("/admin/")) return "index.html";
    if (path.endsWith("/admin/login.html")) return "index.html";
    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return "index.html";
  }
}

async function checkExistingSession() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/session/me`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("No active session");
    setAdminSessionAuthenticated(true);
    return true;
  } catch {
    if (isAdminSessionAuthenticated()) clearAdminSession();
    return false;
  }
}

const redirectTarget = getSafeNext();
void checkExistingSession().then((isAuthenticated) => {
  if (isAuthenticated) window.location.replace(redirectTarget);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = String(passwordEl?.value || "");
  if (!password) {
    setStatus("Password is required.", "error");
    return;
  }

  setStatus("Signing in...", "info");

  try {
    const res = await fetch(`${API_BASE}/api/admin/session/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(payload?.error || "Sign-in failed.");
    }

    sessionStorage.setItem("toji_admin_just_logged_in_v1", "1");
    setAdminSessionAuthenticated(true);
    window.location.replace(redirectTarget);
  } catch (error) {
    clearAdminSession();
    setStatus(error?.message || "Sign-in failed.", "error");
  }
});
