// File: frontend/components/Governance/ProposalCard.tsx

/**
 * PURPOSE
 * -------
 * Summary card for a governance proposal.
 *
 * This component:
 * - displays proposal metadata (title, status, voting window)
 * - shows vote counts and quorum progress
 * - links to proposal detail / voting flows
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Read-only
 * - Deterministic rendering
 * - Governance-safe (no side effects)
 * - Clear status signaling
 */

"use client";

import React from "react";
import Link from "next/link";

interface Proposal {
  proposalId: string;
  title: string;
  status: "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED";
  startTime: number;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  quorum: number;
}

interface ProposalCardProps {
  proposal: Proposal;
  showOutcome?: boolean;
}

export function ProposalCard({
  proposal,
  showOutcome = false,
}: ProposalCardProps) {
  const totalVotes =
    proposal.forVotes + proposal.againstVotes;

  const quorumPercent =
    proposal.quorum > 0
      ? Math.min(
          100,
          (totalVotes / proposal.quorum) * 100
        )
      : 0;

  return (
    <Link
      href={`/governance/proposals/${proposal.proposalId}`}
      className="block border rounded-md p-4 hover:shadow-sm transition"
    >
      <div className="space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-sm">
          {proposal.title}
        </h3>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <span
            className={`font-medium ${
              proposal.status === "ACTIVE"
                ? "text-green-600"
                : proposal.status === "PASSED"
                ? "text-blue-600"
                : proposal.status === "REJECTED"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {proposal.status}
          </span>

          <span className="text-gray-500">
            {new Date(proposal.startTime).toLocaleDateString()} –{" "}
            {new Date(proposal.endTime).toLocaleDateString()}
          </span>
        </div>

        {/* Votes */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>For</span>
            <span>{proposal.forVotes}</span>
          </div>
          <div className="flex justify-between">
            <span>Against</span>
            <span>{proposal.againstVotes}</span>
          </div>

          {/* Quorum */}
          <div className="w-full h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-black rounded"
              style={{ width: `${quorumPercent}%` }}
            />
          </div>

          {showOutcome && (
            <div className="text-[11px] text-gray-600">
              Quorum: {proposal.quorum}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
