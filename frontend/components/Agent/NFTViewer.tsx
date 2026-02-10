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

  // ------------------------------------------------------------------
  // LOAD METADATA
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  if (!metadataUri) {
    return (
      <div className="border rounded-md p-4 text-xs text-gray-500">
        No NFT metadata available.
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading NFT…" />;
  }

  if (error) {
    return (
      <div className="border rounded-md p-4 text-xs text-red-600">
        {error}
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  return (
    <div className="border rounded-md p-4 space-y-3 w-56">
      {metadata.image && (
        <img
          src={resolveIpfs(metadata.image)}
          alt={metadata.name || "Agent NFT"}
          className="w-full h-auto rounded"
        />
      )}

      <div>
        <div className="text-sm font-medium">
          {metadata.name || `Agent #${tokenId}`}
        </div>
        {metadata.description && (
          <p className="text-xs text-gray-600 mt-1">
            {metadata.description}
          </p>
        )}
      </div>

      {metadata.attributes && metadata.attributes.length > 0 && (
        <div className="space-y-1">
          {metadata.attributes.map((attr, idx) => (
            <div
              key={idx}
              className="text-xs text-gray-700"
            >
              <span className="font-medium">
                {attr.trait_type}:
              </span>{" "}
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
