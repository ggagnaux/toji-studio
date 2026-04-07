import { test, expect } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  loginAsAdmin,
  seedClientState
} from "./helpers/browser-helpers.js";

test.describe("admin pages", () => {
  test.beforeEach(async ({ page, request, baseURL }) => {
    await seedClientState(page, { theme: "dark", apiBase: baseURL });
    await loginAsAdmin(page, request, baseURL);
  });

  test("dashboard loads with compact controls and theme switching", async ({ page }) => {
    await page.goto("/admin/index");

    await expect(page.locator(".dashboard-controls")).toBeVisible();
    await expect(page.locator("#rowTableShell")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator('.page-toolbar__theme [data-theme-choice="light"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("upload page remains usable on tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/admin/upload");

    await expect(page.locator("#uploadOriginalsPanel")).toBeVisible();
    await expect(page.locator("#statusPills")).toBeVisible();
    await expect(page.locator("#uploadReadiness")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("series manager collapses cleanly on narrower widths", async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 1100 });
    await page.goto("/admin/series");

    await expect(page.locator("#seriesListCard")).toBeVisible();
    await expect(page.locator("#seriesEditorCard")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("other settings tabs stay usable in light theme", async ({ page }) => {
    await page.goto("/admin/OtherSettings");
    await page.locator('.page-toolbar__theme [data-theme-choice="light"]').click();

    await expect(page.locator(".other-settings-tabbar")).toBeVisible();
    await expect(page.locator("#otherTabBanner")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
