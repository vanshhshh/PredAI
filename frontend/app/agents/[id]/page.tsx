"use client";

import React from "react";
import { useParams } from "next/navigation";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";
import { NFTViewer } from "../../../components/Agent/NFTViewer";
import { StakingControls } from "../../../components/Agent/StakingControls";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useAgents } from "../../../hooks/useAgents";
import { useResolvedUsernames } from "../../../hooks/useResolvedUsernames";
import { useWallet } from "../../../hooks/useWallet";
import { shortenAddress } from "../../../lib/identity";

export default function AgentPage() {
  return (
    <ErrorBoundary>
      <AgentContent />
    </ErrorBoundary>
  );
}

function AgentContent() {
  const params = useParams();
  const agentId = params?.id as string | undefined;

  const { address, isConnected } = useWallet();
  const {
    agents,
    stakeAgent,
    unstakeAgent,
    toggleAgentActive,
    isLoading,
    isMutating,
    error: mutationError,
  } = useAgents();
  const usernames = useResolvedUsernames(agents.map((item) => item.owner));

  if (!agentId) {
    return (
      <section className="page-container py-14">
        <CenteredError title="Invalid agent" message="Agent identifier is missing." />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading agent..." />
      </section>
    );
  }

  const agent = agents.find((item) => item.agentId === agentId);
  if (!agent) {
    return (
      <section className="page-container py-14">
        <CenteredError title="Agent not found" message="The requested agent does not exist." />
      </section>
    );
  }

  const isOwner = isConnected && address?.toLowerCase() === agent.owner.toLowerCase();
  const ownerDisplay =
    usernames[agent.owner.toLowerCase()] ?? shortenAddress(agent.owner);

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ui-kicker">Agent Profile</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">
              Agent {agent.agentId.slice(0, 8)}...
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <StatusBadge active={agent.active} />
              <span>Owner {ownerDisplay}</span>
            </div>
          </div>
          <div className="ui-card-soft p-2">
            <NFTViewer tokenId={agent.nftTokenId} metadataUri={agent.metadataUri} />
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Current Stake" value={agent.stake.toString()} />
        <MetricCard label="Status" value={agent.active ? "Active" : "Inactive"} />
        <MetricCard label="Agent ID" value={agent.agentId.slice(0, 12)} />
      </section>

      <section className="ui-card p-5">
        <h2 className="text-lg font-semibold text-white">Performance</h2>
        <div className="mt-4">
          <AgentDashboard agents={[agent]} />
        </div>
      </section>

      <section className="ui-card p-5">
        <h2 className="text-lg font-semibold text-white">Owner Controls</h2>
        <div className="mt-4">
          {isOwner ? (
            <StakingControls
              agentId={agent.agentId}
              active={agent.active}
              currentStake={agent.stake}
              onStake={(amount) => stakeAgent({ agentId: agent.agentId, amount })}
              onUnstake={(amount) => unstakeAgent({ agentId: agent.agentId, amount })}
              onDeactivate={() => toggleAgentActive(agent.agentId)}
              isPending={isMutating}
              error={mutationError}
            />
          ) : (
            <p className="text-sm text-slate-300">
              You are not the owner of this agent, so staking controls are read-only.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`ui-badge ${
        active
          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
          : "border-slate-300/30 bg-slate-400/15 text-slate-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function CenteredError({ title, message }: { title: string; message: string }) {
  return (
    <div className="ui-card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-semibold text-rose-200">{title}</h2>
      <p className="mt-2 text-sm text-rose-100">{message}</p>
    </div>
  );
}
