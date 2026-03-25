"use client";

import { ApiError } from "./errors";

const RENDER_API_URL = "https://predai-backend.onrender.com";
const LOCAL_API_URL = "http://localhost:8000";
const AUTH_TOKEN_STORAGE_KEY = "predai.accessToken";
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "20000");
const MARKET_START_DELAY_SECONDS = 60;
const MIN_MARKET_DURATION_SECONDS = 60 * 60;
const MAX_MARKET_DURATION_SECONDS = 30 * 24 * 60 * 60;

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveApiBase(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (process.env.NODE_ENV === "production") {
    return RENDER_API_URL;
  }

  return LOCAL_API_URL;
}

export const API_BASE = resolveApiBase();

type Primitive = string | number | boolean | null | undefined;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: BodyInit | Record<string, unknown> | Primitive[] | null;
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
}

export type WalletChallengeResponse = {
  message: string;
  challenge_token: string;
  expires_at: number;
};

export type WalletVerifyResponse = {
  access_token: string;
  token_type: string;
};

export type UsernameAvailabilityResponse = {
  available: boolean;
  username: string;
};

export type ResolveUsernamesResponse = {
  usernames: Record<string, string>;
};

export type UserProfileResponse = {
  address: string;
  username: string | null;
  created_at: number;
  reputation_score: number;
  is_governance: boolean;
};

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
  yes_pool?: number | null;
  no_pool?: number | null;
};

type BackendAgent = {
  agent_id: string;
  owner: string;
  active: boolean;
  stake: number | string;
  score: number;
  metadata_uri: string;
  pnl?: number | null;
  trades?: number | null;
  created_at?: string | null;
};

type BackendOracle = {
  oracle_id: string;
  address: string;
  active: boolean;
  stake: number | string;
  metadata_uri: string;
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

type BackendVault = {
  vault_id?: string;
  vaultId?: string;
  strategy?: string;
  name?: string;
  total_deposited?: number;
  tvl?: number;
  apy_bps?: number;
  apy?: number;
  risk_score?: number;
  risk?: number;
};

type BackendPosition = {
  vault_id?: string;
  vaultId?: string;
  amount?: number;
  apy_bps?: number;
  apyBps?: number;
  risk_score?: number;
  riskScore?: number;
};

type BackendPortfolio = {
  total_value?: number;
  totalValue?: number;
  positions?: BackendPosition[];
};

type BackendAsset = {
  rwa_id: string;
  token_address: string;
  metadata_uri: string;
  current_supply: number;
};

type AssetMetadata = {
  symbol?: string;
  name?: string;
  chainId?: number;
  price?: number;
};

type PlatformStatsResponse = {
  total_markets: number;
  total_wallets: number;
  total_bets: number;
  total_agents: number;
};

type CreateMarketInput = {
  title: string;
  description?: string;
  endTime: number;
  maxExposure: number;
  marketId?: string;
};

type PlaceBetInput = {
  marketId: string;
  side: "YES" | "NO";
  amount: number;
  txHash: string;
};

type CreateAgentPayload = {
  agentId: string;
  metadataUri: string;
  txHash: string;
};

type StakeAgentPayload = {
  agentId: string;
  amount: string;
  txHash: string;
};

type ToggleAgentPayload = {
  agentId: string;
  txHash: string;
};

type RegisterOraclePayload = {
  oracleId: string;
  metadataUri: string;
  txHash: string;
};

type StakeOraclePayload = {
  amount: string;
  txHash: string;
};

type SubmitOracleOutcomePayload = {
  marketId: string;
  outcome: "YES" | "NO";
  txHash: string;
};

type CreateProposalInput = {
  title: string;
  description: string;
  payload: Record<string, unknown>;
};

type VoteInput = {
  proposalId: string;
  support: "FOR" | "AGAINST";
  weight: number;
};

type StakeArgumentInput = {
  argumentId: string;
  amount: number;
  walletAddress: string;
  txHash?: string;
};

function extractErrorMessage(payload: unknown, depth = 0): string | null {
  if (depth > 4 || payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) {
      return null;
    }

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return extractErrorMessage(JSON.parse(trimmed) as unknown, depth + 1) ?? trimmed;
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractErrorMessage(item, depth + 1);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  if (typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  return (
    extractErrorMessage(record.error, depth + 1) ??
    extractErrorMessage(record.detail, depth + 1) ??
    extractErrorMessage(record.message, depth + 1) ??
    extractErrorMessage(record.code, depth + 1)
  );
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer
  );
}

function buildHeaders(
  optionsHeaders: Record<string, string> | undefined,
  body: ApiRequestOptions["body"],
  auth: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(optionsHeaders ?? {}),
  };

  if (body !== undefined && body !== null && !isBodyInit(body) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = readAccessToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

function buildBody(body: ApiRequestOptions["body"]): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (isBodyInit(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function getErrorCode(response: Response): string {
  return response.status === 401 ? "UNAUTHORIZED" : response.status.toString();
}

export function readAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token?.trim() ? token.trim() : null;
}

export function writeAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = token.trim();
  if (!normalized) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalized);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    headers,
    body,
    auth = true,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache = "no-store",
  } = options;

  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), effectiveTimeoutMs);
  const abortListener = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortListener, { once: true });
    }
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders(headers, body, auth),
      body: buildBody(body),
      signal: controller.signal,
      cache,
    });

    if (!response.ok) {
      let message = "Request failed";

      try {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as unknown;
          message = extractErrorMessage(payload) ?? message;
        } else {
          const text = await response.text();
          message = extractErrorMessage(text) ?? message;
        }
      } catch {
        message = response.statusText || message;
      }

      throw new ApiError(getErrorCode(response), message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ApiError("INVALID_RESPONSE", "Expected a JSON response from the backend");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if ((error as Error)?.name === "AbortError") {
      throw new ApiError(
        "TIMEOUT",
        "The backend took too long to respond. Render may be waking up from a cold start."
      );
    }

    throw new ApiError("NETWORK_ERROR", "Unable to reach the backend");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortListener);
  }
}

