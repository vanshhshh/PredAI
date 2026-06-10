"use client";

import Image from "next/image";
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

export function NFTViewer({ tokenId, metadataUri }: NFTViewerProps) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
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

  if (!metadataUri) {
    return (
      <div className="w-64 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
        NFT metadata unavailable.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-64 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <LoadingSpinner label="Loading NFT..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!metadata) return null;

  return (
    <div className="w-64 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {metadata.image && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Image
            src={resolveIpfs(metadata.image)}
            alt={metadata.name || "Agent NFT"}
            width={256}
            height={192}
            unoptimized
            className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}

      <div>
        <div className="text-base font-semibold tracking-tight text-white">
          {metadata.name || `Agent #${tokenId}`}
        </div>

        {metadata.description && (
          <p className="mt-1 line-clamp-3 text-xs text-slate-400">{metadata.description}</p>
        )}
      </div>

      {metadata.attributes && metadata.attributes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {metadata.attributes.map((attr, idx) => (
            <div
              key={idx}
              className="rounded-md border border-white/10 bg-slate-950/30 px-2 py-1 text-[10px] text-slate-300"
            >
              <span className="mr-1 text-slate-500">{attr.trait_type}:</span>
              {attr.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function resolveIpfs(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}
