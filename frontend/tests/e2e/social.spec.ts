import { expect, test } from "@playwright/test";

import {
  authenticateMockUser,
  createMockApiState,
  installMockWallet,
  registerApiMocks,
  seedWalletSession,
} from "./fixtures";

test("social feeds render and prompt compiler deploys a market", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/social/feeds");

  await expect(page.getByRole("heading", { name: /signal monitor/i })).toBeVisible();
  await expect(page.getByText(/btc volatility is compressing into a breakout zone/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /spawn market from signal/i })).toHaveCount(0);

  await page.goto("/social/prompts");
  await page.getByLabel(/natural-language prompt/i).fill("Will ETH staking APR exceed 6% in Q3 2026?");
  await page.getByRole("button", { name: /compile prompt/i }).click();

  await expect(page.getByText(/^compiled market spec$/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /will eth staking apr exceed 6% in q3 2026/i })).toBeVisible();

  await page.getByRole("button", { name: /deploy market/i }).click();
  await expect(page).toHaveURL(/\/markets\/will-eth-staking-apr-exceed-6-in-q3-2026$/);
});

test("connected users can stake on social arguments", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/social/arguments");

  await expect(page.getByRole("heading", { name: /stake on reasoning/i })).toBeVisible();

  await page.getByLabel(/stake amount/i).first().fill("5");
  const stakeRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/social/arguments/feed-1/stake")
  );
  await page.getByRole("button", { name: /^stake$/i }).first().click();
  await stakeRequest;

  await expect(page.getByText(/staked successfully/i)).toBeVisible();
});
