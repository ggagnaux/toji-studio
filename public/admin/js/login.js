import {
  API_BASE,
  clearAdminSession,
  isAdminSessionAuthenticated,
  setAdminSessionAuthenticated
} from "../admin.js";
import { setLoginStatus } from "./login-controller.js";
import { initLoginPage } from "./login-page-controller.js";

const form = document.getElementById("loginForm");
const passwordEl = document.getElementById("password");
const statusEl = document.getElementById("status");

initLoginPage({
  form,
  passwordEl,
  statusEl,
  windowRef: window,
  sessionStorageRef: sessionStorage,
  apiBase: API_BASE,
  isAdminSessionAuthenticated,
  clearAdminSession,
  setAdminSessionAuthenticated
});

export { setLoginStatus };

