// File: frontend/components/Agent/NFTViewer.tsx

/**
 * PURPOSE
 * -------
 * NFT metadata viewer for an AI Agent.
 *
 * This component:
 * - displays the agent’s NFT identity
 * - fetches and renders IPFS-hosted metadata (image + attributes)
 * - degrades gracefully if metadata is unavailable
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Read-only
 * - No blockchain calls (URI already resolved upstream)
 * - Defensive rendering
 * - Production-safe async handling
 */

// File: frontend/components/Agent/NFTViewer.tsx

"use client";

import React, { useEffect, useState } from "react";
import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface NFTViewerProps {
  tokenId?: string;
  metadataUri?: string;
}

export function NFTViewer({
  tokenId,
  metadataUri,
}: NFTViewerProps) {
  const [metadata, setMetadata] =
    useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataUri) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(resolveIpfs(metadataUri))
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load metadata");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMetadata(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [metadataUri]);

  /* ------------------------------------------------------------------ */
  /* States                                                             */
  /* ------------------------------------------------------------------ */

  if (!metadataUri) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-lg p-5 text-sm text-gray-500 w-64">
        NFT metadata unavailable.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-lg p-6 w-64">
        <LoadingSpinner label="Loading NFT…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-lg p-5 text-sm text-red-400 w-64">
        {error}
      </div>
    );
  }

  if (!metadata) return null;

  /* ------------------------------------------------------------------ */
  /* Main                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="
        w-64
        rounded-2xl
        border border-white/5
        bg-gradient-to-br from-white/[0.06] to-white/[0.02]
        backdrop-blur-xl
        p-5
        space-y-4
        transition-all
        hover:border-indigo-500/30
        hover:shadow-lg
      "
    >
      {/* Image */}
      {metadata.image && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <img
            src={resolveIpfs(metadata.image)}
            alt={metadata.name || "Agent NFT"}
            className="
              w-full
              h-48
              object-cover
              transition-transform
              duration-300
              hover:scale-105
            "
          />
        </div>
      )}

      {/* Identity */}
      <div>
        <div className="text-base font-semibold tracking-tight">
          {metadata.name || `Agent #${tokenId}`}
        </div>

        {metadata.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-3">
            {metadata.description}
          </p>
        )}
      </div>

      {/* Attributes */}
      {metadata.attributes && metadata.attributes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {metadata.attributes.map((attr, idx) => (
            <div
              key={idx}
              className="
                px-2 py-1
                rounded-md
                text-[10px]
                bg-black/40
                border border-white/10
                text-gray-300
              "
            >
              <span className="text-gray-500 mr-1">
                {attr.trait_type}:
              </span>
              {attr.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

function resolveIpfs(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace(
      "ipfs://",
      "https://ipfs.io/ipfs/"
    );
  }
  return uri;
}
