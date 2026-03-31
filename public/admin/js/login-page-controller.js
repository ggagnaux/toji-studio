import { getSafeAdminNext } from "./session-utils.js";
import {
  checkExistingAdminSession,
  submitLoginForm
} from "./login-controller.js";

export function initLoginPage({
  form,
  passwordEl,
  statusEl,
  windowRef = globalThis.window,
  sessionStorageRef = globalThis.sessionStorage,
  apiBase = "",
  isAdminSessionAuthenticated,
  clearAdminSession,
  setAdminSessionAuthenticated,
  checkExistingSession = checkExistingAdminSession,
  submitLogin = submitLoginForm
} = {}) {
  const redirectTarget = getSafeAdminNext(windowRef?.location?.search, windowRef?.location?.origin);

  const sessionCheckPromise = checkExistingSession({
    apiBase,
    isAdminSessionAuthenticated,
    clearAdminSession,
    setAdminSessionAuthenticated
  }).then((isAuthenticated) => {
    if (isAuthenticated) windowRef?.location?.replace?.(redirectTarget);
    return isAuthenticated;
  });

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    return submitLogin({
      password: String(passwordEl?.value || ""),
      statusEl,
      apiBase,
      redirectTarget,
      sessionStorageRef,
      setAdminSessionAuthenticated,
      clearAdminSession,
      onRedirect(nextHref) {
        windowRef?.location?.replace?.(nextHref);
      }
    });
  };

  form?.addEventListener?.("submit", handleSubmit);

  return {
    redirectTarget,
    handleSubmit,
    sessionCheckPromise,
    dispose() {
      form?.removeEventListener?.("submit", handleSubmit);
    }
  };
}
