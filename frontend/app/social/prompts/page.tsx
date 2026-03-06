"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { useSocialFeeds } from "../../../hooks/useSocialFeeds";

type CompiledMarketSpec = {
  title: string;
  description: string;
  resolution_criteria: string;
  category: string;
  end_date: string;
  initial_odds: {
    yes: number;
    no: number;
  };
  confidence: number;
};

function normalizeOdds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return value;
  return value * 100;
}

function confidenceBadgeStyle(confidence: number): string {
  if (confidence >= 0.75) {
    return "border-emerald-300/35 bg-emerald-400/15 text-emerald-100";
  }
  if (confidence >= 0.5) {
    return "border-amber-300/35 bg-amber-300/15 text-amber-100";
  }
  return "border-rose-300/35 bg-rose-400/15 text-rose-100";
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `market-${Date.now()}`
  );
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const error = payload.error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export default function SocialPromptsPage() {
  return (
    <ErrorBoundary>
      <PromptsContent />
    </ErrorBoundary>
  );
}

function PromptsContent() {
  const router = useRouter();
  const { compilePrompt, isCompiling, error } = useSocialFeeds();
  const [prompt, setPrompt] = useState("");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compiledSpec, setCompiledSpec] = useState<CompiledMarketSpec | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const normalizedConfidence = useMemo(() => {
    if (!compiledSpec) return 0;
    const value = Number(compiledSpec.confidence);
    if (!Number.isFinite(value)) return 0;
    return value > 1 ? value / 100 : value;
  }, [compiledSpec]);

  async function handleCompile() {
    if (!prompt.trim()) return;
    setCompileError(null);
    try {
      const payload = (await compilePrompt(prompt)) as Partial<CompiledMarketSpec>;
      setCompiledSpec({
        title: String(payload.title ?? prompt.slice(0, 120)),
        description: String(payload.description ?? prompt),
        resolution_criteria: String(
          payload.resolution_criteria ??
            "Resolves YES if the stated condition is true by end date; otherwise NO."
        ),
        category: String(payload.category ?? "General"),
        end_date: String(payload.end_date ?? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()),
        initial_odds: {
          yes: Number(payload.initial_odds?.yes ?? 0.5),
          no: Number(payload.initial_odds?.no ?? 0.5),
        },
        confidence:
          typeof payload.confidence === "number"
            ? payload.confidence
            : Number(payload.confidence ?? 0.5),
      });
    } catch (compileFailure) {
      const message =
        compileFailure instanceof Error
          ? compileFailure.message
          : "Prompt compilation failed";
      setCompileError(message);
      setCompiledSpec(null);
    }
  }

  async function handleDeployToTestnet() {
    if (!compiledSpec) return;

    setIsDeploying(true);
    setCompileError(null);

    try {
      const parsedEnd = new Date(compiledSpec.end_date).getTime();
      const endTime =
        Number.isFinite(parsedEnd) && parsedEnd > Date.now()
          ? parsedEnd
          : Date.now() + 7 * 24 * 60 * 60 * 1000;

      const marketDescription = [
        compiledSpec.description,
        "",
        `Resolution Criteria: ${compiledSpec.resolution_criteria}`,
        `Category: ${compiledSpec.category}`,
        `Initial Odds: YES ${normalizeOdds(compiledSpec.initial_odds.yes).toFixed(2)}% / NO ${normalizeOdds(
          compiledSpec.initial_odds.no
        ).toFixed(2)}%`,
        `Compiler Confidence: ${(normalizedConfidence * 100).toFixed(1)}%`,
      ].join("\n");

      const response = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MARKET",
          payload: {
            title: compiledSpec.title,
            description: marketDescription,
            marketId: slugify(compiledSpec.title),
            endTime,
            maxExposure: 10_000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to deploy market"));
      }

      const payload = (await response.json()) as {
        market?: { marketId?: string; market_id?: string };
      };
      const marketId = payload.market?.marketId ?? payload.market?.market_id;
      if (!marketId) {
        throw new Error("Market created but ID was not returned");
      }

      router.push(`/markets/${encodeURIComponent(marketId)}`);
    } catch (deployFailure) {
      const message =
        deployFailure instanceof Error ? deployFailure.message : "Failed to deploy market";
      setCompileError(message);
    } finally {
      setIsDeploying(false);
    }
  }

  function handleEditAsJson() {
    if (!compiledSpec) return;
    setPrompt(JSON.stringify(compiledSpec, null, 2));
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Compiler Playground</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Prompt Compiler</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Convert natural-language hypotheses into structured market
          specifications for review before deployment.
        </p>
      </header>

      <section className="ui-card space-y-4 p-5">
        <div>
          <label htmlFor="prompt-input" className="ui-label">
            Natural-language Prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder="Will ETH staking APR exceed 6% in Q3 2026?"
            className="ui-textarea"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleCompile()}
            disabled={isCompiling || !prompt.trim()}
            className="ui-btn ui-btn-primary"
          >
            {isCompiling ? "Compiling..." : "Compile Prompt"}
          </button>
          <p className="text-xs text-slate-400">
            Production compiler output is validated before market creation
          </p>
        </div>

        {isCompiling && (
          <div className="space-y-3">
            <div className="h-5 w-1/3 animate-pulse rounded bg-slate-700/45" />
            <div className="h-16 w-full animate-pulse rounded bg-slate-700/35" />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="h-10 animate-pulse rounded bg-slate-700/35" />
              <div className="h-10 animate-pulse rounded bg-slate-700/35" />
              <div className="h-10 animate-pulse rounded bg-slate-700/35" />
            </div>
          </div>
        )}
        {(compileError || error) && (
          <p className="text-sm text-rose-300">{compileError ?? error?.message}</p>
        )}
      </section>

      {compiledSpec && (
        <section className="ui-card space-y-5 p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ui-kicker">Compiled Market Spec</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{compiledSpec.title}</h2>
            </div>
            <span className={`ui-badge ${confidenceBadgeStyle(normalizedConfidence)}`}>
              Confidence {(normalizedConfidence * 100).toFixed(1)}%
            </span>
          </header>

          <div className="space-y-2">
            <p className="ui-kicker">Description</p>
            <p className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-200">
              {compiledSpec.description}
            </p>
          </div>

          <div className="space-y-2">
            <p className="ui-kicker">Resolution Criteria</p>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-3 text-sm text-cyan-100">
              {compiledSpec.resolution_criteria}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SpecField label="Category" value={compiledSpec.category} />
            <SpecField
              label="End Date"
              value={new Date(compiledSpec.end_date).toLocaleString()}
            />
            <SpecField
              label="Initial Odds"
              value={`Yes ${normalizeOdds(compiledSpec.initial_odds.yes).toFixed(2)}% / No ${normalizeOdds(
                compiledSpec.initial_odds.no
              ).toFixed(2)}%`}
            />
            <SpecField
              label="Confidence"
              value={`${(normalizedConfidence * 100).toFixed(1)}%`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              disabled={isDeploying}
              onClick={() => void handleDeployToTestnet()}
            >
              {isDeploying ? "Deploying..." : "Deploy to Testnet"}
            </button>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={handleEditAsJson}>
              Edit
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function SpecField({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </article>
  );
}
