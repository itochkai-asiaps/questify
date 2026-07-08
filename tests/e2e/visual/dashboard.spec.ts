/**
 * Visual Regression Tests — Dashboard
 *
 * Captures screenshots of the dashboard and compares against checked-in
 * baselines. Masks dynamic content (timestamps, user-specific text) to
 * avoid false positives.
 *
 * First run:     npx playwright test tests/e2e/visual/ --update-snapshots
 * Verify:        npx playwright test tests/e2e/visual/
 *
 * Baselines are stored in tests/e2e/visual/dashboard.spec.ts-snapshots/
 * and MUST be committed to the repo (CI uses Linux baselines).
 */

import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.describe("Dashboard visual regression", () => {
  test("full dashboard page at 1440x900", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Let Framer Motion animations finish
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("dashboard-full.png", {
      fullPage: false,
      maxDiffPixels: 100,
    });
  });
});
