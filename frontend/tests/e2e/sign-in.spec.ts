import { test, expect } from "@playwright/test";

test("sign-in page shows wallet-only options", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page.getByRole("heading", { name: /connect to predai/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /connect metamask/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /connect phantom/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /connect walletconnect/i })).toBeVisible();
});
