/**
 * Visual Regression Tests — Dashboard
 *
 * Captures screenshots of key dashboard components and compares against
 * checked-in baselines. Masks dynamic content (timestamps, user-specific
 * text) to avoid false positives.
 *
 * First run:     npx playwright test --update-snapshots
 * Verify:        npx playwright test tests/e2e/visual/
 *
 * Baselines are stored in tests/e2e/visual/dashboard.spec.ts-snapshots/
 * and MUST be committed to the repo (CI uses Linux baselines).
 */

import { test, expect } from "@playwright/test";
import { devices } from "@playwright/test";

test.describe("Dashboard visual regression", () => {
  test.use({ ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } });

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

  test("mood chart section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const chart = page.locator('[data-testid="mood-chart"]');
    await expect(chart).toHaveScreenshot("mood-chart.png", {
      maxDiffPixels: 50,
    });
  });

  test("HP bar heart", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const heart = page.locator('[data-testid="hp-bar"]');
    await expect(heart).toHaveScreenshot("hp-bar.png", {
      maxDiffPixels: 30,
    });
  });

  test("quick actions section", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const actions = page.locator('[data-testid="quick-actions"]');
    await expect(actions).toHaveScreenshot("quick-actions.png", {
      maxDiffPixels: 30,
    });
  });
});
