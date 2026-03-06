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
  stake: number | string;
  metadata_uri: string;
};

function weiToTokenAmount(raw: number | string | null | undefined): number {
  try {
    const value = BigInt(String(raw ?? "0"));
    const whole = value / 10n ** 18n;
    const fractional = value % 10n ** 18n;
    const fractional4 = fractional.toString().padStart(18, "0").slice(0, 4);
    const asString =
      fractional4 === "0000"
        ? whole.toString()
        : `${whole.toString()}.${fractional4}`;
    const parsed = Number(asString);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function parseWeiAmount(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^[0-9]+$/.test(normalized)) {
      return null;
    }
    try {
      const wei = BigInt(normalized);
      return wei > 0n ? wei.toString() : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    if (!Number.isInteger(value)) {
      return null;
    }
    try {
      return BigInt(value).toString();
    } catch {
      return null;
    }
  }

  return null;
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
    const amount = parseWeiAmount(payload.amount);
    const txHash = String(payload.txHash ?? "").trim();
    if (!amount || !txHash) {
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
