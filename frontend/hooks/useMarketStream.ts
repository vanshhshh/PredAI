"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api";
import { fromCollateralUnits } from "@/lib/evmTx";
import type { Market } from "./useMarkets";


type MarketPayload = {
  market_id: string;
  address: string;
  creator: string;
  start_time: number;
  end_time: number;
  max_exposure: number | string;
  metadata_uri: string;
  settled: boolean;
  final_outcome: boolean | null;
  yes_pool?: number | string | null;
  no_pool?: number | string | null;
};

type StreamEnvelope = {
  event: string;
  payload?: MarketPayload | { market?: MarketPayload | null };
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

function normalizePayload(item: MarketPayload): Market {
  const meta = parseTitleDescription(item.metadata_uri);
  const yesPool = fromCollateralUnits(item.yes_pool ?? 0);
  const noPool = fromCollateralUnits(item.no_pool ?? 0);
  const totalPool = yesPool + noPool;
  const yesOdds = item.settled
    ? item.final_outcome === true
      ? 1
      : 0
    : totalPool > 0
    ? yesPool / totalPool
    : 0.5;

  return {
    marketId: item.market_id,
    address: item.address,
    title: meta.title,
    description: meta.description,
    yesOdds,
    noOdds: 1 - yesOdds,
    yesPool,
    noPool,
    liquidity: fromCollateralUnits(item.max_exposure ?? 0),
    endTime: Number(item.end_time ?? 0) * 1000,
    settled: Boolean(item.settled),
  };
}

function extractMarket(envelope: StreamEnvelope): MarketPayload | null {
  const payload = envelope.payload;
  if (!payload) return null;
  if ("market" in payload) {
    return payload.market ?? null;
  }
  return payload as MarketPayload;
}

export function useMarketStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!API_BASE || typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource(`${API_BASE}/realtime/markets`);

    function handle(event: MessageEvent<string>) {
      try {
        const envelope = JSON.parse(event.data) as StreamEnvelope;
        const payload = extractMarket(envelope);
        if (!payload?.market_id) return;
        const market = normalizePayload(payload);
        queryClient.setQueryData<Market[]>(["markets"], (current = []) => {
          const index = current.findIndex((item) => item.marketId === market.marketId);
          if (index === -1) {
            return [market, ...current].sort((a, b) => b.endTime - a.endTime);
          }
          const next = [...current];
          next[index] = { ...next[index], ...market };
          return next;
        });
      } catch {
        return;
      }
    }

    source.addEventListener("market.created", handle);
    source.addEventListener("market.updated", handle);
    source.addEventListener("market.settled", handle);
    source.addEventListener("trade.created", handle);

    return () => {
      source.close();
    };
  }, [queryClient]);
}
