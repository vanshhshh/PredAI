import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

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
  active?: boolean;
};

function normalizeVault(raw: BackendVault) {
  return {
    vaultId: raw.vaultId ?? raw.vault_id ?? `vault-${Date.now().toString(36)}`,
    name: raw.name ?? raw.strategy ?? "Yield Vault",
    description: raw.strategy ?? "",
    apy:
      typeof raw.apy === "number"
        ? raw.apy
        : Number(raw.apy_bps ?? 0) / 100,
    tvl: Number(raw.tvl ?? raw.total_deposited ?? 0),
    risk:
      typeof raw.risk === "number"
        ? raw.risk
        : Number(raw.risk_score ?? 0) / 100,
  };
}

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/yield/vaults`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch vaults") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  if (Array.isArray(payload)) {
    return NextResponse.json({
      vaults: payload.map((item) => normalizeVault(item as BackendVault)),
    });
  }
  if (payload && typeof payload === "object") {
    const asObject = payload as Record<string, unknown>;
    if (Array.isArray(asObject.vaults)) {
      return NextResponse.json({
        vaults: asObject.vaults.map((item) => normalizeVault(item as BackendVault)),
      });
    }
  }

  return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
}
