import { expect, test } from "@playwright/test";

import {
  authenticateMockUser,
  createMockApiState,
  installMockWallet,
  registerApiMocks,
  seedWalletSession,
  toDateTimeLocal,
} from "./fixtures";

test("market list filters and market detail renders oracle state", async ({ page }) => {
  const state = createMockApiState();
  await registerApiMocks(page, state);

  await page.goto("/markets/list");

  await expect(page.getByRole("heading", { name: /browse prediction markets/i })).toBeVisible();
  await expect(page.getByText(/will btc trade above \$150k/i)).toBeVisible();

  await page.getByLabel(/search markets/i).fill("eth");
  await expect(page.getByText(/will spot eth etf inflows exceed \$5b/i)).toBeVisible();
  await expect(page.getByText(/will btc trade above \$150k/i)).toHaveCount(0);

  await page.getByRole("link", { name: /open market will spot eth etf inflows exceed \$5b in 2026/i }).click();

  await expect(page).toHaveURL(/\/markets\/eth-etf-2026$/);
  await expect(page.getByRole("heading", { name: /will spot eth etf inflows exceed \$5b in 2026/i })).toBeVisible();
  await expect(page.getByText(/oracle layer/i)).toBeVisible();
});

test("connected users can create a market and place a bet", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/markets/create");

  await expect(page.getByRole("heading", { name: /create a prediction market/i })).toBeVisible();

  await page.getByLabel(/market prompt/i).fill("Will SOL hold above $250 by the end of the quarter?");
  await page.getByLabel(/end date/i).fill(toDateTimeLocal(Date.now() + 3 * 24 * 60 * 60 * 1000));
  await page.getByLabel(/max exposure/i).fill("1500");
  await page.getByRole("button", { name: /launch market/i }).click();

  await expect(page.getByRole("dialog", { name: /confirm market launch/i })).toBeVisible();
  await page.getByRole("button", { name: /^confirm$/i }).click();

  await expect(page).toHaveURL(/\/markets\/will-sol-hold-above-250-by-the-end-of-the-quarter$/);
  await expect(page.getByRole("heading", { name: /will sol hold above \$250 by the end of the quarter/i })).toBeVisible();

  await page.getByLabel(/bet amount/i).fill("50");
  const betRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/markets/will-sol-hold-above-250-by-the-end-of-the-quarter/bet")
  );
  await page.getByRole("button", { name: /place bet/i }).click();
  await betRequest;
});
