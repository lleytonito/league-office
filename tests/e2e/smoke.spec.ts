import { expect, test } from "@playwright/test";

test("gates the home screen behind Google sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "League Office." })).toBeVisible();
  await expect(page.getByText(/sign in to view the feed/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByText(/google login creates your member profile/i)).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("gates the rules screen behind Google sign-in", async ({ page }) => {
  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: "League Office." })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByText(/Lleyton's All stars/i)).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("gates the member directory behind Google sign-in", async ({ page }) => {
  await page.goto("/members");

  await expect(page.getByRole("heading", { name: "League Office." })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("gates admin CSV exports behind sign-in", async ({ request }) => {
  const response = await request.get("/admin/exports/members");

  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).toContain("application/json");
});
