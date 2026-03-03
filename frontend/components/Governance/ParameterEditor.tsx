"use client";

import React, { useMemo, useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";
import { Modal } from "../Shared/Modal";

interface ParameterSpec {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step?: number;
}

interface ParameterEditorProps {
  parameters: ParameterSpec[];
  currentValues: Record<string, number>;
  onSubmit: (changes: Record<string, number>) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function ParameterEditor({
  parameters,
  currentValues,
  onSubmit,
  isSubmitting = false,
  error,
}: ParameterEditorProps) {
  const [draft, setDraft] = useState<Record<string, number>>({ ...currentValues });
  const [showConfirm, setShowConfirm] = useState(false);

  function updateParam(key: string, value: number) {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const changedParameters = useMemo(() => {
    return parameters.filter((param) => draft[param.key] !== currentValues[param.key]);
  }, [currentValues, draft, parameters]);

  async function handleConfirm() {
    setShowConfirm(false);
    await onSubmit(draft);
  }

  return (
    <section className="ui-card space-y-6 p-5">
      <header>
        <p className="ui-kicker">Protocol Config</p>
        <h3 className="text-base font-semibold text-white">Parameter Editor</h3>
        <p className="mt-1 text-sm text-slate-300">
          Prepare parameter updates for governance review and voting.
        </p>
      </header>

      <div className="space-y-4">
        {parameters.map((param) => {
          const value = draft[param.key];
          const isChanged = value !== currentValues[param.key];

          return (
            <article key={param.key} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{param.label}</h4>
                  <p className="mt-1 text-xs text-slate-400">{param.description}</p>
                </div>
                {isChanged && (
                  <span className="ui-badge border-cyan-300/30 bg-cyan-400/15 text-cyan-100">
                    Modified
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor={`param-${param.key}`} className="ui-label">
                    New Value
                  </label>
                  <input
                    id={`param-${param.key}`}
                    type="number"
                    min={param.min}
                    max={param.max}
                    step={param.step ?? 1}
                    value={value}
                    onChange={(event) => updateParam(param.key, Number(event.target.value))}
                    className="ui-input"
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Current</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {currentValues[param.key]}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Bounds</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {param.min} - {param.max}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-400">
          Changes are submitted as proposals and require quorum to execute.
        </p>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isSubmitting || changedParameters.length === 0}
          className="ui-btn ui-btn-primary"
        >
          Submit Proposal
        </button>
      </footer>

      {isSubmitting && <LoadingSpinner label="Submitting governance proposal..." size="sm" />}

      {showConfirm && (
        <Modal
          title="Confirm Parameter Changes"
          onClose={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirm()}
        >
          <div className="space-y-2">
            {changedParameters.length === 0 && (
              <p className="text-sm text-slate-300">No parameter values were changed.</p>
            )}

            {changedParameters.map((param) => {
              const before = currentValues[param.key];
              const after = draft[param.key];

              return (
                <div
                  key={param.key}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-sm"
                >
                  <span>{param.label}</span>
                  <span className="font-semibold text-cyan-100">
                    {before} - {after}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </section>
  );
}
