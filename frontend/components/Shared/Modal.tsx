// File: frontend/components/Shared/Modal.tsx

/**
 * PURPOSE
 * -------
 * Reusable modal / dialog component.
 *
 * This component:
 * - renders content in an overlay
 * - supports confirm / cancel flows
 * - is used for governance confirms, destructive actions, etc.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Controlled by parent
 * - No side effects
 * - Accessible defaults
 * - Production-safe UX
 */

"use client";

import React, { ReactNode, useEffect } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ModalProps) {
  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-lg max-w-md w-full p-4 space-y-4">
        <header className="flex justify-between items-center">
          <h2 className="font-semibold text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-500"
          >
            ✕
          </button>
        </header>

        <div className="text-sm">{children}</div>

        <footer className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded-md text-xs"
          >
            {cancelLabel}
          </button>

          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-3 py-1 bg-black text-white rounded-md text-xs"
            >
              {confirmLabel}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
