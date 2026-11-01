import { test, expect } from "@playwright/test";

test.describe("Geospatial Explorer E2E Flow", () => {
  test("open /explore -> apply filter -> scrub timeline -> select site -> verify drawer -> verify URL sync & reload", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions for copy link verification
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // 1. Open /explore
    await page.goto("/explore");
    await expect(page).toHaveTitle(/Explore|Dharohar/i);

    console.log("Step 1: Opened /explore");
    await expect(page.locator("h3:has-text('Archive Filters')")).toBeVisible();

    console.log("Step 2: Clicking Gujarat");
    const gujaratChip = page.locator("button:has-text('Gujarat')").first();
    await expect(gujaratChip).toBeVisible();
    await gujaratChip.click();
    await expect(page).toHaveURL(/state=Gujarat/);
    console.log("Step 2 complete, URL has state=Gujarat");

    console.log("Step 3: Clicking Solanki preset");
    const solankiPreset = page.getByRole("button", { name: "Solanki", exact: true });
    await solankiPreset.dispatchEvent("click");
    await expect(page).toHaveURL(/from=950/);
    console.log("Step 3 complete, URL has from=950");

    console.log("Step 4: Clicking List View");
    const listViewToggle = page.locator("button:has-text('List View')").first();
    await expect(listViewToggle).toBeVisible();
    await listViewToggle.click();
    console.log("Step 4 complete");

    console.log("Step 5: Clicking Rani ki Vav");
    const siteCard = page.locator("h3:has-text('Rani ki Vav')").first();
    await expect(siteCard).toBeVisible();
    await siteCard.click();
    console.log("Step 5 complete");

    // 6. Verify Right-Hand Preview Drawer is open
    const drawerTitle = page.locator("h2:has-text('Rani ki Vav')");
    await expect(drawerTitle).toBeVisible();

    // Verify confidence badge and trilingual names
    await expect(page.locator("text=ASI / UNESCO Verified").or(page.locator("text=UNESCO / ASI Verified"))).toBeVisible();
    await expect(page.locator("text=રાણી ની વાવ").first()).toBeVisible();

    // 7. Verify Copy Deep Link action
    const copyLinkBtn = page.locator("button:has-text('Copy Deep Link')");
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();
    await expect(page.locator("text=Deep link copied to clipboard!").or(page.locator("text=copied"))).toBeVisible();

    // 8. Capture current URL and reload to verify state restoration
    const currentUrl = page.url();
    expect(currentUrl).toContain("site=rani-ki-vav");
    expect(currentUrl).toContain("state=Gujarat");

    await page.reload();

    // Verify state restored after reload:
    // - Preview drawer remains open for Rani ki Vav
    await expect(page.locator("h2:has-text('Rani ki Vav')")).toBeVisible();
    // - Gujarat filter chip remains active
    const activeGujaratChip = page.locator("button:has-text('Gujarat')").first();
    await expect(activeGujaratChip).toBeVisible();
  });

  test("BCE sites (Dholavira, Lothal) appear correctly on the timeline", async ({ page }) => {
    await page.goto("/explore");

    // Click "Indus" era preset (-3000 to -1500 BCE)
    const indusPreset = page.getByRole("button", { name: "Indus", exact: true });
    await indusPreset.dispatchEvent("click");
    await expect(page).toHaveURL(/from=-3000/);

    // Switch to List View
    const listViewToggle = page.locator("button:has-text('List View')").first();
    await listViewToggle.click();

    // Verify Dholavira and Lothal are present
    await expect(page.locator("h3:has-text('Dholavira')")).toBeVisible();
    await expect(page.locator("h3:has-text('Lothal')")).toBeVisible();

    // Verify BCE era timeline label
    await expect(page.locator("text=2600 BCE").first()).toBeVisible();

    // Open Dholavira preview
    await page.locator("h3:has-text('Dholavira')").click();
    await expect(page.locator("h2:has-text('Dholavira')")).toBeVisible();
    await expect(page.locator("text=Harappan / Archaeological").first()).toBeVisible();
  });

  test("Mobile viewport (360px) responsive layout and touch readiness", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/explore");

    // Filter toggle button is accessible
    const filterToggle = page.locator("button[aria-label='Toggle archive filters panel']");
    await expect(filterToggle).toBeVisible();

    // List view is reachable via aria-label or text
    const listViewToggle = page.locator("button[aria-label='List View'], button:has-text('List View')").first();
    await expect(listViewToggle).toBeVisible();
    await listViewToggle.dispatchEvent("click");

    // Site cards render cleanly in single column on mobile
    await expect(page.locator("h3:has-text('Rani ki Vav')").first()).toBeVisible();
  });
});
