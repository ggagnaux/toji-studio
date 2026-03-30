import {
  ensureBaseStyles,
  setYearFooter,
  showToast,
  apiFetch,
  ADMIN_DEFAULT_PASSWORD
} from "../admin.js";

ensureBaseStyles();
setYearFooter();

const adminPasswordForm = document.getElementById("adminPasswordForm");
const currentAdminPassword = document.getElementById("currentAdminPassword");
const newAdminPassword = document.getElementById("newAdminPassword");
const confirmAdminPassword = document.getElementById("confirmAdminPassword");
const passwordStatus = document.getElementById("passwordStatus");
const resetAdminPassword = document.getElementById("resetAdminPassword");

function setPasswordStatus(message = "", tone = "") {
  if (!passwordStatus) return;
  passwordStatus.textContent = message;
  passwordStatus.dataset.tone = tone || "";
}

async function updateAdminPassword(nextPassword, currentPassword) {
  return apiFetch("/api/admin/session/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword: nextPassword })
  });
}

adminPasswordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const current = String(currentAdminPassword?.value || "");
  const next = String(newAdminPassword?.value || "").trim();
  const confirm = String(confirmAdminPassword?.value || "").trim();

  if (!current) {
    setPasswordStatus("Enter your current password.", "warn");
    showToast("Enter your current password.", { tone: "warn" });
    return;
  }
  if (next.length < 6) {
    setPasswordStatus("Use at least 6 characters.", "warn");
    showToast("New password must be at least 6 characters.", { tone: "warn" });
    return;
  }
  if (next !== confirm) {
    setPasswordStatus("New passwords do not match.", "warn");
    showToast("New passwords do not match.", { tone: "warn" });
    return;
  }

  try {
    setPasswordStatus("Updating password...", "info");
    await updateAdminPassword(next, current);
    setPasswordStatus("Admin password updated successfully.", "success");
    if (currentAdminPassword) currentAdminPassword.value = "";
    if (newAdminPassword) newAdminPassword.value = "";
    if (confirmAdminPassword) confirmAdminPassword.value = "";
    showToast("Admin password updated successfully.", { tone: "success" });
  } catch (error) {
    const message = String(error?.message || "Failed to update password.");
    setPasswordStatus(message, "warn");
    showToast(message, { tone: "warn" });
  }
});

resetAdminPassword?.addEventListener("click", async () => {
  const current = String(currentAdminPassword?.value || "");
  if (!current) {
    setPasswordStatus("Enter your current password before resetting.", "warn");
    showToast("Enter your current password before resetting.", { tone: "warn" });
    return;
  }

  try {
    setPasswordStatus(`Resetting password to default (${ADMIN_DEFAULT_PASSWORD})...`, "info");
    await updateAdminPassword(ADMIN_DEFAULT_PASSWORD, current);
    setPasswordStatus(`Password reset to default (${ADMIN_DEFAULT_PASSWORD}).`, "success");
    if (currentAdminPassword) currentAdminPassword.value = "";
    if (newAdminPassword) newAdminPassword.value = "";
    if (confirmAdminPassword) confirmAdminPassword.value = "";
    showToast(`Password reset to default: ${ADMIN_DEFAULT_PASSWORD}`, { tone: "success" });
  } catch (error) {
    const message = String(error?.message || "Failed to reset password.");
    setPasswordStatus(message, "warn");
    showToast(message, { tone: "warn" });
  }
});
