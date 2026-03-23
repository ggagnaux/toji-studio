    import {
      setAdminSessionAuthenticated,
      isAdminSessionAuthenticated,
      getExpectedAdminPassword,
      getAdminToken,
      setAdminToken
    } from "../admin.js";

    const form = document.getElementById("loginForm");
    const passwordEl = document.getElementById("password");
    const tokenEl = document.getElementById("token");
    const statusEl = document.getElementById("status");

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

    const redirectTarget = getSafeNext();
    if (tokenEl) tokenEl.value = getAdminToken();
    if (isAdminSessionAuthenticated()) {
      window.location.replace(redirectTarget);
    }

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = String(passwordEl?.value || "");
      if (entered !== getExpectedAdminPassword()) {
        if (statusEl) statusEl.textContent = "Incorrect password.";
        return;
      }

      const enteredToken = String(tokenEl?.value || "").trim();
      if (!enteredToken) {
        if (statusEl) statusEl.textContent = "Admin token is required.";
        return;
      }

      setAdminToken(enteredToken);
      sessionStorage.setItem("toji_admin_just_logged_in_v1", "1");
      setAdminSessionAuthenticated(true);
      window.location.replace(redirectTarget);
    });
