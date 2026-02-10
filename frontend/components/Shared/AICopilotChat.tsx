// File: frontend/components/Shared/AICopilotChat.tsx

/**
 * PURPOSE
 * -------
 * Embedded AI copilot chat interface.
 *
 * This component:
 * - provides contextual AI assistance (markets, agents, yield, governance)
 * - streams responses from backend AI services
 * - is designed to be embedded on any page
 *
 * IMPORTANT
 * ---------
 * - This is a UI + interaction shell only
 * - No model logic lives here
 * - All intelligence is delegated to backend / AI services
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Stateless with respect to intelligence
 * - Stream-friendly
 * - Safe fallbacks
 * - Production-grade UX (latency, errors, cancel)
 */

"use client";

import React, { useState, useRef } from "react";

import { LoadingSpinner } from "./LoadingSpinner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AICopilotChatProps {
  context?: {
    marketId?: string;
    agentId?: string;
    vaultId?: string;
  };
}

export function AICopilotChat({ context }: AICopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] =
    useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(
    null
  );

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Copilot request failed");
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while responding.",
        },
      ]);
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <div className="border rounded-md p-3 space-y-3 text-sm">
      <header className="font-semibold">
        AI Copilot
      </header>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              m.role === "user"
                ? "bg-gray-100"
                : "bg-blue-50"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-md p-2 text-sm"
          placeholder="Ask the copilot…"
          disabled={isSending}
        />

        {!isSending && (
          <button
            onClick={sendMessage}
            className="px-3 py-1 bg-black text-white rounded-md text-xs"
          >
            Send
          </button>
        )}

        {isSending && (
          <button
            onClick={cancel}
            className="px-3 py-1 border rounded-md text-xs"
          >
            Cancel
          </button>
        )}
      </div>

      {isSending && (
        <LoadingSpinner label="Thinking…" />
      )}
    </div>
  );
}
