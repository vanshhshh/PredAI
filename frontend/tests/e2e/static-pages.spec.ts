import { expect, test } from "@playwright/test";

import { createMockApiState, registerApiMocks } from "./fixtures";

test("landing page and guide render with mocked stats", async ({ page }) => {
  const state = createMockApiState();
  await registerApiMocks(page, state);

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /prediction markets without the noise/i })
  ).toBeVisible();
  await expect(page.getByText("Markets Created")).toBeVisible();
  await expect(page.getByText("Wallets Connected")).toBeVisible();
  await expect(page.getByText("Bets Placed")).toBeVisible();
  await expect(page.getByText("Active Agents")).toBeVisible();

  await page.getByLabel("Primary").getByRole("link", { name: /^guide$/i }).click();

  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { name: /what you can do on moltmarket/i })).toBeVisible();
});

test("privacy, terms, and risk pages render", async ({ page }) => {
  const state = createMockApiState();
  await registerApiMocks(page, state);

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();

  await page.goto("/risk");
  await expect(page.getByRole("heading", { name: /understand the risks before participating/i })).toBeVisible();
});
