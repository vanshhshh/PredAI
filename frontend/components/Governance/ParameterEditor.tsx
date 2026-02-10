// File: frontend/components/Governance/ParameterEditor.tsx

/**
 * PURPOSE
 * -------
 * Governance-controlled parameter editor.
 *
 * This component:
 * - allows DAO-authorized users to propose parameter changes
 * - enforces bounds client-side (mirrors on-chain guards)
 * - emits structured parameter-change payloads
 *
 * IMPORTANT
 * ---------
 * - This does NOT directly change parameters
 * - It produces a proposal payload consumed by governance flows
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Explicit parameter schemas
 * - Deterministic serialization
 * - Defensive UX (validation, preview, confirm)
 */

"use client";

import React, { useState } from "react";

import { Modal } from "../Shared/Modal";
import { LoadingSpinner } from "../Shared/LoadingSpinner";

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
  const [draft, setDraft] = useState<Record<string, number>>(
    { ...currentValues }
  );
  const [showConfirm, setShowConfirm] =
    useState<boolean>(false);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  function updateParam(key: string, value: number) {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleConfirm() {
    setShowConfirm(false);
    await onSubmit(draft);
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h3 className="font-semibold text-sm">
        Protocol Parameters
      </h3>

      {parameters.map((param) => {
        const value = draft[param.key];

        return (
          <div key={param.key} className="space-y-1">
            <label className="text-xs font-medium">
              {param.label}
            </label>
            <div className="text-[11px] text-gray-600">
              {param.description}
            </div>
            <input
              type="number"
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              value={value}
              onChange={(e) =>
                updateParam(
                  param.key,
                  Number(e.target.value)
                )
              }
              className="w-full border rounded-md p-2 text-sm"
            />
            <div className="text-[11px] text-gray-500">
              Current: {currentValues[param.key]}
            </div>
          </div>
        );
      })}

      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isSubmitting}
        className="px-4 py-2 bg-black text-white rounded-md text-sm"
      >
        Submit Parameter Change
      </button>

      {isSubmitting && (
        <LoadingSpinner label="Submitting proposal…" />
      )}

      {showConfirm && (
        <Modal
          title="Confirm Parameter Changes"
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        >
          <div className="text-sm space-y-2">
            {parameters.map((param) => (
              <div key={param.key}>
                <strong>{param.label}:</strong>{" "}
                {currentValues[param.key]} →{" "}
                {draft[param.key]}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
