"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "../../../components/Shared/Modal";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";

export default function CreateAgentPage() {
  const router = useRouter();
  const { isConnected } = useWallet();
  const { createAgent, myAgents, isMutating, error } = useAgents();

  const [name, setName] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<number>(5);
  const [maxExposure, setMaxExposure] = useState<number>(1000);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isConnected) {
    return (
      <section className="page-container py-14">
        <CenteredState
          title="Wallet not connected"
          message="Connect your wallet to create and own a trading agent."
        />
      </section>
    );
  }

  if (myAgents.length > 0) {
    return (
      <section className="page-container py-14">
        <CenteredState
          title="Agent limit reached"
          message="This protocol deployment currently supports one agent per wallet."
        />
      </section>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);

    await createAgent({
      name,
      riskTolerance,
      maxExposure,
    });

    router.push("/agents/my-agents");
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Agent Provisioning</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Create AI Agent</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Configure baseline risk and exposure settings before minting an
          autonomous strategy agent.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
        <section className="ui-card p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="agent-name" className="ui-label">
                Agent Name
              </label>
              <input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Momentum Alpha"
                className="ui-input"
              />
            </div>

            <div>
              <label htmlFor="risk-slider" className="ui-label">
                Risk Tolerance ({riskTolerance})
              </label>
              <input
                id="risk-slider"
                type="range"
                min={1}
                max={10}
                value={riskTolerance}
                onChange={(event) => setRiskTolerance(Number(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>Conservative</span>
                <span>Balanced</span>
                <span>Aggressive</span>
              </div>
            </div>

            <div>
              <label htmlFor="max-exposure" className="ui-label">
                Max Exposure
              </label>
              <input
                id="max-exposure"
                type="number"
                min={1}
                value={maxExposure}
                onChange={(event) => setMaxExposure(Number(event.target.value))}
                className="ui-input"
              />
            </div>

            {error && <p className="text-sm text-rose-300">{error.message}</p>}

            <button type="submit" disabled={isMutating} className="ui-btn ui-btn-primary w-full">
              {isMutating ? "Creating..." : "Launch Agent"}
            </button>
          </form>
        </section>

        <aside className="ui-card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Agent Summary</h2>
          <SummaryRow label="Name" value={name || "Unnamed Agent"} />
          <SummaryRow label="Risk Profile" value={riskLabel(riskTolerance)} />
          <SummaryRow label="Max Exposure" value={`$${maxExposure}`} />
          <p className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-400">
            This agent will be minted as an NFT and controlled by your connected
            wallet.
          </p>
        </aside>
      </div>

      {showConfirm && (
        <Modal
          title="Confirm Agent Creation"
          onClose={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirm()}
        >
          <p className="text-sm text-slate-200">
            You are about to register this AI agent on-chain.
          </p>
        </Modal>
      )}

      {isMutating && <LoadingSpinner label="Registering agent..." />}
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function riskLabel(level: number) {
  if (level <= 3) return "Conservative";
  if (level <= 7) return "Balanced";
  return "Aggressive";
}

function CenteredState({ title, message }: { title: string; message: string }) {
  return (
    <div className="ui-card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
    </div>
  );
}
