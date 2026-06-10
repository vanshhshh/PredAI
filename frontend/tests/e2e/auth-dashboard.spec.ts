import { expect, test } from "@playwright/test";

import { createMockApiState, installMockWallet, registerApiMocks } from "./fixtures";

test("wallet onboarding signs in and redirects to the dashboard", async ({ page }) => {
  const state = createMockApiState();
  await installMockWallet(page);
  await registerApiMocks(page, state);

  await page.goto("/sign-in");

  await expect(page.getByRole("heading", { name: /connect to moltmarket/i })).toBeVisible();
  await page.getByLabel(/18\+ and allowed/i).check();
  await expect(page.getByRole("button", { name: /connect metamask/i })).toBeEnabled();

  await page.getByRole("button", { name: /connect metamask/i }).click();

  await expect(page.getByRole("heading", { name: /choose your username/i })).toBeVisible();
  await page.getByLabel(/username/i).fill("tester");
  await expect(page.getByText(/username is available/i)).toBeVisible();

  await page.getByRole("button", { name: /save & continue/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /portfolio overview/i })).toBeVisible();
  await expect(page.getByLabel(/connected wallet tester/i)).toBeVisible();
});
