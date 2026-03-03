"use client";

import React, { useState } from "react";

import { Modal } from "../../../components/Shared/Modal";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useMarkets } from "../../../hooks/useMarkets";
import { useWallet } from "../../../hooks/useWallet";

export default function CreateMarketPage() {
  const { address, isConnected } = useWallet();
  const { createMarket, isCreating, error } = useMarkets();

  const [mode, setMode] = useState<"PROMPT" | "MANUAL">("PROMPT");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxExposure, setMaxExposure] = useState<number>(1000);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isConnected || !address) {
    return (
      <section className="page-container py-14">
        <CenteredMessage
          title="Connect your wallet"
          message="You must connect a wallet before creating a market."
        />
      </section>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);

    await createMarket({
      title: mode === "PROMPT" ? prompt : title,
      description,
      endTime: new Date(endTime).getTime(),
      maxExposure,
      metadata: mode === "PROMPT" ? prompt : undefined,
    });
  }

  const isFormValid =
    endTime &&
    maxExposure > 0 &&
    (mode === "PROMPT" ? prompt.length > 10 : title.length > 5);

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Market Deployment</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Create a Prediction Market</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Launch from a natural-language prompt or define structured market
          fields manually.
        </p>
      </header>

      <section className="ui-card p-5">
        <div className="flex flex-wrap gap-2">
          <ModeButton active={mode === "PROMPT"} onClick={() => setMode("PROMPT")}>
            Prompt Mode
          </ModeButton>
          <ModeButton active={mode === "MANUAL"} onClick={() => setMode("MANUAL")}>
            Manual Mode
          </ModeButton>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="ui-card space-y-6 p-5">
        {mode === "PROMPT" && (
          <div>
            <label htmlFor="market-prompt" className="ui-label">
              Market Prompt
            </label>
            <textarea
              id="market-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Will Bitcoin exceed 150k before June 2026?"
              className="ui-textarea"
            />
            <p className="mt-1 text-xs text-slate-400">
              The prompt is used as market title and metadata in this mode.
            </p>
          </div>
        )}

        {mode === "MANUAL" && (
          <>
            <Input
              id="market-title"
              label="Market Title"
              value={title}
              onChange={setTitle}
              placeholder="Will Ethereum ETF be approved in 2026?"
            />

            <TextArea
              id="market-description"
              label="Description"
              value={description}
              onChange={setDescription}
            />
          </>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id="market-end"
            label="End Date"
            type="datetime-local"
            value={endTime}
            onChange={setEndTime}
          />
          <Input
            id="market-exposure"
            label="Max Exposure"
            type="number"
            value={maxExposure}
            onChange={(value) => setMaxExposure(Number(value))}
          />
        </div>

        <PreviewCard
          title={mode === "PROMPT" ? prompt : title}
          endTime={endTime}
          exposure={maxExposure}
        />

        {error && <p className="text-sm text-rose-300">{error.message}</p>}

        <button
          type="submit"
          disabled={!isFormValid || isCreating}
          className="ui-btn ui-btn-primary w-full"
        >
          {isCreating ? "Deploying market..." : "Launch Market"}
        </button>
      </form>

      {showConfirm && (
        <Modal
          title="Confirm market launch"
          onClose={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirm()}
        >
          <p className="text-sm text-slate-200">
            Once deployed, this market becomes immutable and tradable.
          </p>
        </Modal>
      )}

      {isCreating && <LoadingSpinner label="Deploying market..." />}
    </main>
  );
}

function ModeButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-btn ${
        active ? "ui-btn-primary" : "ui-btn-secondary text-slate-200"
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="ui-input"
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="ui-textarea"
      />
    </div>
  );
}

function PreviewCard({
  title,
  endTime,
  exposure,
}: {
  title: string;
  endTime: string;
  exposure: number;
}) {
  if (!title) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
      <p className="ui-kicker">Market Preview</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-100">{title}</h3>
      <div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <p>Ends: {endTime || "Not set"}</p>
        <p>Max Exposure: {exposure}</p>
      </div>
    </section>
  );
}

function CenteredMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="ui-card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
    </div>
  );
}
