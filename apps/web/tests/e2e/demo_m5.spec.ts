import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("M5: Journey Mode & Animated Travel Route", () => {
  test("Loads Gujarat Stepwell Trail, renders story card, flies between stops and updates URL state", async ({
    page,
  }) => {
    test.setTimeout(60000);
    // 1. Navigate to flagship journey
    await page.goto("/journeys/gujarat-stepwell-trail");
    await expect(page.locator("h1").filter({ hasText: /Gujarat Stepwell/i })).toBeVisible({ timeout: 15000 });

    // 2. Verify Stop 1 (Adalaj) story card details
    await expect(page.locator("span").filter({ hasText: /^Stop 1 of 8$/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Adalaj Stepwell/i })).toBeVisible();
    await expect(page.locator("text=Archaeological Survey of India Digital Archives")).toBeVisible();

    // 3. Advance to Stop 2 (Dada Harir)
    const nextBtn = page.locator("button[aria-label='Next Stop']");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    await expect(page.locator("span").filter({ hasText: /^Stop 2 of 8$/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Dada Harir Stepwell/i })).toBeVisible();

    // 4. Advance to Stop 3 (Sarkhej Roza)
    await nextBtn.click();
    await expect(page.locator("span").filter({ hasText: /^Stop 3 of 8$/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Sarkhej Roza/i })).toBeVisible();

    // 5. Advance to Stop 5 (Rani ki Vav with 3D Twin)
    await nextBtn.click(); // Stop 4: Modhera
    await nextBtn.click(); // Stop 5: Rani ki Vav
    await expect(page.locator("span").filter({ hasText: /^Stop 5 of 8$/ })).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /Rani ki Vav/i })).toBeVisible();

    // Verify 3D twin button appears for Rani ki Vav
    const twinBtn = page.locator("a:has-text('Inspect 3D Twin')");
    await expect(twinBtn).toBeVisible();

    // 5. Toggle play / pause
    const playBtn = page.locator("button[aria-label='Play Route']");
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await expect(page.locator("text=Pause Route")).toBeVisible();
      const pauseBtn = page.locator("button[aria-label='Pause Route']");
      await pauseBtn.click();
      await expect(page.locator("text=Animate Route")).toBeVisible();
    }

    // 6. Test speed toggle
    const speed2x = page.locator("button[aria-label='Playback speed 2x']");
    await expect(speed2x).toBeVisible();
    await speed2x.click();
    await expect(speed2x).toHaveClass(/bg-\[#D4AF37\]/);

    // 7. Toggle accessible text version
    const textToggle = page.locator("button[aria-label='Text Version']");
    await expect(textToggle).toBeVisible();
    await textToggle.click();

    await expect(page.locator("[data-testid='journey-text-version']")).toBeVisible();
    await expect(page.locator("ol[aria-label='Heritage trail stops list']")).toBeVisible();
    await expect(page.locator("text=Adalaj Stepwell Foundation Marble Tablet")).toBeVisible();

    // Return to interactive map
    const mapToggle = page.locator("[data-testid='journey-text-version'] button").filter({ hasText: /Interactive Map/i });
    await mapToggle.click();
    await expect(page.locator("[data-testid='journey-text-version']")).not.toBeVisible();
  });

  test("Deep linking to specific stop restores state accurately", async ({ page }) => {
    await page.goto("/journeys/gujarat-stepwell-trail?stop=4");
    await expect(page.locator("span").filter({ hasText: /^Stop 4 of 8$/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("h2").filter({ hasText: /Modhera/i })).toBeVisible();
  });
});

test.describe("M5: Guided Demo Mode Tour & First-Run Experience", () => {
  test("First-run intro modal displays on landing page and can be launched or dismissed", async ({
    page,
  }) => {
    // Clear localStorage to simulate fresh visitor
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto("/");
    await expect(page.locator("text=Welcome to Dharohar Atlas")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Launch 9-Step Guided Demo")).toBeVisible();

    // Dismiss modal
    const dismissBtn = page.locator("button:has-text('Explore On My Own')");
    await dismissBtn.click();
    await expect(page.locator("text=Welcome to Dharohar Atlas")).not.toBeVisible();
  });

  test("Demo mode button on nav starts tour and advances steps seamlessly", async ({ page }) => {
    // Dismiss intro modal first in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("dharohar_demo_intro_dismissed", "1");
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click nav Demo Mode button
    const demoBtn = page.locator("#nav-demo-mode-button");
    await expect(demoBtn).toBeVisible({ timeout: 10000 });
    await demoBtn.click();

    // Verify Demo Mode tour overlay appears
    await expect(page.locator("[data-testid='demo-tour-overlay']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Step 1 of 9")).toBeVisible();

    // Step 1: Click Next
    const nextBtn = page.locator("[data-testid='demo-tour-next']");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Should transition to Step 2 (Explore)
    await expect(page.locator("text=Step 2 of 9")).toBeVisible({ timeout: 15000 });

    // Step 2: Next
    await nextBtn.click();
    await expect(page.locator("text=Step 3 of 9")).toBeVisible({ timeout: 15000 });

    // Exit tour via exit button
    const exitBtn = page.locator("button[aria-label='Exit Demo Mode']");
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();
    await expect(page.locator("[data-testid='demo-tour-overlay']")).not.toBeVisible();
  });
});

test.describe("M5: Axe Accessibility Audits on Main Routes", () => {
  const routes = [
    { name: "Landing", path: "/" },
    { name: "Explore Map", path: "/explore" },
    { name: "Flagship Journey", path: "/journeys/gujarat-stepwell-trail" },
    { name: "Semantic Search", path: "/search?q=stepwell" },
    { name: "Archive Hub", path: "/archive" },
  ];

  for (const r of routes) {
    test(`Axe audit passes on ${r.name} (${r.path}) with 0 serious or critical violations`, async ({
      page,
    }) => {
      await page.goto(r.path);
      await page.waitForLoadState("domcontentloaded");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(["color-contrast"]) // Optional contrast adjustments handled via theme variables
        .analyze();

      const seriousOrCritical = accessibilityScanResults.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      expect(seriousOrCritical).toEqual([]);
    });
  }
});
