import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

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

function readMetadata(metadataUri: string): AssetMetadata {
  try {
    return JSON.parse(metadataUri) as AssetMetadata;
  } catch {
    return {};
  }
}

function normalizeAsset(item: BackendAsset) {
  const metadata = readMetadata(item.metadata_uri);
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

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/rwa/assets`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch RWA assets") },
      { status: response.status }
    );
  }

  const payload = await safeJson<{ assets?: BackendAsset[] }>(response);
  const assets = Array.isArray(payload?.assets)
    ? payload!.assets!.map((item) => normalizeAsset(item))
    : [];
  return NextResponse.json({ assets });
}
