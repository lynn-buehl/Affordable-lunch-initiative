import { test, expect } from "@playwright/test";

/**
 * Smoke test for the Phase 2 ALI workflow: adding an ingredient directly
 * from the vote screen, voting a quantity (not just yes/no), and the
 * package-rounded shopping list, the tick-off checklist, and member profiles. Same preconditions as golden-path.spec.ts.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password123";

test("add an ingredient on the vote screen, vote a quantity, and see the package-rounded list", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => url.pathname === "/");

  // Unique names so this stays green even re-run against a non-disposable
  // DB (each run would otherwise add another same-named ingredient/event).
  const suffix = Date.now();
  const eventName = `Smoke Test ALI ${suffix}`;
  const ingredientName = `Smoke Test Wraps ${suffix}`;

  await page.goto("/ali");
  await page.click('button:has-text("New ALI")');
  await page.fill("#event-name", eventName);
  await page.fill("#event-type", "Smoke Test ALI");
  await page.click('button:has-text("Create")');
  await page.waitForURL("**/ali/*");

  // Add a brand-new ingredient directly from the vote screen, with a
  // starting quantity, instead of going through /ingredients first.
  await page.fill("#new-ingredient-name", ingredientName);
  await page.fill("#new-ingredient-package-size", "8");
  await page.fill("#new-ingredient-quantity", "10");
  await page.click('button:has-text("Add & vote")');
  await expect(page.getByText(ingredientName).first()).toBeVisible();

  // Bump the quantity by 2 more via the stepper (10 -> 12).
  await page.click(`button[aria-label="More ${ingredientName}"]`);
  await page.click(`button[aria-label="More ${ingredientName}"]`);

  await page.click('button:has-text("Start shopping")');
  await page.click('div[role="dialog"] button:has-text("Start shopping")');

  // 12 wanted at 8/package rounds up to 2 packages to buy.
  const row = page.locator(`[data-shopping-item="${ingredientName}"]`);
  await expect(row).toContainText("12 wanted");
  await expect(row).toContainText("2×");

  // Ticking an item off is saved on the server, so it survives a reload.
  const checkbox = row.getByRole("checkbox");
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(row.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

  // The shopper shows up in the member directory with a profile page.
  await page.goto("/members");
  await page.locator('a[href^="/members/"]').first().click();
  await expect(page.getByText("Favourite ingredients")).toBeVisible();
});
