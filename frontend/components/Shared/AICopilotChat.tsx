"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Copilot failed");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "The copilot encountered an error while responding.",
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

  return (
    <section className="ui-card flex h-[460px] flex-col p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="ui-kicker">Assistant</p>
          <h3 className="text-base font-semibold text-white">AI Copilot</h3>
        </div>
        {context && (
          <p className="text-[11px] text-slate-400">
            Context:
            {context.marketId && " Market"}
            {context.agentId && " Agent"}
            {context.vaultId && " Vault"}
          </p>
        )}
      </header>

      <div
        ref={scrollRef}
        className="ui-card-soft flex-1 space-y-3 overflow-y-auto p-3"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-400">
            Ask about pricing signals, strategy setup, risk scoring, or
            governance mechanics.
          </p>
        )}

        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              message.role === "user"
                ? "ml-auto border border-cyan-300/20 bg-cyan-400/15 text-cyan-100"
                : "border border-white/10 bg-slate-950/40 text-slate-100"
            }`}
          >
            {message.content}
          </article>
        ))}

        {isSending && (
          <div className="px-1">
            <LoadingSpinner label="Generating response..." size="sm" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          disabled={isSending}
          placeholder="Ask the copilot..."
          className="ui-textarea min-h-[64px] flex-1"
          aria-label="Copilot chat input"
        />

        {!isSending ? (
          <button
            type="button"
            onClick={() => void sendMessage()}
            className="ui-btn ui-btn-primary h-[42px]"
          >
            Send
          </button>
        ) : (
          <button
            type="button"
            onClick={cancel}
            className="ui-btn ui-btn-secondary h-[42px]"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
