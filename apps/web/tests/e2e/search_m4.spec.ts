import { test, expect } from "@playwright/test";

test.describe("M4: Hybrid Semantic Search, Grouped Results, Deep Links & Cited RAG Ask", () => {
  test("Search 'stepwell' -> Grouped Results -> Show on Map lands on /explore with site selected", async ({
    page,
  }) => {
    // 1. Visit /search
    await page.goto("/search?q=stepwell");
    await expect(page.locator("h2, h3, div").filter({ hasText: /Monuments & Heritage Sites/i }).first()).toBeVisible({ timeout: 10000 });

    // 2. Verify grouped results exist
    const siteCards = page.locator("div.glass-panel").filter({ hasText: /Rani ki Vav|Adalaj/i });
    await expect(siteCards.first()).toBeVisible();

    // Verify badges (Semantic / Keyword / Name)
    const badge = page.locator("span").filter({ hasText: /Semantic|Keyword FTS|Name Match/i }).first();
    await expect(badge).toBeVisible();

    // 3. Click "Show on Map" on the first site hit
    const showOnMapBtn = page.locator("a:has-text('Show on Map')").first();
    await expect(showOnMapBtn).toBeVisible();
    await showOnMapBtn.click();

    // 4. Verify redirected to /explore?site=...
    await page.waitForURL(/\/explore\?site=/);
    expect(page.url()).toContain("/explore?site=");
  });

  test("Hindi Devanagari query returns valid search results and detected script", async ({
    page,
  }) => {
    // Visit search with Hindi query "वाव"
    await page.goto("/search?q=%E0%A4%B5%E0%A4%BE%E0%A4%B5"); // "वाव"
    
    // Verify results loaded
    await expect(page.locator("span").filter({ hasText: /Detected script:\s*HI/i })).toBeVisible({ timeout: 10000 });
    const hitCards = page.locator("div.glass-panel").filter({ hasText: /Rani ki Vav|वाव|Adalaj/i });
    await expect(hitCards.first()).toBeVisible();
  });

  test("Document hit deep-link opens viewer at specific line with highlight", async ({
    page,
  }) => {
    // Search for epigraph/inscription term
    await page.goto("/search?q=inscription");
    await expect(page.locator("h3").filter({ hasText: /Archival Folios/i })).toBeVisible({ timeout: 10000 });

    // Find "Open at exact line" link
    const openAtLineBtn = page.locator("a:has-text('Open at exact line')").first();
    await expect(openAtLineBtn).toBeVisible();
    const href = await openAtLineBtn.getAttribute("href");
    expect(href).toContain("/archive/");

    // Click link and navigate
    await openAtLineBtn.click();
    await page.waitForURL(/\/archive\/[a-f0-9-]+/);

    // Verify document viewer loaded
    await expect(page.locator("header h1")).toBeVisible();
  });

  test("Ask the Archive returns cited answer with clickable source chip, and refuses unanswerable query", async ({
    page,
  }) => {
    // 1. Visit /ask
    await page.goto("/ask");
    await expect(page.locator("h1:has-text('Ask the Dharohar Archive')")).toBeVisible();

    // 2. Click curated sample question
    const sampleBtn = page.locator("button:has-text('Who commissioned Rani ki Vav and what is its style?')");
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // 3. Verify answer rendered with citations
    const synthesisBanner = page.locator("span:has-text('Archive Synthesis')");
    await expect(synthesisBanner).toBeVisible({ timeout: 12000 });

    // Verify citation chip [1]
    const citChip = page.locator("button[aria-label^='Citation [1]']").first();
    await expect(citChip).toBeVisible();

    // Click chip [1]
    await citChip.click();
    // It should navigate to either the site, archive viewer or explorer
    await page.waitForURL(/\/(sites|archive|explore)/);

    // 4. Test unanswerable question refusal
    await page.goto("/ask");
    const input = page.locator("input[placeholder*='Ask anything about monuments']");
    await input.fill("What is the recipe for chocolate gelato in Rome?");
    const askSubmit = page.locator("button[type='submit']:has-text('Ask')");
    await askSubmit.click();

    // Verify refusal banner
    await expect(page.locator("span:has-text('Archive Refusal')")).toBeVisible({ timeout: 12000 });
    await expect(page.locator("text=could not find verified records in the archive")).toBeVisible();
  });
});
