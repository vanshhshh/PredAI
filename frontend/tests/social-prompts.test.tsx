import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";

import SocialPromptsPage from "../app/social/prompts/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../hooks/useSocialFeeds", () => ({
  useSocialFeeds: () => ({
    compilePrompt: vi.fn(async () => ({
      title: "Compiled Market",
      description: "Description",
      resolution_criteria: "Criteria",
      category: "Crypto",
      end_date: new Date(Date.now() + 86_400_000).toISOString(),
      initial_odds: { yes: 0.6, no: 0.4 },
      confidence: 0.8,
    })),
    isCompiling: false,
    error: null,
  }),
}));

describe("SocialPromptsPage", () => {
  it("renders compiled spec after compile", async () => {
    render(<SocialPromptsPage />);

    await userEvent.type(
      screen.getByLabelText(/natural-language prompt/i),
      "Will BTC hit 150k?"
    );
    await userEvent.click(screen.getByRole("button", { name: /compile prompt/i }));

    expect(await screen.findByText(/^compiled market spec$/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Compiled Market" })
    ).toBeInTheDocument();
  }, 15000);
});
