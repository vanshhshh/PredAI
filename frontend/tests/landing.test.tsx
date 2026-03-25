import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import LandingPage from "../app/page";

describe("LandingPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders live stats from the backend", async () => {
    const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        total_markets: 2,
        total_wallets: 3,
        total_bets: 4,
        total_agents: 1,
      }),
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LandingPage />
      </QueryClientProvider>
    );

    expect(screen.getByText("Markets Created")).toBeInTheDocument();
    expect(screen.getByText("Wallets Connected")).toBeInTheDocument();
    expect(screen.getByText("Bets Placed")).toBeInTheDocument();
    expect(screen.getByText("Active Agents")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/^2$/)).toBeInTheDocument();
      expect(screen.getByText(/^3$/)).toBeInTheDocument();
      expect(screen.getByText(/^4$/)).toBeInTheDocument();
      expect(screen.getByText(/^1$/)).toBeInTheDocument();
    });
  });
});
