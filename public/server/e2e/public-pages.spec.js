import { test, expect } from "@playwright/test";
import { dismissSplashIfPresent, expectNoHorizontalOverflow, mockPublicApi, seedClientState } from "./helpers/browser-helpers.js";

test.describe("public pages", () => {
  test("home supports theme switching and staged content", async ({ page }) => {
    await seedClientState(page, { theme: "dark" });
    await mockPublicApi(page);
    await page.goto("/");
    await dismissSplashIfPresent(page);

    await expect(page.locator("#featuredSection")).toBeVisible();
    await expect(page.locator(".home-series-card").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("series page opens a collection view without horizontal overflow", async ({ page }) => {
    await seedClientState(page, { theme: "light" });
    await mockPublicApi(page);
    await page.goto("/series.html?s=night-forms");

    await expect(page.locator("#seriesListPanel")).toBeVisible();
    await expect(page.locator(".series-detail-hero")).toBeVisible();
    await expect(page.locator(".series-anchor-grid .card").first()).toBeVisible();
    await expect(page.locator(".series-detail-hero__top .sub")).toContainText("3 piece");
    await expectNoHorizontalOverflow(page);
  });

  test("artwork page shows series context and related work at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { theme: "dark" });
    await mockPublicApi(page);
    await page.goto("/artwork.html?id=art-1");

    await expect(page.locator("#seriesContext")).toBeVisible();
    await expect(page.locator("#seriesLinks .btn")).toHaveCount(2);
    await expect(page.locator("#toolbarSeriesLinks .page-toolbar__pill")).toHaveCount(2);
    await expect(page.locator("#moreGrid .card").first()).toBeVisible();
    const contextBox = await page.locator(".artwork-context-card").boundingBox();
    const relatedBox = await page.locator(".artwork-related-card").boundingBox();
    expect(contextBox && relatedBox && relatedBox.y > contextBox.y).toBeTruthy();
  });

  test("lightbox keeps the bottom navigation usable on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { theme: "dark" });
    await mockPublicApi(page);
    await page.goto("/");
    await dismissSplashIfPresent(page);

    await page.locator("#featuredStrip .card").first().click();
    const lightbox = page.locator(".lb-backdrop");
    await expect(lightbox).toBeVisible();

    const sequence = page.locator(".lb-sequence");
    await expect(sequence).toBeVisible();
    await expect(page.locator(".lb-title")).toContainText("Night Forms +1 more");
    await expect(sequence.getByRole("button", { name: "Previous image" })).toBeVisible();
    await expect(sequence.getByText(/Image 1 of/i)).toBeVisible();
    await expect(sequence.getByRole("button", { name: "Next image" })).toBeVisible();
  });
});
