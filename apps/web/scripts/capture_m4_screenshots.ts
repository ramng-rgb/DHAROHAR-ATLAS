import { chromium } from "playwright";
import * as path from "path";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const assetsDir = path.resolve(__dirname, "../../../docs/assets");

  // 1. /search?q=stepwell
  console.log("Navigating to /search?q=stepwell...");
  await page.goto("http://localhost:3000/search?q=stepwell", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(assetsDir, "m4_search_grouped_results.png") });
  console.log("Saved m4_search_grouped_results.png");

  // 2. Hindi search /search?q=रानी+की+वाव
  console.log("Navigating to /search with Hindi query...");
  await page.goto("http://localhost:3000/search?q=%E0%A4%B0%E0%A4%BE%E0%A4%A8%E0%A4%80+%E0%A4%95%E0%A5%80+%E0%A4%B5%E0%A4%BE%E0%A4%B5", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(assetsDir, "m4_search_hindi_results.png") });
  console.log("Saved m4_search_hindi_results.png");

  // 3. /ask with answered cited query
  console.log("Navigating to /ask and asking a curated question...");
  await page.goto("http://localhost:3000/ask", { waitUntil: "networkidle" });
  // Click first example question button
  const exampleBtn = page.locator("button:has-text('Who commissioned Rani ki Vav')").first();
  if (await exampleBtn.isVisible()) {
    await exampleBtn.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: path.join(assetsDir, "m4_ask_the_archive_cited.png") });
  console.log("Saved m4_ask_the_archive_cited.png");

  // 4. /ask with unanswerable query refusal
  console.log("Submitting unanswerable query...");
  const input = page.locator("textarea#ask-question-input, input[placeholder*='Ask any question'], textarea").first();
  if (await input.isVisible()) {
    await input.fill("What is the history of the Eiffel Tower in Paris?");
    const submitBtn = page.locator("button[type='submit']").first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(assetsDir, "m4_ask_refusal_state.png") });
  console.log("Saved m4_ask_refusal_state.png");

  // 5. /admin/search diagnostic page
  console.log("Navigating to /admin/search...");
  await page.goto("http://localhost:3000/admin/search", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(assetsDir, "m4_admin_search_telemetry.png") });
  console.log("Saved m4_admin_search_telemetry.png");

  await browser.close();
  console.log("All M4 screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
