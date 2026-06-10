import { expect, test } from "@playwright/test";

import {
  authenticateMockUser,
  createMockApiState,
  installMockWallet,
  registerApiMocks,
  seedWalletSession,
} from "./fixtures";

test("proposal list, history, and voting flow render correctly", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/governance/proposals");

  await expect(page.getByRole("heading", { name: /protocol governance/i })).toBeVisible();
  await expect(page.getByText(/adjust max market duration/i)).toBeVisible();

  await page.getByRole("link", { name: /open proposal adjust max market duration/i }).click();

  await expect(page).toHaveURL(/\/governance\/proposals\/1$/);
  await expect(page.getByRole("heading", { name: /adjust max market duration/i })).toBeVisible();

  const voteRequest = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/governance/proposals/1/vote")
  );
  await page.getByRole("button", { name: /submit vote/i }).click();
  await voteRequest;

  await expect(page.getByText("1,300")).toBeVisible();

  await page.goto("/governance/history");
  await expect(page.getByRole("heading", { name: /proposal history/i })).toBeVisible();
  await expect(page.getByText(/publish treasury risk reports/i)).toBeVisible();
});

test("connected users can create a governance proposal", async ({ page }) => {
  const state = createMockApiState();
  authenticateMockUser(state);
  await installMockWallet(page);
  await seedWalletSession(page);
  await registerApiMocks(page, state);

  await page.goto("/governance/create");

  await expect(page.getByRole("heading", { name: /submit proposal/i })).toBeVisible();
  await page.getByRole("button", { name: /upgrade/i }).click();
  await page.getByLabel(/proposal title/i).fill("Add launch checklist");
  await page.getByLabel(/description/i).fill("Require reviews before enabling new actions.");
  await page.getByLabel(/^target$/i).fill("0x0000000000000000000000000000000000000003");
  await page.getByLabel(/calldata/i).fill("0x");
  await page.getByRole("button", { name: /submit proposal/i }).click();

  await expect(page.getByRole("dialog", { name: /confirm governance proposal/i })).toBeVisible();
  await page.getByRole("button", { name: /^confirm$/i }).click();

  await expect(page).toHaveURL(/\/governance\/proposals\/3$/);
  await expect(page.getByRole("heading", { name: /add launch checklist/i })).toBeVisible();
});