function parseTitleDescription(metadataUri: string): { title: string; description: string } {
  try {
    const parsed = JSON.parse(metadataUri) as { title?: string; description?: string };
    return {
      title: parsed.title ?? "Untitled Market",
      description: parsed.description ?? "",
    };
  } catch {
    return {
      title: metadataUri || "Untitled Market",
      description: "",
    };
  }
}

function normalizeAddress(address: string | null | undefined): string {
  return (address ?? "").trim().toLowerCase();
}

function normalizeMarket(item: BackendMarket) {
  const meta = parseTitleDescription(item.metadata_uri);
  const settled = Boolean(item.settled);
  const yesPool = Number(item.yes_pool ?? 0);
  const noPool = Number(item.no_pool ?? 0);
  const totalPool = yesPool + noPool;
  const hasPoolData = Number.isFinite(totalPool) && totalPool > 0;
  const yesOdds = settled ? (item.final_outcome === true ? 1 : 0) : hasPoolData ? yesPool / totalPool : 0.5;

  return {
    marketId: item.market_id,
    address: item.address,
    title: meta.title,
    description: meta.description,
    yesOdds,
    noOdds: 1 - yesOdds,
    yesPool,
    noPool,
    liquidity: Number(item.max_exposure ?? 0),
    endTime: Number(item.end_time ?? 0) * 1000,
    settled,
    creator: item.creator,
  };
}

