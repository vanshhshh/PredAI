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

export function PromptCompiler({ compiledSpec }: PromptCompilerProps) {
  if (!compiledSpec) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        Awaiting compiled output from the prompt pipeline...
      </div>
    );
  }

  const confidencePercent = Math.round(compiledSpec.confidence * 100);

  return (
    <section className="ui-card space-y-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="ui-kicker">Compiler Output</p>
          <h3 className="text-base font-semibold text-white">
            Structured Market Specification
          </h3>
        </div>
        <ConfidenceBadge percent={confidencePercent} />
      </header>

      <Section label="Title">
        <CodeBlock>{compiledSpec.title}</CodeBlock>
      </Section>

      <Section label="Description">
        <CodeBlock>{compiledSpec.description}</CodeBlock>
      </Section>

      <Section label="Resolution">
        <div className="grid gap-2 text-sm">
          <Field label="Source" value={compiledSpec.resolutionSource} />
          <Field
            label="Time"
            value={new Date(compiledSpec.resolutionTime).toLocaleString()}
          />
        </div>
      </Section>

      <Section label="Outcomes">
        <div className="flex flex-wrap gap-2">
          {compiledSpec.outcomes.map((outcome, index) => (
            <span
              key={`${outcome}-${index}`}
              className="rounded-full border border-white/15 bg-slate-950/35 px-3 py-1 text-xs text-slate-100"
            >
              {outcome}
            </span>
          ))}
        </div>
      </Section>

      <Section label="Model Confidence">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Confidence Score</span>
            <span>{confidencePercent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-950/45">
            <div
              className={`h-full rounded-full ${
                confidencePercent >= 70
                  ? "bg-emerald-400"
                  : confidencePercent >= 50
                  ? "bg-amber-300"
                  : "bg-rose-400"
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </Section>
    </section>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="ui-kicker">{label}</p>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/15 bg-slate-950/35 p-3 text-sm text-slate-100">
      {children}
    </pre>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function ConfidenceBadge({ percent }: { percent: number }) {
  const style =
    percent >= 70
      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
      : percent >= 50
      ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
      : "border-rose-300/30 bg-rose-400/15 text-rose-100";

  return <span className={`ui-badge ${style}`}>{percent}% confidence</span>;
}
