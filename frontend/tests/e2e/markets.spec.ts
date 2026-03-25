import { test, expect } from "@playwright/test";

test("markets list renders with backend data", async ({ page }) => {
  await page.route("**/markets?limit=200&offset=0**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          market_id: "btc-2026",
          address: "0x0000000000000000000000000000000000000001",
          creator: "0xcreator",
          start_time: Math.floor(Date.now() / 1000),
          end_time: Math.floor((Date.now() + 86_400_000) / 1000),
          max_exposure: 1000,
          metadata_uri: JSON.stringify({
            title: "Will BTC hit 150k by 2026?",
            description: "Sample market",
          }),
          settled: false,
          final_outcome: null,
          yes_pool: 100,
          no_pool: 50,
        },
      ]),
    });
  });

  await page.goto("/markets/list");

  await expect(page.getByText(/will btc hit 150k/i)).toBeVisible();
  await expect(page.getByText(/sample market/i)).toBeVisible();
});
