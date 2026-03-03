"use client";

import React, { useState } from "react";

import { Modal } from "../../../components/Shared/Modal";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useGovernance } from "../../../hooks/useGovernance";
import { useWallet } from "../../../hooks/useWallet";

type ProposalType = "PARAMETER_CHANGE" | "UPGRADE" | "TEXT";

export default function CreateGovernanceProposalPage() {
  const { address, isConnected } = useWallet();
  const { createProposal, isSubmitting, error } = useGovernance();

  const [proposalType, setProposalType] = useState<ProposalType>("TEXT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [executionData, setExecutionData] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isConnected) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="Connect your wallet"
          message="Governance participation requires wallet authentication."
          tone="neutral"
        />
      </section>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);

    await createProposal({
      title,
      description,
      payload: {
        type: proposalType,
        executionData: proposalType === "TEXT" ? null : executionData,
        createdBy: address,
      },
    });
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Governance Authoring</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Submit Proposal</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Draft protocol motions and publish them for token-holder voting.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <ProposalTypeCard
          active={proposalType === "TEXT"}
          title="Text"
          description="Non-binding signaling proposal"
          onClick={() => setProposalType("TEXT")}
        />
        <ProposalTypeCard
          active={proposalType === "PARAMETER_CHANGE"}
          title="Parameter Change"
          description="Adjust protocol settings"
          onClick={() => setProposalType("PARAMETER_CHANGE")}
        />
        <ProposalTypeCard
          active={proposalType === "UPGRADE"}
          title="Upgrade"
          description="Upgrade contracts or protocol logic"
          onClick={() => setProposalType("UPGRADE")}
        />
      </section>

      <form onSubmit={handleSubmit} className="ui-card space-y-5 p-5">
        <div>
          <label htmlFor="proposal-title" className="ui-label">
            Proposal Title
          </label>
          <input
            id="proposal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="ui-input"
            placeholder="Increase max agent exposure cap"
          />
        </div>

        <div>
          <label htmlFor="proposal-description" className="ui-label">
            Description
          </label>
          <textarea
            id="proposal-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={6}
            className="ui-textarea"
            placeholder="Describe rationale, expected impact, and implementation."
          />
        </div>

        {proposalType !== "TEXT" && (
          <div>
            <label htmlFor="execution-payload" className="ui-label">
              Execution Payload
            </label>
            <textarea
              id="execution-payload"
              value={executionData}
              onChange={(event) => setExecutionData(event.target.value)}
              required
              rows={4}
              className="ui-textarea font-mono text-xs"
              placeholder="Encoded contract call data"
            />
            <p className="mt-1 text-xs text-slate-400">
              Payload executes only if the proposal passes governance.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error.message}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary">
            {isSubmitting ? "Submitting..." : "Submit Proposal"}
          </button>
        </div>
      </form>

      {showConfirm && (
        <Modal
          title="Confirm Governance Proposal"
          onClose={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirm()}
        >
          <p className="text-sm text-slate-200">
            This proposal will be published to the DAO and cannot be edited
            afterwards.
          </p>
        </Modal>
      )}

      {isSubmitting && <LoadingSpinner label="Submitting proposal..." />}
    </main>
  );
}

function ProposalTypeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-card p-4 text-left transition ${
        active ? "border-cyan-300/40" : "hover:border-cyan-300/25"
      }`}
      aria-pressed={active}
    >
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{description}</p>
    </button>
  );
}

function MessageCard({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "neutral" | "error";
}) {
  return (
    <article className="ui-card max-w-2xl p-6">
      <h2
        className={`text-lg font-semibold ${
          tone === "error" ? "text-rose-200" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-rose-100" : "text-slate-300"}`}>
        {message}
      </p>
    </article>
  );
}
