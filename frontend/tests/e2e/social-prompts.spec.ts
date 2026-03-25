import { test, expect } from "@playwright/test";

test("prompt compiler renders compiled spec and deploys", async ({ page }) => {
  await page.route("**/social/compile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Will ETH staking exceed 6% by Q3 2026?",
        description: "ETH staking APR target",
        resolution_criteria: "Check staking APR at end date.",
        category: "Crypto",
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        initial_odds: { yes: 0.55, no: 0.45 },
        confidence: 0.78,
      }),
    });
  });

  await page.route("**/markets", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          market_id: "eth-staking-2026",
          address: "0x0000000000000000000000000000000000000001",
          creator: "0xcreator",
          start_time: Math.floor(Date.now() / 1000),
          end_time: Math.floor((Date.now() + 86_400_000) / 1000),
          max_exposure: 10000,
          metadata_uri: JSON.stringify({
            title: "Will ETH staking exceed 6% by Q3 2026?",
            description: "ETH staking APR target",
          }),
          settled: false,
          final_outcome: null,
          yes_pool: 0,
          no_pool: 0,
        }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/social/prompts");

  await page.getByLabel("Natural-language Prompt").fill("Will ETH staking exceed 6% by Q3 2026?");
  await page.getByRole("button", { name: /compile prompt/i }).click();

  await expect(page.getByText(/^compiled market spec$/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /will eth staking exceed 6%/i })
  ).toBeVisible();
  await expect(page.getByText(/resolution criteria/i)).toBeVisible();

  await page.getByRole("button", { name: /deploy to testnet/i }).click();

  await expect(page).toHaveURL(/\/markets\/eth-staking-2026/);
});
