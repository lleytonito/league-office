import { expect, test } from "@playwright/test";

test("loads the public feed without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /league feed/i })).toBeVisible();
  await expect(page.getByText(/sign in to participate/i)).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
