import { test, expect } from "@playwright/test";

test.describe("M2 Site Page & 3D Digital Twin Viewer E2E", () => {
  test("Explore -> Open site page -> Load 3D model -> Click hotspot -> Open cite modal", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Track console errors and network 400s
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("response", (res) => {
      if (res.status() === 400) {
        console.log("400 Response URL:", res.url());
      }
    });

    // 1. Start from /explore
    await page.goto("/explore");
    await expect(page).toHaveTitle(/Explore|Dharohar/i);

    // Switch to List View for reliable selection
    const listViewToggle = page.locator("button:has-text('List View')").first();
    await expect(listViewToggle).toBeVisible();
    await listViewToggle.click();

    // Verify 3D Model badge is visible on Rani ki Vav in list view
    const raniCard = page.locator("article:has-text('Rani ki Vav')").first();
    await expect(raniCard).toBeVisible();
    await expect(raniCard.locator("text=3D Model")).toBeVisible();

    // Click Rani ki Vav to open preview drawer
    await raniCard.click();

    // 2. In Preview Drawer, click 'Open site page'
    const openSiteBtn = page.getByRole("button", { name: /Open site page/i });
    await expect(openSiteBtn).toBeVisible();
    await openSiteBtn.click();

    // 3. Verify Site Page renders (/sites/rani-ki-vav)
    await expect(page).toHaveURL(/.*\/sites\/rani-ki-vav/);
    await expect(page.locator("h1:has-text('Rani ki Vav')")).toBeVisible();

    // Verify trilingual name block
    await expect(page.locator("text=રાણી ની વાવ").first()).toBeVisible();

    // Verify Sticky Section Nav exists
    const stickyNav = page.locator("nav[aria-label='Site page sections']");
    await expect(stickyNav).toBeVisible();

    // 4. Scroll to 3D Digital Twin Section
    const twinSection = page.locator("#twin-3d");
    await twinSection.scrollIntoViewIfNeeded();

    // Verify 3D Poster is displayed with 'Load 3D' button
    const load3DBtn = page.getByRole("button", { name: /Load 3D Digital Twin/i });
    await expect(load3DBtn).toBeVisible();

    // Click 'Load 3D Digital Twin'
    await load3DBtn.click();

    // 5. Assert 3D Canvas renders without crashing
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 6. Test Hotspot Directory below canvas
    const hotspotItem = page.locator("button:has-text('Subterranean Inverted Sanctum')").or(page.locator("button:has-text('Ground Entrance')")).first();
    await expect(hotspotItem).toBeVisible({ timeout: 10000 });
    await hotspotItem.click();

    // Assert Hotspot Tour Drawer opened with details
    const drawerTitle = page.locator("h3:has-text('Subterranean Inverted Sanctum')").or(page.locator("h3:has-text('Ground Entrance')")).first();
    await expect(drawerTitle).toBeVisible();
    await expect(page.locator("text=Vishnu").first()).toBeVisible();

    // 7. Test Cite Modal
    const citeButton = page.getByRole("button", { name: /Cite Record/i }).first();
    await expect(citeButton).toBeVisible();
    await citeButton.click();

    // Assert Cite Modal opens with BibTeX format
    const citeModalTitle = page.locator("h3:has-text('Cite This Heritage Record')");
    await expect(citeModalTitle).toBeVisible();

    const copyCitationBtn = page.getByRole("button", { name: /Copy Citation/i });
    await expect(copyCitationBtn).toBeVisible();
    await copyCitationBtn.click();

    // Close cite modal
    const closeCiteBtn = page.locator("button[aria-label='Close cite modal']");
    await closeCiteBtn.click();
    await expect(citeModalTitle).not.toBeVisible();

    // Verify no fatal console errors during execution
    const fatalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("WebGL") &&
        !err.includes("THREE.WebGLRenderer") &&
        !err.includes("favicon")
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test("Site without 3D model renders graceful photo/panorama fallback without crashing", async ({
    page,
  }) => {
    // Navigate directly to Rudra Mahalaya (temple without 3D model)
    await page.goto("/sites/rudra-mahalaya");
    await expect(page.locator("h1:has-text('Rudra Mahalaya')")).toBeVisible();

    // Scroll to 3D section and assert graceful fallback is rendered
    const fallbackBanner = page.locator("text=Archival Photography").or(page.locator("text=Simulate 360° Pan"));
    await expect(fallbackBanner.first()).toBeVisible();

    // Verify non-functional informational notice for M6
    await expect(page.locator("text=Contribute Imagery for 3D Reconstruction")).toBeVisible();
  });
});
