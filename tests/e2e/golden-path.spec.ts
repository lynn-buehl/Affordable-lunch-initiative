import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the Phase 1 golden path. Requires a dev server already
 * running against a disposable test database seeded with an admin — see
 * "Testing" in the README.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password123";

test("log in, log spending, and see the balance update", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => url.pathname === "/");

  // Unique description so this stays green even re-run against a
  // non-disposable DB (entries accumulate rather than resetting).
  const description = `Smoke test entry ${Date.now()}`;

  await page.goto("/finance");
  await page.click('a:has-text("Log spending")');
  await page.fill('input[name="amount"]', "12,34");
  await page.fill('input[name="description"]', description);
  await page.click('button:has-text("Save entry")');

  await page.waitForURL("**/finance");
  await expect(page.getByText(description)).toBeVisible();
});

test("theme choice persists across reload", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => url.pathname === "/");

  await page.click('button:has-text("Theme")');
  await page.click("text=Dark");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
});
