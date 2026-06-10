import { defineConfig } from "@playwright/test";

const PORT = 3101;
const HOST = "127.0.0.1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run start -- --hostname ${HOST} --port ${PORT}`,
    cwd: process.cwd(),
    env: {
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "0123456789abcdef0123456789abcdef",
      NEXT_PUBLIC_API_URL: "http://localhost:8000",
      NEXT_PUBLIC_CHAIN_ID: "137",
      NEXT_PUBLIC_RPC_URL: "https://polygon-rpc.com",
      NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: "0x1379459f7345B10E5Ec2d25708375790DB241f4A",
      NEXT_PUBLIC_MARKET_FACTORY_ADDRESS: "0x0000000000000000000000000000000000000001",
      NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000002",
      NEXT_PUBLIC_GOVERNANCE_DAO_ADDRESS: "0x0000000000000000000000000000000000000003",
      NEXT_PUBLIC_MARKET_CREATION_BOND_UNITS: "0",
      NEXT_PUBLIC_ENABLE_YIELD: "false",
      NEXT_PUBLIC_ENABLE_RWA: "false",
    },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
