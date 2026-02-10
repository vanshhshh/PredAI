// File: frontend/app/social/prompts/page.tsx

/**
 * PURPOSE
 * -------
 * Prompt compiler & playground for market creation.
 *
 * This page:
 * - allows users to experiment with natural-language prompts
 * - shows how prompts compile into structured market specs
 * - is used by power users, agents, and governance reviewers
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Deterministic prompt → spec compilation
 * - Transparent intermediate representations
 * - Safe sandbox (no deployment here)
 */

"use client";

import React, { useState } from "react";

import { useSocialFeeds } from "../../../hooks/useSocialFeeds";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { PromptCompiler } from "../../../components/Social/PromptCompiler";

export default function SocialPromptsPage() {
  return (
    <ErrorBoundary>
      <PromptsContent />
    </ErrorBoundary>
  );
}

function PromptsContent() {
  const { compilePrompt, isCompiling, error } = useSocialFeeds();

  const [prompt, setPrompt] = useState("");

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleCompile() {
    if (!prompt.trim()) return;
    await compilePrompt(prompt);
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Prompt Compiler</h1>
        <p className="text-sm text-gray-600 mt-1">
          Convert natural-language prompts into structured market
          specifications.
        </p>
      </header>

      <section className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full border rounded-md p-2"
          placeholder="e.g. Will ETH staking APR exceed 6% in Q3 2026?"
        />

        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {isCompiling ? "Compiling…" : "Compile Prompt"}
        </button>

        {isCompiling && (
          <LoadingSpinner label="Compiling prompt…" />
        )}

        {error && (
          <div className="p-3 bg-red-50 border rounded-md text-sm text-red-600">
            {error.message}
          </div>
        )}
      </section>

      <section>
        <PromptCompiler />
      </section>
    </main>
  );
}