function weiToTokenAmount(raw: number | string | null | undefined): number {
  try {
    const value = BigInt(String(raw ?? "0"));
    const whole = value / 10n ** 18n;
    const fractional = value % 10n ** 18n;
    const fractional4 = fractional.toString().padStart(18, "0").slice(0, 4);
    const asString = fractional4 === "0000" ? whole.toString() : `${whole.toString()}.${fractional4}`;
    const parsed = Number(asString);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function normalizeAgent(raw: BackendAgent) {
  const createdAt = raw.created_at ? Date.parse(raw.created_at) : Date.now();

  return {
    agentId: raw.agent_id,
    owner: raw.owner,
    active: Boolean(raw.active),
    stake: weiToTokenAmount(raw.stake),
    accuracy: Number(raw.score ?? 0) > 1 ? Number(raw.score) / 100 : Number(raw.score ?? 0),
    pnl: raw.pnl == null ? null : Number(raw.pnl),
    trades: raw.trades == null ? null : Number(raw.trades),
    metadataUri: raw.metadata_uri,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function buildAgentBuckets(all: ReturnType<typeof normalizeAgent>[], walletAddress?: string | null) {
  const wallet = normalizeAddress(walletAddress);
  const mine = wallet ? all.filter((agent) => normalizeAddress(agent.owner) === wallet) : [];
  const mineIds = new Set(mine.map((agent) => agent.agentId));
  const marketplace = all.filter((agent) => agent.active);
  const delegated = all.filter((agent) => !mineIds.has(agent.agentId)).slice(0, 5);

  return {
    all,
    marketplace,
    mine,
    delegated,
  };
}

function normalizeOracle(item: BackendOracle) {
  return {
    oracleId: item.oracle_id,
    address: item.address,
    active: Boolean(item.active),
    stake: weiToTokenAmount(item.stake),
    metadataUri: item.metadata_uri,
  };
}

function inferProposalStatus(raw: BackendProposal): "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED" {
  if (raw.executed) {
    return "EXECUTED";
  }

  const now = Date.now() / 1000;
  if (now < Number(raw.end_block)) {
    return "ACTIVE";
  }

  return Number(raw.for_votes) >= Number(raw.against_votes) ? "PASSED" : "REJECTED";
}

function normalizeProposal(raw: BackendProposal) {
  return {
    proposalId: String(raw.proposal_id),
    title: raw.title,
    description: raw.description,
    status: inferProposalStatus(raw),
    startTime: Number(raw.start_block) * 1000,
    endTime: Number(raw.end_block) * 1000,
    forVotes: Number(raw.for_votes),
    againstVotes: Number(raw.against_votes),
    quorum: Number(raw.quorum),
  };
}

function normalizeVault(raw: BackendVault) {
  return {
    vaultId: raw.vaultId ?? raw.vault_id ?? `vault-${Date.now().toString(36)}`,
    name: raw.name ?? raw.strategy ?? "Yield Vault",
    description: raw.strategy ?? "",
    apy: typeof raw.apy === "number" ? raw.apy : Number(raw.apy_bps ?? 0) / 100,
    tvl: Number(raw.tvl ?? raw.total_deposited ?? 0),
    risk: typeof raw.risk === "number" ? raw.risk : Number(raw.risk_score ?? 0) / 100,
  };
}

function normalizePortfolio(payload: BackendPortfolio) {
  const positions = Array.isArray(payload.positions) ? payload.positions : [];
  const totalValue = Number(payload.totalValue ?? payload.total_value ?? 0);
  const denominator =
    totalValue > 0 ? totalValue : positions.reduce((sum, position) => sum + Number(position.amount ?? 0), 0);

  const allocations = positions.map((position) => {
    const amount = Number(position.amount ?? 0);

    return {
      vaultId: String(position.vaultId ?? position.vault_id ?? "vault"),
      currentWeight: denominator > 0 ? amount / denominator : 0,
      recommendedWeight: denominator > 0 ? amount / denominator : 0,
      expectedApy: Number(position.apyBps ?? position.apy_bps ?? 0) / 100,
      riskScore: Number(position.riskScore ?? position.risk_score ?? 0) / 100,
    };
  });

  const risk = allocations.reduce((sum, allocation) => sum + allocation.currentWeight * allocation.riskScore, 0);

  return {
    totalValue: totalValue || denominator,
    risk,
    allocations: allocations.map(({ riskScore, ...safe }) => ({
      ...safe,
      _riskScore: riskScore,
    })),
  };
}

function readAssetMetadata(metadataUri: string): AssetMetadata {
  try {
    return JSON.parse(metadataUri) as AssetMetadata;
  } catch {
    return {};
  }
}

function normalizeAsset(item: BackendAsset) {
  const metadata = readAssetMetadata(item.metadata_uri);
  const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0");
  const chainIdCandidate = Number(metadata.chainId ?? envChainId);
  const chainId = Number.isInteger(chainIdCandidate) && chainIdCandidate > 0 ? chainIdCandidate : null;
  const priceCandidate = Number(metadata.price);
  const price = Number.isFinite(priceCandidate) && priceCandidate > 0 ? priceCandidate : null;

  return {
    assetId: item.rwa_id,
    symbol: metadata.symbol ?? item.rwa_id.slice(0, 6).toUpperCase(),
    name: metadata.name ?? item.rwa_id,
    chainId,
    supply: Number(item.current_supply ?? 0),
    price,
    metadataUri: item.metadata_uri,
  };
}

function getStoredProfileVotingPower(profile: UserProfileResponse): number {
  const reputation = Number(profile.reputation_score ?? 0);
  const isGovernance = Boolean(profile.is_governance);
  return Math.max(1, reputation * (isGovernance ? 20 : 10));
}

export async function fetchPlatformStats() {
  return apiRequest<PlatformStatsResponse>("/api/stats", { auth: false });
}

export async function requestWalletChallenge(input: {
  address: string;
  chainId?: number;
  origin?: string;
}) {
  return apiRequest<WalletChallengeResponse>("/auth/challenge", {
    method: "POST",
    body: {
      address: input.address,
      chain_id: input.chainId,
      origin: input.origin,
    },
    auth: false,
  });
}

export async function verifyWallet(input: {
  address: string;
  signature: string;
  message: string;
  challengeToken: string;
}) {
  return apiRequest<WalletVerifyResponse>("/auth/verify", {
    method: "POST",
    body: {
      address: input.address,
      signature: input.signature,
      message: input.message,
      challenge_token: input.challengeToken,
    },
    auth: false,
  });
}

export async function resolveUsernames(addresses: string[]) {
  return apiRequest<ResolveUsernamesResponse>("/users/resolve-usernames", {
    method: "POST",
    body: {
      addresses,
    },
    auth: false,
  });
}

export async function checkUsernameAvailability(
  username: string,
  address?: string,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({ username });
  if (address?.trim()) {
    params.set("address", address);
  }

  return apiRequest<UsernameAvailabilityResponse>(`/users/username-availability?${params.toString()}`, {
    auth: false,
    signal,
  });
}

export async function fetchMyProfile() {
  if (!readAccessToken()) {
    return null;
  }

  return apiRequest<UserProfileResponse>("/users/me");
}

export async function updateMyProfile(username: string) {
  return apiRequest<UserProfileResponse>("/users/me", {
    method: "POST",
    body: { username },
  });
}

export async function sendCopilotMessage(input: {
  message: string;
  context?: object;
  signal?: AbortSignal;
}) {
  return apiRequest<{ reply: string }>("/ai/copilot", {
    method: "POST",
    body: {
      message: input.message,
      context: input.context ?? {},
    },
    auth: false,
    signal: input.signal,
  });
}

export async function fetchMarkets() {
  const payload = await apiRequest<BackendMarket[]>("/markets?limit=200&offset=0", { auth: false });
  return payload.map(normalizeMarket).sort((a, b) => b.endTime - a.endTime);
}

export async function createMarket(input: CreateMarketInput) {
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const marketId = String(input.marketId ?? title.toLowerCase().replace(/\s+/g, "-"));
  const endTime = Number(input.endTime ?? Date.now() + 7 * 24 * 60 * 60 * 1000);
  const maxExposure = Math.max(1, Number(input.maxExposure ?? 1000));
  const startTimeSeconds = Math.floor(Date.now() / 1000) + MARKET_START_DELAY_SECONDS;
  const endTimeSeconds = Math.floor((endTime < 1_000_000_000_000 ? endTime * 1000 : endTime) / 1000);
  const marketDurationSeconds = endTimeSeconds - startTimeSeconds;

  if (
    !Number.isFinite(endTimeSeconds) ||
    marketDurationSeconds < MIN_MARKET_DURATION_SECONDS ||
    marketDurationSeconds > MAX_MARKET_DURATION_SECONDS
  ) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Market duration must be between 1 hour and 30 days from now. Adjust end date/time and try again."
    );
  }

  const created = await apiRequest<BackendMarket>("/markets", {
    method: "POST",
    body: {
      market_id: marketId,
      start_time: startTimeSeconds,
      end_time: endTimeSeconds,
      max_exposure: maxExposure,
      metadata_uri: JSON.stringify({ title, description }),
    },
  });

  return {
    market: normalizeMarket(created),
    status: "created" as const,
  };
}

export async function placeBet(input: PlaceBetInput) {
  const accepted = await apiRequest<Record<string, unknown>>(`/markets/${input.marketId}/bet`, {
    method: "POST",
    body: {
      side: input.side,
      amount: input.amount,
      tx_hash: input.txHash,
    },
  });

  return {
    status: "placed" as const,
    marketId: input.marketId,
    side: input.side,
    amount: input.amount,
    txHash: input.txHash,
    accepted,
  };
}

export async function fetchAgents(walletAddress?: string) {
  const payload = await apiRequest<BackendAgent[]>("/agents?limit=200&offset=0", { auth: false });
  const all = payload.map(normalizeAgent).sort((a, b) => b.createdAt - a.createdAt);
  return buildAgentBuckets(all, walletAddress);
}

export async function createAgentRecord(payload: CreateAgentPayload) {
  const created = await apiRequest<BackendAgent>("/agents/register", {
    method: "POST",
    body: {
      agent_id: payload.agentId,
      metadata_uri: payload.metadataUri,
      tx_hash: payload.txHash,
    },
  });

  return {
    agent: normalizeAgent(created),
    status: "created" as const,
  };
}

export async function stakeAgentRecord(payload: StakeAgentPayload) {
  const updated = await apiRequest<BackendAgent>(`/agents/${payload.agentId}/stake`, {
    method: "POST",
    body: {
      amount: payload.amount,
      tx_hash: payload.txHash,
    },
  });

  return {
    agent: normalizeAgent(updated),
    status: "staked" as const,
  };
}

export async function toggleAgentRecord(payload: ToggleAgentPayload) {
  const updated = await apiRequest<BackendAgent>(
    `/agents/${payload.agentId}/deactivate?tx_hash=${encodeURIComponent(payload.txHash)}`,
    {
      method: "POST",
      body: null,
    }
  );

  return {
    agent: normalizeAgent(updated),
    status: "toggled" as const,
  };
}

export async function unstakeAgentRecord(payload: StakeAgentPayload) {
  const updated = await apiRequest<BackendAgent>(`/agents/${payload.agentId}/unstake`, {
    method: "POST",
    body: {
      amount: payload.amount,
      tx_hash: payload.txHash,
    },
  });

  return {
    agent: normalizeAgent(updated),
    status: "unstaked" as const,
  };
}

export async function fetchOracles() {
  const payload = await apiRequest<BackendOracle[]>("/oracles?limit=200&offset=0", { auth: false });
  return payload.map(normalizeOracle);
}

export async function registerOracleRecord(payload: RegisterOraclePayload) {
  const created = await apiRequest<BackendOracle>("/oracles/register", {
    method: "POST",
    body: {
      oracle_id: payload.oracleId,
      metadata_uri: payload.metadataUri,
      tx_hash: payload.txHash,
    },
  });

  return {
    oracle: normalizeOracle(created),
    status: "registered" as const,
  };
}

export async function stakeOracleRecord(payload: StakeOraclePayload) {
  const updated = await apiRequest<BackendOracle>("/oracles/stake", {
    method: "POST",
    body: {
      amount: payload.amount,
      tx_hash: payload.txHash,
    },
  });

  return {
    oracle: normalizeOracle(updated),
    status: "staked" as const,
  };
}

export async function submitOracleOutcome(payload: SubmitOracleOutcomePayload) {
  const accepted = await apiRequest<Record<string, unknown>>("/oracles/submit", {
    method: "POST",
    body: {
      market_id: payload.marketId,
      outcome: payload.outcome === "YES",
      tx_hash: payload.txHash,
    },
  });

  return {
    status: "submitted" as const,
    marketId: payload.marketId,
    outcome: payload.outcome,
    txHash: payload.txHash,
    accepted,
  };
}

export async function fetchOracleStatus(marketId: string) {
  return apiRequest<Record<string, unknown>>(
    `/oracles/status?market_id=${encodeURIComponent(marketId)}`,
    { auth: false }
  );
}

export async function fetchProposals() {
  const payload = await apiRequest<BackendProposal[]>("/governance/proposals?limit=200&offset=0", {
    auth: false,
  });

  return payload.map(normalizeProposal);
}

export async function fetchVotingPower() {
  const profile = await fetchMyProfile();
  if (!profile) {
    return 0;
  }

  return getStoredProfileVotingPower(profile);
}

export async function voteOnProposal(input: VoteInput) {
  return apiRequest<{ status: string }>(`/governance/proposals/${input.proposalId}/vote`, {
    method: "POST",
    body: {
      support: input.support === "FOR",
      weight: input.weight,
    },
  });
}

export async function createGovernanceProposal(input: CreateProposalInput) {
  const created = await apiRequest<BackendProposal>("/governance/proposals", {
    method: "POST",
    body: {
      title: input.title,
      description: input.description,
      action_target: String(input.payload.actionTarget ?? "0x0000000000000000000000000000000000000000"),
      action_data: JSON.stringify(input.payload),
      execution_delay: Number(input.payload.executionDelay ?? 86_400),
    },
  });

  return {
    proposal: normalizeProposal(created),
  };
}

export async function fetchSocialFeeds() {
  const payload = await apiRequest<{ feeds?: Record<string, unknown>[] }>("/social/feeds", { auth: false });
  return Array.isArray(payload.feeds) ? payload.feeds : [];
}

export async function spawnSocialMarket(feedId: string) {
  return apiRequest<Record<string, unknown>>("/social/spawn", {
    method: "POST",
    body: { feedId },
    auth: false,
  });
}

export async function stakeSocialArgument(input: StakeArgumentInput) {
  return apiRequest<Record<string, unknown>>(
    `/social/arguments/${encodeURIComponent(input.argumentId)}/stake`,
    {
      method: "POST",
      body: {
        amount: input.amount,
        wallet_address: input.walletAddress,
        tx_hash: input.txHash,
      },
    }
  );
}

export async function compilePrompt(prompt: string) {
  return apiRequest<Record<string, unknown>>("/social/compile", {
    method: "POST",
    body: { prompt },
    auth: false,
  });
}

export async function fetchYieldVaults() {
  const payload = await apiRequest<BackendVault[] | { vaults?: BackendVault[] }>("/yield/vaults", {
    auth: false,
  });

  if (Array.isArray(payload)) {
    return payload.map(normalizeVault);
  }

  return Array.isArray(payload.vaults) ? payload.vaults.map(normalizeVault) : [];
}

export async function fetchYieldPortfolio() {
  if (!readAccessToken()) {
    return null;
  }

  const payload = await apiRequest<BackendPortfolio>("/yield/portfolio");
  const normalized = normalizePortfolio(payload);

  return {
    totalValue: normalized.totalValue,
    risk: normalized.risk,
    allocations: normalized.allocations.map(({ _riskScore, ...safe }) => safe),
  };
}

export async function rebalanceYieldPortfolio(targetRiskScore = 50) {
  return apiRequest<{ status: string }>("/yield/rebalance", {
    method: "POST",
    body: {
      target_risk_score: Math.max(1, targetRiskScore),
    },
  });
}

export async function fetchArbitrageOpportunities() {
  return apiRequest<Record<string, unknown>[]>("/yield/arbitrage", { auth: false });
}

export async function fetchRwaAssets() {
  const payload = await apiRequest<{ assets?: BackendAsset[] }>("/rwa/assets", { auth: false });
  return Array.isArray(payload.assets) ? payload.assets.map(normalizeAsset) : [];
}

export async function mintRwaAsset(assetId: string, amount: number) {
  return apiRequest<Record<string, unknown>>("/rwa/mint", {
    method: "POST",
    body: {
      asset_id: assetId,
      amount,
    },
  });
}

export async function burnRwaAsset(assetId: string, amount: number) {
  return apiRequest<Record<string, unknown>>("/rwa/burn", {
    method: "POST",
    body: {
      asset_id: assetId,
      amount,
    },
  });
}
