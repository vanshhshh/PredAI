import { Page, Request, Route } from "@playwright/test";

export const TEST_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";
const OTHER_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";
const GOVERNANCE_WALLET_ADDRESS = "0x3333333333333333333333333333333333333333";
const API_HOSTS = new Set(["localhost:8000", "127.0.0.1:8000", "api.moltmarket.com"]);
const DEFAULT_CHAIN_ID_HEX = "0x89";
const DEFAULT_SIGNATURE = `0x${"1".repeat(130)}`;

type BackendMarket = {
  market_id: string;
  address: string;
  creator: string;
  start_time: number;
  end_time: number;
  max_exposure: number;
  metadata_uri: string;
  settled: boolean;
  final_outcome: boolean | null;
  yes_pool: number;
  no_pool: number;
};

type BackendAgent = {
  agent_id: string;
  owner: string;
  active: boolean;
  stake: string;
  score: number;
  metadata_uri: string;
  pnl: number | null;
  trades: number | null;
  created_at: string;
};

type BackendProposal = {
  proposal_id: number;
  title: string;
  description: string;
  start_block: number;
  end_block: number;
  for_votes: number;
  against_votes: number;
  executed: boolean;
  quorum: number;
};

type SocialFeed = {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore: number;
  marketEligible: boolean;
};

type BackendVault = {
  vault_id: string;
  name: string;
  strategy: string;
  total_deposited: number;
  apy_bps: number;
  risk_score: number;
};

type BackendPortfolio = {
  total_value: number;
  positions: Array<{
    vault_id: string;
    amount: number;
    apy_bps: number;
    risk_score: number;
  }>;
};

type OracleStatus = {
  phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
  confidence: number;
  quorumReached: boolean;
  submissions: Array<{
    oracleId: string;
    outcome: "YES" | "NO";
    weight: number;
  }>;
  resolvedAt?: number;
  finalOutcome?: "YES" | "NO";
};

type UserProfile = {
  address: string;
  username: string | null;
  created_at: number;
  reputation_score: number;
  is_governance: boolean;
};

export type MockApiState = {
  profile: UserProfile;
  usernames: Record<string, string>;
  markets: BackendMarket[];
  agents: BackendAgent[];
  proposals: BackendProposal[];
  feeds: SocialFeed[];
  vaults: BackendVault[];
  portfolio: BackendPortfolio;
  arbitrage: Array<{
    opportunityId: string;
    route: string[];
    spread: number;
    confidence: number;
    status: "ACTIVE" | "EXECUTED" | "EXPIRED";
    detectedAt: number;
  }>;
  oracleStatusByMarket: Record<string, OracleStatus>;
};

