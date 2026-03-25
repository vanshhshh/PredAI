import { test, expect } from "@playwright/test";

test("landing page renders live stats", async ({ page }) => {
  await page.route("**/api/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total_markets: 12,
        total_wallets: 34,
        total_bets: 56,
        total_agents: 7,
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByText("Markets Created")).toBeVisible();
  await expect(page.getByText("Wallets Connected")).toBeVisible();
  await expect(page.getByText("Bets Placed")).toBeVisible();
  await expect(page.getByText("Active Agents")).toBeVisible();

  await expect(page.getByText("12")).toBeVisible();
  await expect(page.getByText("34")).toBeVisible();
  await expect(page.getByText("56")).toBeVisible();
  await expect(page.getByText("7")).toBeVisible();
});
