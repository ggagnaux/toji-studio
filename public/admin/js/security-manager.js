    import { applyBannerLogoBehavior } from "../../assets/js/header.js";
    import {
      ensureBaseStyles,
      setYearFooter,
      showToast,
      getExpectedAdminPassword,
      setAdminPassword,
      ADMIN_DEFAULT_PASSWORD
    } from "../admin.js";

    ensureBaseStyles();
    setYearFooter();
    applyBannerLogoBehavior(document.querySelector("header.header"));

    const adminPasswordForm = document.getElementById("adminPasswordForm");
    const currentAdminPassword = document.getElementById("currentAdminPassword");
    const newAdminPassword = document.getElementById("newAdminPassword");
    const confirmAdminPassword = document.getElementById("confirmAdminPassword");
    const passwordStatus = document.getElementById("passwordStatus");
    const resetAdminPassword = document.getElementById("resetAdminPassword");

    adminPasswordForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const current = String(currentAdminPassword?.value || "");
      const next = String(newAdminPassword?.value || "").trim();
      const confirm = String(confirmAdminPassword?.value || "").trim();

      if (current !== getExpectedAdminPassword()) {
        if (passwordStatus) passwordStatus.textContent = "Current password is incorrect.";
        showToast("Current password is incorrect.", { tone: "warn" });
        return;
      }
      if (next.length < 6) {
        if (passwordStatus) passwordStatus.textContent = "Use at least 6 characters.";
        showToast("New password must be at least 6 characters.", { tone: "warn" });
        return;
      }
      if (next !== confirm) {
        if (passwordStatus) passwordStatus.textContent = "New passwords do not match.";
        showToast("New passwords do not match.", { tone: "warn" });
        return;
      }

      setAdminPassword(next);
      if (passwordStatus) passwordStatus.textContent = "Admin password updated.";
      if (currentAdminPassword) currentAdminPassword.value = "";
      if (newAdminPassword) newAdminPassword.value = "";
      if (confirmAdminPassword) confirmAdminPassword.value = "";
      showToast("Admin password updated.", { tone: "success" });
    });

    resetAdminPassword?.addEventListener("click", () => {
      setAdminPassword("");
      if (passwordStatus) passwordStatus.textContent = `Password reset to default (${ADMIN_DEFAULT_PASSWORD}).`;
      if (currentAdminPassword) currentAdminPassword.value = "";
      if (newAdminPassword) newAdminPassword.value = "";
      if (confirmAdminPassword) confirmAdminPassword.value = "";
      showToast(`Password reset to default: ${ADMIN_DEFAULT_PASSWORD}`, { tone: "success" });
    });
  

