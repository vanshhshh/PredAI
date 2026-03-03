import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../_utils/backend";

type BackendOracle = {
  oracle_id: string;
  address: string;
  active: boolean;
  stake: number;
  metadata_uri: string;
};

function normalizeOracle(item: BackendOracle) {
  return {
    oracleId: item.oracle_id,
    address: item.address,
    active: Boolean(item.active),
    stake: Number(item.stake ?? 0),
    metadataUri: item.metadata_uri,
  };
}

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/oracles?limit=200&offset=0`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch oracles") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  const rows = Array.isArray(payload) ? (payload as BackendOracle[]) : [];
  return NextResponse.json({ oracles: rows.map(normalizeOracle) });
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

  if (action === "REGISTER_ORACLE") {
    const oracleId = String(payload.oracleId ?? "").trim();
    const metadataUri = String(payload.metadataUri ?? "").trim();
    const txHash = String(payload.txHash ?? "").trim();
    if (!oracleId || !metadataUri || !txHash) {
      return NextResponse.json({ error: "Invalid register payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/oracles/register`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        oracle_id: oracleId,
        metadata_uri: metadataUri,
        tx_hash: txHash,
      }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to register oracle") },
        { status: response.status }
      );
    }

    const created = await safeJson<BackendOracle>(response);
    if (!created) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ oracle: normalizeOracle(created), status: "registered" }, { status: 201 });
  }

  if (action === "STAKE_ORACLE") {
    const amount = Number(payload.amount ?? 0);
    const txHash = String(payload.txHash ?? "").trim();
    if (amount <= 0 || !txHash) {
      return NextResponse.json({ error: "Invalid stake payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/oracles/stake`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        amount,
        tx_hash: txHash,
      }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to stake oracle") },
        { status: response.status }
      );
    }

    const updated = await safeJson<BackendOracle>(response);
    if (!updated) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ oracle: normalizeOracle(updated), status: "staked" });
  }

  if (action === "SUBMIT_OUTCOME") {
    const marketId = String(payload.marketId ?? "").trim();
    const outcome = String(payload.outcome ?? "").trim().toUpperCase();
    const txHash = String(payload.txHash ?? "").trim();
    if (!marketId || !["YES", "NO"].includes(outcome) || !txHash) {
      return NextResponse.json({ error: "Invalid outcome payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/oracles/submit`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        market_id: marketId,
        outcome: outcome === "YES",
        tx_hash: txHash,
      }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to submit oracle outcome") },
        { status: response.status }
      );
    }

    const accepted = await safeJson<Record<string, unknown>>(response);
    return NextResponse.json({
      status: "submitted",
      marketId,
      outcome,
      txHash,
      accepted,
    });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

