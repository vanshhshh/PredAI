import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";

import { ArgumentStaker } from "../components/Social/ArgumentStaker";

const sampleItems = [
  {
    argumentId: "arg-1",
    text: "Sample argument text",
    confidence: 0.75,
    totalStake: 0,
    resolved: false,
  },
];

describe("ArgumentStaker", () => {
  it("prompts wallet connect when not connected", async () => {
    const onRequestConnect = vi.fn();
    render(
      <ArgumentStaker
        items={sampleItems}
        isConnected={false}
        onRequestConnect={onRequestConnect}
      />
    );

    const button = screen.getByRole("button", { name: /connect wallet to stake/i });
    await userEvent.click(button);

    expect(onRequestConnect).toHaveBeenCalledTimes(1);
  });

  it("calls onStake when connected", async () => {
    const onStake = vi.fn().mockResolvedValue(undefined);
    render(<ArgumentStaker items={sampleItems} isConnected={true} onStake={onStake} />);

    const input = screen.getByLabelText(/stake amount/i);
    await userEvent.clear(input);
    await userEvent.type(input, "10");

    const button = screen.getByRole("button", { name: /^stake$/i });
    await userEvent.click(button);

    expect(onStake).toHaveBeenCalledWith({ argumentId: "arg-1", amount: 10 });
  }, 15000);
});
