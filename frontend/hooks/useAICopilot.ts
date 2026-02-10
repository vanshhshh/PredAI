// File: frontend/hooks/useAICopilot.ts

/**
 * PURPOSE
 * -------
 * AI Copilot interaction hook.
 *
 * This hook:
 * - manages conversation state with the AI copilot
 * - sends user prompts to backend AI services
 * - supports cancellation, errors, and context binding
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is the source of intelligence
 * - No model logic here
 * - Stream-ready (can upgrade to SSE/WebSocket)
 * - Deterministic state transitions
 */

"use client";

import { useCallback, useRef, useState } from "react";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotContext {
  marketId?: string;
  agentId?: string;
  vaultId?: string;
}

export function useAICopilot(context?: CopilotContext) {
  const [messages, setMessages] = useState<CopilotMessage[]>(
    []
  );
  const [isSending, setIsSending] =
    useState<boolean>(false);
  const [error, setError] = useState<Error | null>(
    null
  );

  const abortRef = useRef<AbortController | null>(
    null
  );

  // ------------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);
      setIsSending(true);

      const userMessage: CopilotMessage = {
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/copilot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            context,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || "Copilot request failed"
          );
        }

        const data = await res.json();

        const assistantMessage: CopilotMessage = {
          role: "assistant",
          content: data.reply,
        };

        setMessages((prev) => [
          ...prev,
          assistantMessage,
        ]);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError(err as Error);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "An error occurred while generating a response.",
            },
          ]);
        }
      } finally {
        setIsSending(false);
        abortRef.current = null;
      }
    },
    [context]
  );

  // ------------------------------------------------------------------
  // CANCEL
  // ------------------------------------------------------------------

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  }, []);

  // ------------------------------------------------------------------
  // RESET
  // ------------------------------------------------------------------

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsSending(false);
  }, []);

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------

  return {
    messages,
    isSending,
    error,

    sendMessage,
    cancel,
    reset,
  };
}
