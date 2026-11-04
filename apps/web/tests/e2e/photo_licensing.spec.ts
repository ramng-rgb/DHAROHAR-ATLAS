import { test, expect } from "@playwright/test";

test.describe("Real Photo Licensing & Attribution Flow", () => {
  test("monument site page loads hero image and displays visible credit link with 0 console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to Rani ki Vav
    await page.goto("/sites/rani-ki-vav-patan");
    await expect(page).toHaveTitle(/Rani ki Vav/i);

    // Assert hero image is rendered and loaded (naturalWidth > 0)
    const heroImage = page.locator("img[alt*='Rani ki Vav']").first();
    await expect(heroImage).toBeVisible();

    const naturalWidth = await heroImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // Assert credit and Commons attribution link are visible
    const attributionStrip = page.locator("text=Photo:").first();
    await expect(attributionStrip).toBeVisible();

    const commonsLink = page.locator("a[href*='commons.wikimedia.org']").first();
    await expect(commonsLink).toBeVisible();

    // Verify /credits page loads and lists photographic assets
    await page.goto("/credits");
    await expect(page).toHaveTitle(/Credits/i);
    await expect(page.locator("h1:has-text('Image Credits')")).toBeVisible();
    await expect(page.locator("text=Rani Ki Vav Patan").or(page.locator("text=Rani Ki Vav"))).toBeVisible();

    // Assert zero console errors
    const fatalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("hydrat")
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
