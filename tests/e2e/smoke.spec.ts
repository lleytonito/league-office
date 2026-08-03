import { expect, test } from "@playwright/test";

test("loads the public feed without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/league office/i).first()).toBeVisible();
  await page.getByLabel(/open navigation menu/i).click();
  await expect(page.getByRole("link", { name: /submit proposal/i }).first()).toBeVisible();

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
