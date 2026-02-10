// File: frontend/components/Social/PromptCompiler.tsx

/**
 * PURPOSE
 * -------
 * Visual compiler for converting natural language prompts
 * into structured, auditable market specifications.
 *
 * This component:
 * - displays compiled output (no execution)
 * - shows intermediate representations (IR)
 * - is used by power users, agents, and governance reviewers
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Read-only compiler output
 * - Deterministic rendering
 * - No side effects
 * - Safe for experimentation
 */

"use client";

import React from "react";

interface CompiledMarketSpec {
  title: string;
  description: string;
  resolutionSource: string;
  resolutionTime: number;
  outcomes: string[];
  confidence: number;
}

interface PromptCompilerProps {
  compiledSpec?: CompiledMarketSpec | null;
}

export function PromptCompiler({
  compiledSpec,
}: PromptCompilerProps) {
  if (!compiledSpec) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        No compiled output yet.
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h3 className="font-semibold text-sm">
        Compiled Market Specification
      </h3>

      <div className="space-y-1 text-sm">
        <div>
          <strong>Title:</strong> {compiledSpec.title}
        </div>
        <div>
          <strong>Description:</strong>{" "}
          {compiledSpec.description}
        </div>
        <div>
          <strong>Resolution Source:</strong>{" "}
          {compiledSpec.resolutionSource}
        </div>
        <div>
          <strong>Resolution Time:</strong>{" "}
          {new Date(
            compiledSpec.resolutionTime
          ).toLocaleString()}
        </div>
        <div>
          <strong>Outcomes:</strong>{" "}
          {compiledSpec.outcomes.join(", ")}
        </div>
        <div>
          <strong>Model Confidence:</strong>{" "}
          {(compiledSpec.confidence * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
