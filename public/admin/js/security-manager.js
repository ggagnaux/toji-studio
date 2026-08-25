import {
  ensureBaseStyles,
  setYearFooter,
  showToast,
  apiFetch,
  clearAdminSession,
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

function redirectToLogin() {
  const loginHref = new URL("login.html", window.location.href).href;
  window.location.replace(loginHref);
}

function showPasswordChangedModal() {
  try {
    clearAdminSession();
  } catch {}

  const existing = document.querySelector("[data-password-changed-modal]");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "admin-confirm-backdrop";
  backdrop.setAttribute("data-password-changed-modal", "1");
  Object.assign(backdrop.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10000",
    display: "grid",
    placeItems: "center",
    padding: "16px",
    background: "rgba(0,0,0,.48)"
  });

  const modal = document.createElement("div");
  modal.className = "admin-confirm";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "passwordChangedTitle");
  modal.setAttribute("aria-describedby", "passwordChangedMessage");
  Object.assign(modal.style, {
    width: "min(92vw, 460px)",
    display: "grid",
    gap: "14px",
    padding: "18px",
    border: "1px solid var(--line)",
    borderRadius: "16px",
    background: "var(--panel)",
    color: "var(--text)",
    boxShadow: "0 20px 46px rgba(0,0,0,.32)"
  });

  const title = document.createElement("p");
  title.id = "passwordChangedTitle";
  title.className = "title";
  title.style.margin = "0";
  title.textContent = "Password changed";

  const message = document.createElement("p");
  message.id = "passwordChangedMessage";
  message.className = "admin-confirm__msg";
  message.textContent = "Your password was successfully changed. Please log in again with your new password.";

  const actions = document.createElement("div");
  actions.className = "admin-confirm__actions";
  Object.assign(actions.style, {
    display: "flex",
    justifyContent: "flex-end"
  });

  const okButton = document.createElement("button");
  okButton.type = "button";
  okButton.className = "admin-confirm__btn admin-confirm__btn--primary";
  okButton.textContent = "Ok";
  Object.assign(okButton.style, {
    minWidth: "86px"
  });
  okButton.addEventListener("click", redirectToLogin);

  actions.appendChild(okButton);
  modal.append(title, message, actions);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const handleKeydown = (event) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    event.preventDefault();
    redirectToLogin();
  };
  document.addEventListener("keydown", handleKeydown);

  okButton.focus();

  return () => {
    document.body.style.overflow = previousOverflow;
    document.removeEventListener("keydown", handleKeydown);
    backdrop.remove();
  };
}

function handlePasswordChangeSuccess() {
  setPasswordStatus("Password changed. Please log in again.", "success");
  if (adminPasswordForm) {
    adminPasswordForm.querySelectorAll("input, button, select, textarea").forEach((control) => {
      control.disabled = true;
    });
  }
  showPasswordChangedModal();
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
    if (currentAdminPassword) currentAdminPassword.value = "";
    if (newAdminPassword) newAdminPassword.value = "";
    if (confirmAdminPassword) confirmAdminPassword.value = "";
    handlePasswordChangeSuccess();
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
    handlePasswordChangeSuccess();
  } catch (error) {
    const message = String(error?.message || "Failed to reset password.");
    setPasswordStatus(message, "warn");
    showToast(message, { tone: "warn" });
  }
});
