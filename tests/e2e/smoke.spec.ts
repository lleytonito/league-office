import { expect, test } from "@playwright/test";

test("loads the public feed without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/league office/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /submit proposal/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /last year's rules/i }).first()).toBeVisible();
  await page.getByLabel(/open navigation menu/i).click();
  await expect(page.getByRole("link", { name: /submit proposal/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /last year's rules/i }).first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("loads the static rules screen without horizontal overflow", async ({ page }) => {
  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: /last year's rules/i })).toBeVisible();
  await expect(page.getByText(/Lleyton's All stars/i)).toBeVisible();
  await expect(page.getByText(/Head to Head Points/i)).toBeVisible();
  await page.locator("summary").filter({ hasText: /^Passing/ }).click();
  await expect(page.getByText(/TD Pass \(PTD\)/i)).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("gates the member directory behind Google sign-in", async ({ page }) => {
  await page.goto("/members");

  await expect(page.getByText(/league business, handled cleanly/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("gates admin CSV exports behind sign-in", async ({ request }) => {
  const response = await request.get("/admin/exports/members");

  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).toContain("application/json");
});
