// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  API_BASE,
  clearAccessToken,
  compilePrompt,
  fetchPlatformStats,
  stakeSocialArgument,
  writeAccessToken,
} from "../../lib/api";

describe("direct api client", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("requests platform stats from the backend directly", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        total_markets: 1,
        total_wallets: 2,
        total_bets: 3,
        total_agents: 4,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchPlatformStats();

    expect(payload.total_markets).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/stats`,
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("posts prompt compilation directly to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        title: "Sample",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = await compilePrompt("Hello");

    expect(payload.title).toBe("Sample");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/social/compile`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("sends bearer auth headers for protected backend calls", async () => {
    writeAccessToken("token-123");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        status: "staked",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await stakeSocialArgument({
      argumentId: "arg-1",
      amount: 10,
      walletAddress: "0x0000000000000000000000000000000000000001",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/social/arguments/arg-1/stake`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      })
    );
  });
});
