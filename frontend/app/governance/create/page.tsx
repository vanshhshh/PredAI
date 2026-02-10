// File: frontend/app/governance/create/page.tsx

/**
 * PURPOSE
 * -------
 * Governance proposal creation page.
 *
 * This page:
 * - allows eligible users to submit new DAO proposals
 * - supports parameter changes, upgrades, and text proposals
 * - performs client-side validation only
 * - submits proposals to governance backend / contracts
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Wallet-gated access
 * - Explicit proposal structure
 * - Defensive UX (loading, error, confirm)
 */

"use client";

import React, { useState } from "react";

import { useGovernance } from "../../../hooks/useGovernance";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { Modal } from "../../../components/Shared/Modal";

type ProposalType = "PARAMETER_CHANGE" | "UPGRADE" | "TEXT";

export default function CreateGovernanceProposalPage() {
  const { address, isConnected } = useWallet();
  const { createProposal, isSubmitting, error } = useGovernance();

  const [proposalType, setProposalType] =
    useState<ProposalType>("TEXT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [executionData, setExecutionData] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // ------------------------------------------------------------
  // GUARD
  // ------------------------------------------------------------

  if (!isConnected) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">
          Connect your wallet
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          You must connect a wallet to submit governance proposals.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);

    await createProposal({
      title,
      description,
      payload: {
        type: proposalType,
        executionData:
          proposalType === "TEXT"
            ? null
            : executionData,
        createdBy: address,
      },
    });
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Create Proposal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Submit a proposal for protocol governance.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Proposal Type */}
        <div>
          <label className="block text-sm font-medium">
            Proposal Type
          </label>
          <select
            value={proposalType}
            onChange={(e) =>
              setProposalType(
                e.target.value as ProposalType
              )
            }
            className="mt-2 border rounded-md p-2 w-full"
          >
            <option value="TEXT">
              Text Proposal
            </option>
            <option value="PARAMETER_CHANGE">
              Parameter Change
            </option>
            <option value="UPGRADE">
              Protocol Upgrade
            </option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium">
            Title
          </label>
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            required
            className="mt-2 border rounded-md p-2 w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            required
            rows={5}
            className="mt-2 border rounded-md p-2 w-full"
          />
        </div>

        {/* Execution Data */}
        {proposalType !== "TEXT" && (
          <div>
            <label className="block text-sm font-medium">
              Execution Data
            </label>
            <textarea
              value={executionData}
              onChange={(e) =>
                setExecutionData(e.target.value)
              }
              required
              rows={4}
              className="mt-2 border rounded-md p-2 w-full font-mono text-sm"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border rounded-md text-sm text-red-600">
            {error.message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {isSubmitting
            ? "Submitting…"
            : "Submit Proposal"}
        </button>
      </form>

      {showConfirm && (
        <Modal
          title="Confirm proposal submission"
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        >
          <p className="text-sm text-gray-700">
            You are about to submit a governance
            proposal. If accepted, this may alter
            protocol behavior.
          </p>
        </Modal>
      )}

      {isSubmitting && (
        <LoadingSpinner label="Submitting proposal…" />
      )}
    </main>
  );
}
