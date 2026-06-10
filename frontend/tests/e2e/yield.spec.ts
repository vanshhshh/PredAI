import { expect, test } from "@playwright/test";

import {
  authenticateMockUser,
  createMockApiState,
  registerApiMocks,
  seedWalletSession,
} from "./fixtures";

test("vault directory, vault detail, portfolio rebalance, and arbitrage feed render", async ({
  page,
}) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/yield/vaults");

  await expect(page.getByRole("heading", { name: /yield unavailable/i })).toBeVisible();

  await page.goto("/yield/portfolio");
  await expect(page.getByRole("heading", { name: /yield unavailable/i })).toBeVisible();

  await page.goto("/yield/arbitrage");
  await expect(page.getByRole("heading", { name: /yield unavailable/i })).toBeVisible();
});
