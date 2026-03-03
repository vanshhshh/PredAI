"use client";

import React from "react";

interface TransakButtonProps {
  walletAddress?: string;
  amount?: string;
  className?: string;
}

function buildTransakUrl(walletAddress?: string, amount?: string): string | null {
  const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    apiKey,
    environment: "PRODUCTION",
    network: "polygon",
    cryptoCurrencyCode: "USDC",
    fiatCurrency: "USD",
  });

  if (walletAddress) {
    params.set("walletAddress", walletAddress);
  }
  if (amount) {
    params.set("fiatAmount", amount);
  }

  return `https://global.transak.com/?${params.toString()}`;
}

export function TransakButton({
  walletAddress,
  amount,
  className,
}: TransakButtonProps) {
  const url = buildTransakUrl(walletAddress, amount);
  const disabled = !url;

  return (
    <button
      type="button"
      className={className ?? "ui-btn ui-btn-secondary"}
      disabled={disabled}
      onClick={() => {
        if (!url) {
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      {disabled ? "On-ramp unavailable" : "Buy with Fiat"}
    </button>
  );
}
