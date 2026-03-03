"use client";

import React from "react";

interface SocialFeedItem {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore?: number;
  marketEligible?: boolean;
}

interface FeedMonitorProps {
  feeds: SocialFeedItem[];
  onSpawnMarket?: (feedId: string) => void;
}

export function FeedMonitor({ feeds, onSpawnMarket }: FeedMonitorProps) {
  if (!feeds?.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        No social feeds are being tracked right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feeds.map((item) => (
        <FeedCard key={item.id} item={item} onSpawnMarket={onSpawnMarket} />
      ))}
    </div>
  );
}

function FeedCard({
  item,
  onSpawnMarket,
}: {
  item: SocialFeedItem;
  onSpawnMarket?: (feedId: string) => void;
}) {
  const confidencePercent =
    item.signalScore !== undefined ? Math.round(item.signalScore * 100) : null;

  return (
    <article className="ui-card rounded-xl p-4">
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <SourceBadge source={item.source} />
          <span className="font-semibold text-slate-100">{item.author}</span>
        </div>
        <time>{new Date(item.timestamp).toLocaleTimeString()}</time>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-slate-100">{item.content}</p>

      {confidencePercent !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>AI Signal Confidence</span>
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
      )}

      {item.marketEligible && onSpawnMarket && (
        <button
          type="button"
          onClick={() => onSpawnMarket(item.id)}
          className="ui-btn ui-btn-primary mt-4"
        >
          Spawn Market From Signal
        </button>
      )}
    </article>
  );
}

function SourceBadge({ source }: { source: SocialFeedItem["source"] }) {
  const styles =
    source === "X"
      ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
      : source === "FARCASTER"
      ? "border-indigo-300/30 bg-indigo-400/15 text-indigo-100"
      : source === "ONCHAIN"
      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
      : "border-slate-300/30 bg-slate-400/15 text-slate-200";

  return <span className={`ui-badge ${styles}`}>{source}</span>;
}