export function createMockApiState(): MockApiState {
  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);

  return {
    profile: {
      address: TEST_WALLET_ADDRESS.toLowerCase(),
      username: null,
      created_at: nowSeconds - 86_400,
      reputation_score: 12,
      is_governance: true,
    },
    usernames: {
      [OTHER_WALLET_ADDRESS.toLowerCase()]: "macrodesk",
      [GOVERNANCE_WALLET_ADDRESS.toLowerCase()]: "treasuryops",
    },
    markets: [
      {
        market_id: "btc-2026",
        address: "0x0000000000000000000000000000000000001001",
        creator: GOVERNANCE_WALLET_ADDRESS,
        start_time: nowSeconds - 7_200,
        end_time: nowSeconds + 7 * 24 * 60 * 60,
        max_exposure: 500_000,
        metadata_uri: JSON.stringify({
          title: "Will BTC trade above $150k before December 2026?",
          description: "Market used for end-to-end validation.",
        }),
        settled: false,
        final_outcome: null,
        yes_pool: 1_240,
        no_pool: 860,
      },
      {
        market_id: "eth-etf-2026",
        address: "0x0000000000000000000000000000000000001002",
        creator: OTHER_WALLET_ADDRESS,
        start_time: nowSeconds - 12_000,
        end_time: nowSeconds + 5 * 24 * 60 * 60,
        max_exposure: 300_000,
        metadata_uri: JSON.stringify({
          title: "Will spot ETH ETF inflows exceed $5B in 2026?",
          description: "Institutional adoption market.",
        }),
        settled: false,
        final_outcome: null,
        yes_pool: 780,
        no_pool: 920,
      },
    ],
    agents: [
      {
        agent_id: "momentum-alpha",
        owner: TEST_WALLET_ADDRESS,
        active: true,
        stake: "2500000000000000000",
        score: 82,
        metadata_uri: toDataUri({
          name: "Momentum Alpha",
          description: "Trend-following strategy agent.",
        }),
        pnl: 1250.5,
        trades: 18,
        created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        agent_id: "delta-neutral",
        owner: OTHER_WALLET_ADDRESS,
        active: true,
        stake: "1800000000000000000",
        score: 77,
        metadata_uri: toDataUri({
          name: "Delta Neutral",
          description: "Market-neutral carry agent.",
        }),
        pnl: 842.25,
        trades: 31,
        created_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    proposals: [
      {
        proposal_id: 1,
        title: "Adjust max market duration",
        description: "Reduce long-tail market expiry for faster settlement.",
        start_block: nowSeconds - 3_600,
        end_block: nowSeconds + 86_400,
        for_votes: 1_200,
        against_votes: 240,
        executed: false,
        quorum: 2_000,
      },
      {
        proposal_id: 2,
        title: "Publish treasury risk reports",
        description: "Add monthly disclosure cadence for treasury movements.",
        start_block: nowSeconds - 10 * 24 * 60 * 60,
        end_block: nowSeconds - 7 * 24 * 60 * 60,
        for_votes: 2_800,
        against_votes: 350,
        executed: true,
        quorum: 2_000,
      },
    ],
    feeds: [
      {
        id: "feed-1",
        source: "X",
        author: "@macroalpha",
        content: "BTC volatility is compressing into a breakout zone for late 2026.",
        timestamp: now - 30 * 60 * 1000,
        signalScore: 0.82,
        marketEligible: true,
      },
      {
        id: "feed-2",
        source: "FARCASTER",
        author: "staker.syndicate",
        content: "ETH staking APR could clear 6% again if issuance tightens.",
        timestamp: now - 55 * 60 * 1000,
        signalScore: 0.67,
        marketEligible: true,
      },
    ],
    vaults: [
      {
        vault_id: "stable-core",
        name: "Stable Core",
        strategy: "Low-volatility stablecoin routing",
        total_deposited: 320_000,
        apy_bps: 620,
        risk_score: 18,
      },
      {
        vault_id: "eth-beta",
        name: "ETH Beta",
        strategy: "Higher-beta ETH yield rotation",
        total_deposited: 180_000,
        apy_bps: 1450,
        risk_score: 46,
      },
    ],
    portfolio: {
      total_value: 120_000,
      positions: [
        {
          vault_id: "stable-core",
          amount: 70_000,
          apy_bps: 620,
          risk_score: 18,
        },
        {
          vault_id: "eth-beta",
          amount: 50_000,
          apy_bps: 1450,
          risk_score: 46,
        },
      ],
    },
    arbitrage: [
      {
        opportunityId: "arb-1",
        route: ["BTC/USDC", "Perp hedge", "Basis unwind"],
        spread: 2.4,
        confidence: 0.82,
        status: "ACTIVE",
        detectedAt: now - 10 * 60 * 1000,
      },
      {
        opportunityId: "arb-2",
        route: ["ETH spot", "Staking derivative", "Funding carry"],
        spread: 1.7,
        confidence: 0.68,
        status: "EXECUTED",
        detectedAt: now - 40 * 60 * 1000,
      },
    ],
    oracleStatusByMarket: {
      "btc-2026": {
        phase: "FINALIZING",
        confidence: 0.78,
        quorumReached: true,
        submissions: [
          { oracleId: "oracle-a", outcome: "YES", weight: 0.42 },
          { oracleId: "oracle-b", outcome: "YES", weight: 0.31 },
          { oracleId: "oracle-c", outcome: "NO", weight: 0.27 },
        ],
      },
      "eth-etf-2026": {
        phase: "COLLECTING",
        confidence: 0.61,
        quorumReached: false,
        submissions: [{ oracleId: "oracle-a", outcome: "YES", weight: 0.4 }],
      },
    },
  };
}

export function authenticateMockUser(state: MockApiState, username = "tester"): void {
  state.profile.username = username;
  state.usernames[TEST_WALLET_ADDRESS.toLowerCase()] = username;
}

export async function installMockWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ address, chainIdHex, signature }) => {
      const zeroHash = `0x${"0".repeat(64)}`;
      const blockHash = `0x${"a".repeat(64)}`;
      let currentChainId = chainIdHex;
      let nonce = 1;
      const transactions: Record<string, Record<string, unknown>> = {};
      const receipts: Record<string, Record<string, unknown>> = {};

      function nextHash() {
        const value = `0x${nonce.toString(16).padStart(64, "0")}`;
        nonce += 1;
        return value;
      }

      function buildBlock() {
        return {
          baseFeePerGas: "0x3b9aca00",
          difficulty: "0x0",
          extraData: "0x",
          gasLimit: "0x1c9c380",
          gasUsed: "0x5208",
          hash: blockHash,
          logsBloom: `0x${"0".repeat(512)}`,
          miner: address,
          mixHash: zeroHash,
          nonce: "0x0000000000000000",
          number: "0x1",
          parentHash: zeroHash,
          receiptsRoot: zeroHash,
          sha3Uncles: zeroHash,
          size: "0x1",
          stateRoot: zeroHash,
          timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
          totalDifficulty: "0x0",
          transactions: [],
          transactionsRoot: zeroHash,
          uncles: [],
        };
      }

      function createTransaction(tx: Record<string, unknown> | undefined) {
        const hash = nextHash();
        transactions[hash] = {
          accessList: [],
          blockHash,
          blockNumber: "0x1",
          chainId: currentChainId,
          from: address,
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          hash,
          input: tx?.data ?? "0x",
          maxFeePerGas: "0x3b9aca00",
          maxPriorityFeePerGas: "0x3b9aca00",
          nonce: "0x1",
          r: `0x${"1".repeat(64)}`,
          s: `0x${"2".repeat(64)}`,
          to: tx?.to ?? address,
          transactionIndex: "0x0",
          type: "0x2",
          v: "0x1",
          value: tx?.value ?? "0x0",
        };
        receipts[hash] = {
          blockHash,
          blockNumber: "0x1",
          contractAddress: null,
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          from: address,
          gasUsed: "0x5208",
          logs: [],
          logsBloom: `0x${"0".repeat(512)}`,
          status: "0x1",
          to: tx?.to ?? address,
          transactionHash: hash,
          transactionIndex: "0x0",
          type: "0x2",
        };
        return hash;
      }

      function buildProvider(flags: { isMetaMask?: boolean; isPhantom?: boolean }) {
        return {
          ...flags,
          async request({
            method,
            params,
          }: {
            method: string;
            params?: Array<Record<string, unknown>> | Record<string, unknown>;
          }) {
            switch (method) {
              case "eth_accounts":
              case "eth_requestAccounts":
                return [address];
              case "eth_chainId":
                return currentChainId;
              case "personal_sign":
                return signature;
              case "wallet_switchEthereumChain":
                currentChainId = String((params as Array<{ chainId: string }> | undefined)?.[0]?.chainId ?? currentChainId);
                return null;
              case "wallet_addEthereumChain":
                return null;
              case "eth_blockNumber":
                return "0x1";
              case "eth_estimateGas":
                return "0x5208";
              case "eth_gasPrice":
              case "eth_maxPriorityFeePerGas":
                return "0x3b9aca00";
              case "eth_getBalance":
                return "0x3635c9adc5dea00000";
              case "eth_getCode":
                return "0x";
              case "eth_getTransactionCount":
                return "0x1";
              case "eth_feeHistory":
                return {
                  baseFeePerGas: ["0x3b9aca00"],
                  gasUsedRatio: [0.5],
                  oldestBlock: "0x1",
                  reward: [["0x3b9aca00"]],
                };
              case "eth_getBlockByNumber":
              case "eth_getBlockByHash":
                return buildBlock();
              case "eth_sendTransaction": {
                const tx = Array.isArray(params) ? params[0] : undefined;
                return createTransaction(tx);
              }
              case "eth_getTransactionByHash":
                return transactions[String((params as Array<string> | undefined)?.[0])] ?? null;
              case "eth_getTransactionReceipt":
                return receipts[String((params as Array<string> | undefined)?.[0])] ?? null;
              case "net_version":
                return String(parseInt(currentChainId, 16));
              default:
                return null;
            }
          },
        };
      }

      const metaMask = buildProvider({ isMetaMask: true });
      const phantom = buildProvider({ isPhantom: true });

      (window as Window & { ethereum?: unknown; phantom?: unknown }).ethereum = {
        isMetaMask: true,
        providers: [metaMask, phantom],
        request: (args: { method: string; params?: unknown }) =>
          (metaMask as { request: (args: { method: string; params?: unknown }) => Promise<unknown> }).request(args),
      };

      (window as Window & { phantom?: { ethereum?: unknown } }).phantom = {
        ethereum: phantom,
      };
    },
    {
      address: TEST_WALLET_ADDRESS,
      chainIdHex: DEFAULT_CHAIN_ID_HEX,
      signature: DEFAULT_SIGNATURE,
    }
  );
}

