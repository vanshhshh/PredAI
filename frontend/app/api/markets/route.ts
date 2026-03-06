import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../_utils/backend";

const MARKET_START_DELAY_SECONDS = 60;
const MIN_MARKET_DURATION_SECONDS = 60 * 60; // 1 hour
const MAX_MARKET_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

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

function normalizeMarket(item: BackendMarket) {
  const meta = parseTitleDescription(item.metadata_uri);
  const settled = Boolean(item.settled);
  const yesPool = Number(item.yes_pool ?? 0);
  const noPool = Number(item.no_pool ?? 0);
  const totalPool = yesPool + noPool;
  const hasPoolData = Number.isFinite(totalPool) && totalPool > 0;
  const yesOdds = settled
    ? item.final_outcome === true
      ? 1
      : 0
    : hasPoolData
      ? yesPool / totalPool
      : 0.5;
  return {
    marketId: item.market_id,
    address: item.address,
    title: meta.title,
    description: meta.description,
    yesOdds,
    noOdds: yesOdds === null ? null : 1 - yesOdds,
    liquidity: Number(item.max_exposure ?? 0),
    endTime: Number(item.end_time ?? 0) * 1000,
    settled,
    creator: item.creator,
  };
}

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/markets?limit=200&offset=0`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch markets") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  const rawMarkets = Array.isArray(payload) ? (payload as BackendMarket[]) : [];

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? "0"));
  const limit = Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "25"));
  const query = (req.nextUrl.searchParams.get("query") ?? "").toLowerCase();

  const normalized = rawMarkets
    .map(normalizeMarket)
    .filter((market) => market.title.toLowerCase().includes(query))
    .sort((a, b) => b.endTime - a.endTime);

  const start = page * limit;
  const markets = normalized.slice(start, start + limit);
  const hasMore = start + limit < normalized.length;

  return NextResponse.json({ markets, hasMore });
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

  if (action === "CREATE_MARKET") {
    const title = String(payload.title ?? "").trim();
    const description = String(payload.description ?? "").trim();
    const marketId = String(payload.marketId ?? title.toLowerCase().replace(/\s+/g, "-"));
    const endTime = Number(payload.endTime ?? Date.now() + 7 * 24 * 60 * 60 * 1000);
    const maxExposure = Math.max(1, Number(payload.maxExposure ?? 1000));
    const startTimeSeconds = Math.floor(Date.now() / 1000) + MARKET_START_DELAY_SECONDS;
    const endTimeSeconds = Math.floor((endTime < 1_000_000_000_000 ? endTime * 1000 : endTime) / 1000);
    const marketDurationSeconds = endTimeSeconds - startTimeSeconds;

    if (
      !Number.isFinite(endTimeSeconds) ||
      marketDurationSeconds < MIN_MARKET_DURATION_SECONDS ||
      marketDurationSeconds > MAX_MARKET_DURATION_SECONDS
    ) {
      return NextResponse.json(
        {
          error:
            "Market duration must be between 1 hour and 30 days from now. Adjust end date/time and try again.",
        },
        { status: 400 }
      );
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/markets`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        market_id: marketId,
        start_time: startTimeSeconds,
        end_time: endTimeSeconds,
        max_exposure: maxExposure,
        metadata_uri: JSON.stringify({ title, description }),
      }),
    });

    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to create market") },
        { status: response.status }
      );
    }

    const created = await safeJson<BackendMarket>(response);
    if (!created) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ market: normalizeMarket(created), status: "created" }, { status: 201 });
  }

  if (action === "PLACE_BET") {
    const marketId = String(payload.marketId ?? "").trim();
    const side = String(payload.side ?? "").trim().toUpperCase();
    const amount = Number(payload.amount ?? 0);
    const txHash = String(payload.txHash ?? "").trim();
    if (!marketId || !["YES", "NO"].includes(side) || amount <= 0 || !txHash) {
      return NextResponse.json({ error: "Invalid bet payload" }, { status: 400 });
    }

    const response = await proxyFetch(`${getBackendBaseUrl()}/markets/${marketId}/bet`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({ side, amount, tx_hash: txHash }),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to place bet") },
        { status: response.status }
      );
    }

    const accepted = await safeJson<Record<string, unknown>>(response);
    return NextResponse.json({
      status: "placed",
      marketId,
      side,
      amount,
      txHash,
      accepted,
    });
  }

  if (typeof body.market_id === "string") {
    const response = await proxyFetch(`${getBackendBaseUrl()}/markets`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify(body),
    });
    if (!response) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: await readErrorText(response, "Failed to create market") },
        { status: response.status }
      );
    }
    const created = await safeJson<BackendMarket>(response);
    if (!created) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }
    return NextResponse.json({ market: normalizeMarket(created), status: "created" }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
