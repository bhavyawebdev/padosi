import { test, expect } from "@playwright/test";

/**
 * Playwright E2E smoke tests
 * Run: npm run test:e2e
 */
test.describe("Aas-Paas smoke tests", () => {
  test("landing page loads and shows brand name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Aas-Paas/);
    await expect(page.locator("h1").first()).toContainText("Aas-Paas");
  });

  test("unauthenticated app routes redirect to login", async ({ page }) => {
    // ProtectedRoute sends unauthenticated visitors to /login.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
  });

  test("cron endpoint rejects requests without the CRON_SECRET bearer token", async ({ request }) => {
    // No Authorization header → must be rejected before any work happens.
    const response = await request.get("/api/cron/cleanup-unverified");
    expect(response.status()).toBe(401);
  });
});
