import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../_utils/backend";

type BackendAgent = {
  agent_id: string;
  owner: string;
  active: boolean;
  stake: number;
  score: number;
  metadata_uri: string;
  pnl?: number | null;
  trades?: number | null;
  created_at?: string | null;
};

function normalizeAddress(address: string | null | undefined): string {
  return (address ?? "").trim().toLowerCase();
}

function normalizeAgent(raw: BackendAgent) {
  const createdAt = raw.created_at ? Date.parse(raw.created_at) : Date.now();
  return {
    agentId: raw.agent_id,
    owner: raw.owner,
    active: Boolean(raw.active),
    stake: Number(raw.stake ?? 0),
    accuracy: Number(raw.score ?? 0) > 1 ? Number(raw.score) / 100 : Number(raw.score ?? 0),
    pnl: raw.pnl == null ? null : Number(raw.pnl),
    trades: raw.trades == null ? null : Number(raw.trades),
    metadataUri: raw.metadata_uri,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function buildBuckets(all: ReturnType<typeof normalizeAgent>[], walletAddress: string | null) {
  const wallet = normalizeAddress(walletAddress);
  const mine = wallet ? all.filter((agent) => normalizeAddress(agent.owner) === wallet) : [];
  const mineIds = new Set(mine.map((agent) => agent.agentId));
  const marketplace = all.filter((agent) => agent.active);
  const delegated = all.filter((agent) => !mineIds.has(agent.agentId)).slice(0, 5);
  return { all, marketplace, mine, delegated };
}

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/agents?limit=200&offset=0`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch agents") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  const rawAgents = Array.isArray(payload) ? (payload as BackendAgent[]) : [];
  const all = rawAgents.map(normalizeAgent).sort((a, b) => b.createdAt - a.createdAt);

  const wallet = req.nextUrl.searchParams.get("wallet");
  return NextResponse.json(buildBuckets(all, wallet));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : null;
  const payload =
    body.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : body;

  if (action === "CREATE_AGENT") {
    const agentId = String(payload.agentId ?? payload.name ?? "").trim();
    const txHash = String(payload.txHash ?? "").trim();
    const metadataUri = String(payload.metadataUri ?? "").trim();
    if (!agentId || !txHash) {
      return NextResponse.json({ error: "Missing agent id/name or tx hash" }, { status: 400 });
    }
    if (!metadataUri) {
      return NextResponse.json({ error: "Missing metadata URI" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/agents/register`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        agent_id: agentId,
        metadata_uri: metadataUri,
        tx_hash: txHash,
      }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to create agent") },
        { status: response.status }
      );
    }
    const created = await safeJson<BackendAgent>(response);
    if (!created) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ agent: normalizeAgent(created), status: "created" }, { status: 201 });
  }

  if (action === "STAKE_AGENT") {
    const agentId = String(payload.agentId ?? "").trim();
    const amount = Number(payload.amount ?? 0);
    const txHash = String(payload.txHash ?? "").trim();
    if (!agentId || amount <= 0 || !txHash) {
      return NextResponse.json({ error: "Invalid stake payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/agents/${agentId}/stake`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({ amount, tx_hash: txHash }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to stake agent") },
        { status: response.status }
      );
    }
    const updated = await safeJson<BackendAgent>(response);
    if (!updated) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ agent: normalizeAgent(updated), status: "staked" });
  }

  if (action === "TOGGLE_ACTIVE") {
    const agentId = String(payload.agentId ?? "").trim();
    const txHash = String(payload.txHash ?? "").trim();
    if (!agentId || !txHash) {
      return NextResponse.json({ error: "Invalid toggle payload" }, { status: 400 });
    }
    const response = await proxyFetch(
      `${getBackendBaseUrl()}/agents/${agentId}/deactivate?tx_hash=${encodeURIComponent(txHash)}`,
      {
        method: "POST",
        headers: forwardAuthHeaders(req),
      }
    );
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to toggle agent") },
        { status: response.status }
      );
    }
    const updated = await safeJson<BackendAgent>(response);
    if (!updated) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ agent: normalizeAgent(updated), status: "toggled" });
  }

  if (action === "UNSTAKE_AGENT") {
    const agentId = String(payload.agentId ?? "").trim();
    const amount = Number(payload.amount ?? 0);
    const txHash = String(payload.txHash ?? "").trim();
    if (!agentId || amount <= 0 || !txHash) {
      return NextResponse.json({ error: "Invalid unstake payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/agents/${agentId}/unstake`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({ amount, tx_hash: txHash }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to unstake agent") },
        { status: response.status }
      );
    }
    const updated = await safeJson<BackendAgent>(response);
    if (!updated) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ agent: normalizeAgent(updated), status: "unstaked" });
  }

  if (typeof body.agent_id === "string") {
    const response = await proxyFetch(`${getBackendBaseUrl()}/agents/register`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify(body),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to create agent") },
        { status: response.status }
      );
    }
    const created = await safeJson<BackendAgent>(response);
    if (!created) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ agent: normalizeAgent(created), status: "created" }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
