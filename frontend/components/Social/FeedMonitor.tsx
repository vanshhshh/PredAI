// File: frontend/components/Social/FeedMonitor.tsx

/**
 * PURPOSE
 * -------
 * Real-time social feed monitor for AI-agent–tracked signals.
 *
 * This component:
 * - renders live social items (e.g. X posts, on-chain social events)
 * - highlights AI-detected signals
 * - allows spawning markets from eligible feed items
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Read-only by default
 * - Action hooks injected via props
 * - Stream-safe (frequent updates)
 * - No platform-specific assumptions (X, Farcaster, etc.)
 */

"use client";

import React from "react";

interface SocialFeedItem {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore?: number; // 0..1, AI confidence
  marketEligible?: boolean;
}

interface FeedMonitorProps {
  feeds: SocialFeedItem[];
  onSpawnMarket?: (feedId: string) => void;
}

export function FeedMonitor({
  feeds,
  onSpawnMarket,
}: FeedMonitorProps) {
  if (!feeds || feeds.length === 0) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        No social feed activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feeds.map((item) => (
        <div
          key={item.id}
          className="border rounded-md p-3 space-y-2"
        >
          {/* Header */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {item.source} · {item.author}
            </span>
            <span>
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Content */}
          <div className="text-sm">{item.content}</div>

          {/* Signal */}
          {item.signalScore !== undefined && (
            <div className="text-xs text-gray-600">
              AI Signal Confidence:{" "}
              <strong>
                {(item.signalScore * 100).toFixed(0)}%
              </strong>
            </div>
          )}

          {/* Action */}
          {item.marketEligible && onSpawnMarket && (
            <button
              onClick={() => onSpawnMarket(item.id)}
              className="px-3 py-1 border rounded-md text-xs"
            >
              Spawn Market
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
