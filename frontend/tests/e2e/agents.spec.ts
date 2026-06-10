import { expect, test } from "@playwright/test";

import {
  TEST_WALLET_ADDRESS,
  authenticateMockUser,
  createMockApiState,
  installMockWallet,
  registerApiMocks,
  seedWalletSession,
} from "./fixtures";

test("marketplace, my agents, and owner controls work with mocked wallet transactions", async ({
  page,
}) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/agents/marketplace");

  await expect(page.getByRole("heading", { name: /agent marketplace/i })).toBeVisible();
  await page.getByLabel(/search by agent id/i).fill("delta");
  await expect(page.getByText(/agent delta-ne/i)).toBeVisible();

  await page.goto("/agents/my-agents");
  await expect(page.getByRole("heading", { name: /my ai agents/i })).toBeVisible();
  await page.getByRole("link", { name: /agent momentum/i }).click();

  await expect(page).toHaveURL(/\/agents\/momentum-alpha$/);
  await expect(page.getByRole("heading", { name: /agent momentum/i })).toBeVisible();

  const deactivateRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/agents/momentum-alpha/deactivate")
  );
  await page.getByRole("button", { name: /^deactivate$/i }).click();
  await deactivateRequest;
  await expect(page.getByRole("button", { name: /already inactive/i })).toBeVisible();

  await page.getByLabel(/amount \(pol\)/i).fill("1");
  const unstakeRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/agents/momentum-alpha/unstake")
  );
  await page.getByRole("button", { name: /^unstake$/i }).click();
  await unstakeRequest;
});

test("connected users can create a new agent", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  state.agents = state.agents.filter((agent) => agent.owner.toLowerCase() !== TEST_WALLET_ADDRESS.toLowerCase());

  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/agents/create");

  await expect(page.getByRole("heading", { name: /create ai agent/i })).toBeVisible();
  await page.getByLabel(/agent name/i).fill("Signal Pilot");
  await page.getByLabel(/max exposure/i).fill("2200");
  await page.getByRole("button", { name: /launch agent/i }).click();

  await expect(page.getByRole("dialog", { name: /confirm agent creation/i })).toBeVisible();
  await page.getByRole("button", { name: /^confirm$/i }).click();

  await expect(page).toHaveURL(/\/agents\/my-agents$/);
  await expect(page.getByRole("heading", { name: /my ai agents/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /agent signal-p/i })).toBeVisible();
});
