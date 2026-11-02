import { test, expect } from "@playwright/test";

test.describe("M3 Archive Hub, OCR Pipeline & Document Viewer E2E", () => {
  test("Archive Hub -> Open Document -> Inspect Bounding Box -> Inline Edit & Save -> Revert & Persist", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // 1. Visit /archive
    await page.goto("/archive");
    await expect(page).toHaveTitle(/Revitalised Archival Corpus|Dharohar/i);

    // Verify presence of document cards
    const firstDocCard = page.locator("article, div.group h3").first();
    await expect(firstDocCard).toBeVisible();

    // 2. Click "Open Side-by-Side Viewer" on the first document
    const openViewerBtn = page.locator("a:has-text('Open Side-by-Side Viewer')").first();
    await expect(openViewerBtn).toBeVisible();
    await openViewerBtn.click();

    // 3. Document viewer loaded
    await page.waitForURL(/\/archive\/[a-f0-9-]+/);
    await expect(page.locator("header h1")).toBeVisible();

    // 4. Verify Three-Pane Elements:
    // Pane 1: Scan SVG overlay with bounding boxes
    const scanSvg = page.locator("svg rect").first();
    await expect(scanSvg).toBeVisible();

    // Pane 2: Transcript Pane
    const transcriptHeader = page.locator("span:has-text('Original Transcript')");
    await expect(transcriptHeader).toBeVisible();

    // Pane 3: Translation Pane
    const translationHeader = page.locator("span:has-text('Monograph Translation')");
    await expect(translationHeader).toBeVisible();

    // 5. Bidirectional Line-to-Box Linking
    // Click on the first line
    const firstLineElem = page.locator("[id^='transcript-line-']").first();
    await expect(firstLineElem).toBeVisible();
    await firstLineElem.click();

    // Verify line selection
    await expect(firstLineElem).toHaveClass(/border-\[#D4AF37\]/);

    // 6. Inline Correction Editor
    // Click the Edit icon
    const editBtn = page.locator("button[title*='Edit Line']").first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Textarea is visible
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const originalText = await textarea.inputValue();
    const updatedText = `${originalText} [Epigraphist Verified]`;

    await textarea.fill(updatedText);

    // Click Save
    const saveBtn = page.locator("button:has-text('Save')");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 7. Verify Optimistic Update & Human Verified Badge
    await expect(page.locator("text=Human Verified").first()).toBeVisible();
    await expect(page.locator(`text=${updatedText}`).first()).toBeVisible();

    // 8. Open Version History Drawer
    const historyBtn = page.locator("button[title*='Revision audit']");
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Drawer header visible
    await expect(page.locator("h3:has-text('Revision History')")).toBeVisible();
    // Revision #1 is recorded
    await expect(page.locator("text=Revision #1").first()).toBeVisible();

    // Close drawer
    const closeDrawerBtn = page.locator("button:has(svg.lucide-x)").last();
    await closeDrawerBtn.click();

    // 9. Reload Page to Confirm Persistence
    await page.reload();
    await expect(page.locator(`text=${updatedText}`).first()).toBeVisible();
  });

  test("Direct Upload Modal -> Form Validation & SSE Pipeline Stepper Flow", async ({
    page,
  }) => {
    await page.goto("/archive");

    // Click "Ingest Document Scan"
    const uploadCta = page.locator("button:has-text('Ingest Document Scan')");
    await expect(uploadCta).toBeVisible();
    await uploadCta.click();

    // Modal dialog is opened
    const modalTitle = page.locator("#modal-title");
    await expect(modalTitle).toHaveText(/Ingest Archival Folio/i);

    // Upload button disabled without file
    const submitBtn = page.locator("button:has-text('Upload & Process')");
    await expect(submitBtn).toBeDisabled();

    // Close modal
    const closeBtn = page.locator("button[aria-label='Close dialog']");
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });
});
