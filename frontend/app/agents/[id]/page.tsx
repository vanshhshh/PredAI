// File: frontend/app/agents/[id]/page.tsx

/**
 * PURPOSE
 * -------
 * Individual AI Agent profile page.
 *
 * This page:
 * - displays agent identity, ownership, and lifecycle state
 * - shows historical performance and scoring
 * - exposes staking / activation controls (when authorized)
 * - visualizes agent strategy metadata (read-only)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - All data via hooks
 * - Authorization-aware UI
 * - Defensive UX (loading / error / empty)
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";

import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";
import { StakingControls } from "../../../components/Agent/StakingControls";
import { NFTViewer } from "../../../components/Agent/NFTViewer";

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

  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------

  if (!agentId) {
    return (
      <ErrorState
        title="Invalid agent"
        message="Agent identifier is missing or invalid."
      />
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading agent…" />;
  }

  // ------------------------------------------------------------
  // FIND AGENT
  // ------------------------------------------------------------

  const agent = agents.find(
    (a) => a.agentId === agentId
  );

  if (!agent) {
    return (
      <ErrorState
        title="Agent not found"
        message="This agent does not exist or has been removed."
      />
    );
  }

  const isOwner =
    isConnected &&
    address?.toLowerCase() === agent.owner.toLowerCase();

  // ------------------------------------------------------------
  // MAIN VIEW
  // ------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <section className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Agent {agent.agentId.slice(0, 8)}…
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Owner: {agent.owner}
          </p>
        </div>

        <NFTViewer
          tokenId={agent.nftTokenId}
          metadataUri={agent.metadataUri}
        />
      </section>

      {/* Performance */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Performance
        </h2>
        <AgentDashboard agents={[agent]} />
      </section>

      {/* Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Controls
        </h2>

        {isOwner ? (
          <StakingControls
            agentId={agent.agentId}
            active={agent.active}
            currentStake={agent.stake}
            onStake={(amount) =>
              stakeAgent({
                agentId: agent.agentId,
                amount,
              })
            }
            onUnstake={(amount) =>
              unstakeAgent({
                agentId: agent.agentId,
                amount,
              })
            }
            onToggleActive={() =>
              toggleAgentActive(agent.agentId)
            }
            isPending={isMutating}
            error={mutationError}
          />
        ) : (
          <div className="text-sm text-gray-500">
            You are not the owner of this agent.
          </div>
        )}
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Local UI helpers                                                    */
/* ------------------------------------------------------------------ */

function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="p-6 border rounded-md bg-red-50">
      <h3 className="font-semibold text-red-700">
        {title}
      </h3>
      <p className="text-sm text-red-600 mt-2">
        {message}
      </p>
    </div>
  );
}
