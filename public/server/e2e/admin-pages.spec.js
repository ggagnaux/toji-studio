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

  test("upload page supports batch multi-series selection and mode preview", async ({ page }) => {
    await page.goto("/admin/upload");

    await page.locator('[data-series-mode="append"]').click();
    await page.locator("#seriesSelect").selectOption("night-forms");
    await page.locator("#addSeriesBtn").click();
    await page.locator("#seriesSelect").selectOption("signal-bloom");
    await page.locator("#addSeriesBtn").click();

    await expect(page.locator("#selectedSeriesChips")).toContainText("Night Forms");
    await expect(page.locator("#selectedSeriesChips")).toContainText("Signal Bloom");
    await expect(page.locator("#seriesModePreview")).toContainText("Append mode will add 2 series");
  });

  test("upload page submits selected multi-series memberships in the request payload", async ({ page }) => {
    let capturedBody = "";
    await page.route("**/api/admin/upload", async (route) => {
      capturedBody = route.request().postDataBuffer()?.toString("utf8") || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          created: [{
            id: "upload-art-1",
            title: "Uploaded Multi Series",
            status: "draft",
            featured: false,
            series: "Night Forms",
            seriesSlugs: ["night-forms", "signal-bloom"],
            year: "2026",
            description: "",
            alt: "",
            tags: [],
            thumb: "assets/img/placeholders/p1.jpg",
            image: "assets/img/placeholders/p1.jpg",
            createdAt: "2026-03-10T00:00:00.000Z",
            publishedAt: null,
            sortOrder: 0
          }],
          skipped: []
        })
      });
    });

    await page.goto("/admin/upload");
    await page.locator('[data-series-mode="replace"]').click();
    await page.locator("#seriesSelect").selectOption("night-forms");
    await page.locator("#addSeriesBtn").click();
    await page.locator("#seriesSelect").selectOption("signal-bloom");
    await page.locator("#addSeriesBtn").click();
    await page.locator("#files").setInputFiles({
      name: "multi-series.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=", "base64")
    });
    await page.locator("#uploadBtn").click();
    await expect.poll(() => capturedBody.includes('name="seriesSlugs"')).toBeTruthy();
    expect(capturedBody).toContain('["night-forms","signal-bloom"]');
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