export async function seedWalletSession(page: Page, username = "tester"): Promise<void> {
  await page.addInitScript(
    ({ address, token, savedUsername }) => {
      window.localStorage.setItem(
        "predai.identity",
        JSON.stringify({
          address,
          walletProvider: "metamask",
          username: savedUsername,
        })
      );
      window.localStorage.setItem("predai.accessToken", token);
    },
    {
      address: TEST_WALLET_ADDRESS.toLowerCase(),
      token: "e2e-token",
      savedUsername: username,
    }
  );
}

export async function registerApiMocks(page: Page, state: MockApiState): Promise<void> {
  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = normalizePath(url.pathname);

    if (pathname === "/api/stats" && method === "GET") {
      await fulfillJson(route, {
        total_markets: state.markets.length,
        total_wallets: 42,
        total_bets: 184,
        total_agents: state.agents.filter((agent) => agent.active).length,
      });
      return;
    }

    if (pathname === "/auth/challenge" && method === "POST") {
      await fulfillJson(route, {
        message: "Sign this message to continue with MoltMarket.",
        challenge_token: "challenge-123",
        expires_at: Math.floor(Date.now() / 1000) + 600,
      });
      return;
    }

    if (pathname === "/auth/verify" && method === "POST") {
      await fulfillJson(route, {
        access_token: "e2e-token",
        token_type: "bearer",
      });
      return;
    }

    if (pathname === "/users/resolve-usernames" && method === "POST") {
      const body = readJson(route.request()) as { addresses?: string[] };
      const response: Record<string, string> = {};
      for (const address of body.addresses ?? []) {
        const normalized = address.toLowerCase();
        if (state.usernames[normalized]) {
          response[normalized] = state.usernames[normalized];
        }
      }
      await fulfillJson(route, { usernames: response });
      return;
    }

    if (pathname === "/users/username-availability" && method === "GET") {
      const username = String(url.searchParams.get("username") ?? "").toLowerCase();
      const available = username.length > 0 && !Object.values(state.usernames).includes(username);
      await fulfillJson(route, { available, username });
      return;
    }

    if (pathname === "/users/me" && method === "GET") {
      await fulfillJson(route, state.profile);
      return;
    }

    if (pathname === "/users/me" && method === "POST") {
      const body = readJson(route.request()) as { username?: string };
      const username = String(body.username ?? "").trim().toLowerCase();
      state.profile.username = username || null;
      if (username) {
        state.usernames[state.profile.address] = username;
      }
      await fulfillJson(route, state.profile);
      return;
    }

    if (pathname === "/markets" && method === "GET") {
      await fulfillJson(route, state.markets);
      return;
    }

    if (pathname === "/markets" && method === "POST") {
      const body = readJson(route.request()) as {
        market_id?: string;
        start_time?: number;
        end_time?: number;
        max_exposure?: number;
        metadata_uri?: string;
      };
      const marketId = String(body.market_id ?? `market-${Date.now()}`);
      const created: BackendMarket = {
        market_id: marketId,
        address: `0x${marketId.replace(/[^a-f0-9]/gi, "1").padEnd(40, "1").slice(0, 40)}`,
        creator: state.profile.address,
        start_time: Number(body.start_time ?? Math.floor(Date.now() / 1000)),
        end_time: Number(body.end_time ?? Math.floor(Date.now() / 1000) + 86_400),
        max_exposure: Number(body.max_exposure ?? 10_000),
        metadata_uri: String(body.metadata_uri ?? JSON.stringify({ title: marketId, description: "" })),
        settled: false,
        final_outcome: null,
        yes_pool: 120,
        no_pool: 80,
      };
      state.markets.unshift(created);
      state.oracleStatusByMarket[marketId] = {
        phase: "COLLECTING",
        confidence: 0.55,
        quorumReached: false,
        submissions: [],
      };
      await fulfillJson(route, created, 201);
      return;
    }

    const marketBetMatch = pathname.match(/^\/markets\/([^/]+)\/bet$/);
    if (marketBetMatch && method === "POST") {
      const marketId = decodeURIComponent(marketBetMatch[1] ?? "");
      const body = readJson(route.request()) as { side?: "YES" | "NO"; amount?: number };
      const market = state.markets.find((item) => item.market_id === marketId);
      if (market) {
        const amount = Number(body.amount ?? 0);
        if (String(body.side).toUpperCase() === "YES") {
          market.yes_pool += amount;
        } else {
          market.no_pool += amount;
        }
      }
      await fulfillJson(route, { status: "placed" });
      return;
    }

    if (pathname === "/agents" && method === "GET") {
      await fulfillJson(route, state.agents);
      return;
    }

    if (pathname === "/agents/register" && method === "POST") {
      const body = readJson(route.request()) as { agent_id?: string; metadata_uri?: string };
      const agent: BackendAgent = {
        agent_id: String(body.agent_id ?? `agent-${Date.now()}`),
        owner: state.profile.address,
        active: false,
        stake: "0",
        score: 70,
        metadata_uri: String(body.metadata_uri ?? ""),
        pnl: null,
        trades: 0,
        created_at: new Date().toISOString(),
      };
      state.agents.unshift(agent);
      await fulfillJson(route, agent);
      return;
    }

    const agentStakeMatch = pathname.match(/^\/agents\/([^/]+)\/stake$/);
    if (agentStakeMatch && method === "POST") {
      const agentId = decodeURIComponent(agentStakeMatch[1] ?? "");
      const body = readJson(route.request()) as { amount?: string };
      const agent = state.agents.find((item) => item.agent_id === agentId);
      if (agent) {
        agent.active = true;
        agent.stake = String(BigInt(agent.stake) + BigInt(String(body.amount ?? "0")));
      }
      await fulfillJson(route, agent ?? {});
      return;
    }

    const agentUnstakeMatch = pathname.match(/^\/agents\/([^/]+)\/unstake$/);
    if (agentUnstakeMatch && method === "POST") {
      const agentId = decodeURIComponent(agentUnstakeMatch[1] ?? "");
      const body = readJson(route.request()) as { amount?: string };
      const agent = state.agents.find((item) => item.agent_id === agentId);
      if (agent) {
        const nextStake = BigInt(agent.stake) - BigInt(String(body.amount ?? "0"));
        agent.stake = nextStake > 0n ? nextStake.toString() : "0";
      }
      await fulfillJson(route, agent ?? {});
      return;
    }

    const agentDeactivateMatch = pathname.match(/^\/agents\/([^/]+)\/deactivate$/);
    if (agentDeactivateMatch && method === "POST") {
      const agentId = decodeURIComponent(agentDeactivateMatch[1] ?? "");
      const agent = state.agents.find((item) => item.agent_id === agentId);
      if (agent) {
        agent.active = false;
      }
      await fulfillJson(route, agent ?? {});
      return;
    }

    if (pathname === "/governance/proposals" && method === "GET") {
      await fulfillJson(route, state.proposals);
      return;
    }

    if (pathname === "/governance/proposals" && method === "POST") {
      const body = readJson(route.request()) as { title?: string; description?: string };
      const proposal: BackendProposal = {
        proposal_id: Math.max(...state.proposals.map((item) => item.proposal_id), 0) + 1,
        title: String(body.title ?? "Untitled proposal"),
        description: String(body.description ?? ""),
        start_block: Math.floor(Date.now() / 1000),
        end_block: Math.floor(Date.now() / 1000) + 86_400,
        for_votes: 0,
        against_votes: 0,
        executed: false,
        quorum: 2_000,
      };
      state.proposals.unshift(proposal);
      await fulfillJson(route, proposal);
      return;
    }

    const voteMatch = pathname.match(/^\/governance\/proposals\/([^/]+)\/vote$/);
    if (voteMatch && method === "POST") {
      const proposalId = Number(voteMatch[1]);
      const body = readJson(route.request()) as { support?: boolean; weight?: number };
      const proposal = state.proposals.find((item) => item.proposal_id === proposalId);
      if (proposal) {
        const weight = Number(body.weight ?? 100);
        if (body.support) {
          proposal.for_votes += weight;
        } else {
          proposal.against_votes += weight;
        }
      }
      await fulfillJson(route, { status: "submitted" });
      return;
    }

    if (pathname === "/social/feeds" && method === "GET") {
      await fulfillJson(route, { feeds: state.feeds });
      return;
    }

    if (pathname === "/social/spawn" && method === "POST") {
      const body = readJson(route.request()) as { feedId?: string };
      const feed = state.feeds.find((item) => item.id === body.feedId);
      if (feed) {
        const marketId = slugify(feed.content.slice(0, 36));
        state.markets.unshift({
          market_id: marketId,
          address: `0x${marketId.replace(/[^a-f0-9]/gi, "2").padEnd(40, "2").slice(0, 40)}`,
          creator: state.profile.address,
          start_time: Math.floor(Date.now() / 1000),
          end_time: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          max_exposure: 25_000,
          metadata_uri: JSON.stringify({
            title: `Spawned: ${feed.content.slice(0, 40)}`,
            description: feed.content,
          }),
          settled: false,
          final_outcome: null,
          yes_pool: 90,
          no_pool: 60,
        });
      }
      await fulfillJson(route, { status: "spawned" });
      return;
    }

    if (pathname === "/social/compile" && method === "POST") {
      const body = readJson(route.request()) as { prompt?: string };
      const prompt = String(body.prompt ?? "").trim();
      await fulfillJson(route, {
        title: prompt || "Compiled Market",
        description: "Structured market draft generated from the supplied prompt.",
        resolution_criteria: "Resolve YES if the stated condition is true by the end date.",
        category: "Crypto",
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        initial_odds: { yes: 0.58, no: 0.42 },
        confidence: 0.79,
      });
      return;
    }

    const socialStakeMatch = pathname.match(/^\/social\/arguments\/([^/]+)\/stake$/);
    if (socialStakeMatch && method === "POST") {
      await fulfillJson(route, { status: "staked" });
      return;
    }

    if (pathname === "/yield/vaults" && method === "GET") {
      await fulfillJson(route, { vaults: state.vaults });
      return;
    }

    if (pathname === "/yield/portfolio" && method === "GET") {
      await fulfillJson(route, state.portfolio);
      return;
    }

    if (pathname === "/yield/rebalance" && method === "POST") {
      state.portfolio.positions = [
        {
          vault_id: "stable-core",
          amount: 60_000,
          apy_bps: 620,
          risk_score: 18,
        },
        {
          vault_id: "eth-beta",
          amount: 60_000,
          apy_bps: 1450,
          risk_score: 46,
        },
      ];
      await fulfillJson(route, { status: "rebalanced" });
      return;
    }

    if (pathname === "/yield/arbitrage" && method === "GET") {
      await fulfillJson(route, state.arbitrage);
      return;
    }

    if (pathname === "/oracles/status" && method === "GET") {
      const marketId = String(url.searchParams.get("market_id") ?? "");
      await fulfillJson(
        route,
        state.oracleStatusByMarket[marketId] ?? {
          phase: "COLLECTING",
          confidence: 0.5,
          quorumReached: false,
          submissions: [],
        }
      );
      return;
    }

    await fulfillJson(route, { error: "Route not found", path: pathname }, 404);
  };

  for (const host of API_HOSTS) {
    await page.route(`http://${host}/**`, handler);
    await page.route(`https://${host}/**`, handler);
  }
}

export function toDateTimeLocal(value: number): string {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Date.now()}`
  );
}

function readJson(request: Request): Record<string, unknown> {
  const payload = request.postData();
  if (!payload) return {};
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function toDataUri(payload: Record<string, unknown>): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(payload), "utf8").toString("base64")}`;
}
