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
