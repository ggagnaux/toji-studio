import "dotenv/config";
import { expect } from "@playwright/test";
import { E2E_ADMIN_STATE } from "./test-state.js";

const STORAGE_KEY = "toji_admin_state_v1";
const THEME_KEY = "toji_theme_mode";
const ADMIN_SESSION_COOKIE = "toji_admin_session";

export async function seedClientState(page, {
  state = E2E_ADMIN_STATE,
  theme = "system",
  apiBase = ""
} = {}) {
  await page.addInitScript(({ seededState, storageKey, themeKey, themeMode, apiBaseUrl }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(seededState));
    window.localStorage.setItem(themeKey, themeMode);
    if (apiBaseUrl) window.localStorage.setItem("toji_api_base", apiBaseUrl);
  }, {
    seededState: state,
    storageKey: STORAGE_KEY,
    themeKey: THEME_KEY,
    themeMode: theme,
    apiBaseUrl: apiBase
  });
}

export async function loginAsAdmin(page, request, baseURL) {
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!password) {
    throw new Error("Missing ADMIN_PASSWORD for Playwright admin login.");
  }

  const response = await request.post(`${baseURL}/api/admin/session/login`, {
    data: { password }
  });
  expect(response.ok()).toBeTruthy();

  const headers = response.headers();
  const setCookie = headers["set-cookie"] || "";
  const match = setCookie.match(/toji_admin_session=([^;]+)/i);
  if (!match) {
    throw new Error("Missing admin session cookie in Playwright login response.");
  }

  const url = new URL(baseURL);
  await page.context().addCookies([{
    name: ADMIN_SESSION_COOKIE,
    value: decodeURIComponent(match[1]),
    domain: url.hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax"
  }]);
}

export async function mockPublicApi(page, state = E2E_ADMIN_STATE) {
  const publishedArtworks = (state.artworks || []).filter((artwork) => artwork.status === "published");
  const publicSeries = Object.values(state.seriesMeta || {})
    .filter((series) => series && series.isPublic !== false)
    .map((series) => ({
      ...series,
      publishedCount: publishedArtworks.filter((artwork) => artwork.series === series.name).length
    }));

  await page.route('**/api/public/artworks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publishedArtworks)
    });
  });

  await page.route('**/api/public/series', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publicSeries)
    });
  });
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(1);
}


export async function dismissSplashIfPresent(page) {
  const splash = page.locator('#splashScreen:not(.hidden)');
  if (await splash.count()) {
    const logo = page.locator('#splashLogo');
    if (await logo.isVisible().catch(() => false)) {
      await logo.click();
    }
    await page.locator('#splashScreen').evaluate((node) => {
      node.classList.add('hidden');
      document.body.classList.remove('splash-active');
    }).catch(() => {});
  }
}
