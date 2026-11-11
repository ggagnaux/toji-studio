import { test, expect } from "@playwright/test";
import { dismissSplashIfPresent, expectNoHorizontalOverflow, mockPublicApi, seedClientState } from "./helpers/browser-helpers.js";
import { E2E_ADMIN_STATE } from "./helpers/test-state.js";

test.describe("public pages", () => {
  test("shared back-to-top control returns the page to the top", async ({ page }) => {
    await seedClientState(page, { theme: "dark" });
    await mockPublicApi(page);
    await page.goto("/about.html");

    const backToTop = page.locator("#backToTopBtn");
    await expect(backToTop).toHaveAttribute("aria-hidden", "true");
    await page.evaluate(() => {
      document.body.style.minHeight = "2500px";
      window.scrollTo(0, 600);
    });
    await expect(backToTop).toBeVisible();
    await expect(backToTop).toHaveAttribute("aria-hidden", "false");
    const buttonBox = await backToTop.boundingBox();
    const viewport = page.viewportSize();
    expect(buttonBox?.width || 0).toBeLessThan((viewport?.width || 0) / 2);
    expect((viewport?.width || 0) - ((buttonBox?.x || 0) + (buttonBox?.width || 0))).toBeCloseTo(18, 0);

    await backToTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(backToTop).toHaveAttribute("aria-hidden", "true");
  });

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

  test("gallery series panel only displays public series", async ({ page }) => {
    const state = structuredClone(E2E_ADMIN_STATE);
    state.seriesMeta["private-studies"] = {
      name: "Private Studies",
      slug: "private-studies",
      isPublic: false,
      sortOrder: 30,
      imageOrder: ["art-private"]
    };
    state.artworks.push({
      ...state.artworks[0],
      id: "art-private",
      title: "Private Study",
      series: "Private Studies",
      seriesSlugs: ["private-studies"]
    });

    await seedClientState(page, { state, theme: "light" });
    await mockPublicApi(page, state);
    await page.goto("/gallery.html");
    await page.getByRole("tab", { name: "Series" }).click();

    await expect(page.locator("#seriesGrid .series-item")).toHaveCount(2);
    await expect(page.getByText("Night Forms", { exact: true })).toBeVisible();
    await expect(page.getByText("Signal Bloom", { exact: true })).toBeVisible();
    await expect(page.getByText("Private Studies", { exact: true })).toHaveCount(0);
  });

  test("series page replaces the old overview panels with homepage series cards", async ({ page }) => {
    await seedClientState(page, { theme: "light" });
    await mockPublicApi(page);
    await page.goto("/series.html");

    const cards = page.locator("#seriesCardsGrid .home-series-card");
    await expect(cards.first()).toBeVisible();
    await expect(page.locator("#seriesOverviewIntro")).toHaveText("Browse curated collection of images.");
    await expect(page.locator("#seriesDetailIntro")).toBeHidden();
    await expect(page.locator("#seriesListPanel")).toHaveCount(0);
    await expect(page.getByText("Series overview", { exact: true })).toHaveCount(0);

    const openSeriesButton = cards.first().getByRole("button", { name: "Open series" });
    const pageFontFamily = await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily);
    await expect(openSeriesButton).toHaveCSS("font-family", pageFontFamily);
    await expect(openSeriesButton).toHaveCSS("font-size", "16px");

    await cards.first().getByRole("button", { name: "Preview works" }).click();
    await expect(page.locator(".lb-backdrop")).toBeVisible();
    await page.keyboard.press("Escape");

    await openSeriesButton.click();
    await expect(page.locator("#seriesCardsSection")).toBeHidden();
    await expect(page.locator("#seriesDetailPanel")).toBeVisible();
    await expect(page.locator(".series-detail-hero")).toBeVisible();
    await expect(page.locator("#seriesOverviewIntro")).toBeHidden();
    await expect(page.locator("#seriesDetailIntro")).toBeVisible();
    await expect(page.getByText("Ordered run for this series", { exact: true })).toHaveCount(0);

    const highlightsButton = page.getByRole("button", { name: "Highlights" });
    const allPiecesButton = page.getByRole("button", { name: "All pieces" });
    await expect(highlightsButton).toBeEnabled();
    await expect(allPiecesButton).toBeEnabled();
    await highlightsButton.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await allPiecesButton.click();
    await expect.poll(() => page.locator("#seriesAllPieces").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(220);

    await page.getByRole("link", { name: "All Series" }).click();
    await expect(cards.first()).toBeVisible();
    await expect(page).not.toHaveURL(/\?s=/);
    await expectNoHorizontalOverflow(page);
  });

  test("series page preserves direct collection links at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientState(page, { theme: "light" });
    await mockPublicApi(page);
    await page.goto("/series.html?s=night-forms");

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
