/**
 * Playwright Auth Setup
 *
 * Logs in once with a pre-confirmed test user and saves cookies to
 * .auth/user.json. All other test projects reuse this storageState,
 * so they start authenticated.
 *
 * Requirements:
 *   - Test user must exist in Supabase (email confirmation disabled on staging)
 *   - Password via env: TEST_USER_PASSWORD (defaults to "TestPass123!")
 *   - Supabase must be running (local or staging)
 */

import { test as setup } from "@playwright/test";

const TEST_EMAIL = "test-1782723333911-rwcodw@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPass123!";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  // Fill credentials
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // After successful login, Supabase redirects to /dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Save auth state for reuse
  await page.context().storageState({ path: ".auth/user.json" });
});
