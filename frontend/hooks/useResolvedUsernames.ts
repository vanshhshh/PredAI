"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeAddress } from "@/lib/identity";

type ResolveResponse = {
  usernames: Record<string, string>;
};

const usernameCache = new Map<string, string>();

function buildAddressKey(addresses: Array<string | null | undefined>): string {
  const normalized = Array.from(
    new Set(
      addresses
        .filter((address): address is string => typeof address === "string" && address.trim().length > 0)
        .map((address) => normalizeAddress(address))
    )
  ).sort();
  return normalized.join("|");
}

export function useResolvedUsernames(addresses: Array<string | null | undefined>) {
  const addressKey = useMemo(() => buildAddressKey(addresses), [addresses]);

  const normalizedAddresses = useMemo(() => {
    if (!addressKey) return [] as string[];
    return addressKey.split("|").filter((address) => address.length > 0);
  }, [addressKey]);

  const [usernames, setUsernames] = useState<Record<string, string>>(() => {
    if (!normalizedAddresses.length) return {};
    const fromCache: Record<string, string> = {};
    for (const address of normalizedAddresses) {
      const cached = usernameCache.get(address);
      if (cached) {
        fromCache[address] = cached;
      }
    }
    return fromCache;
  });

  useEffect(() => {
    if (!normalizedAddresses.length) {
      setUsernames({});
      return;
    }

    const fromCache: Record<string, string> = {};
    const unresolved: string[] = [];

    for (const address of normalizedAddresses) {
      const cached = usernameCache.get(address);
      if (cached) {
        fromCache[address] = cached;
      } else {
        unresolved.push(address);
      }
    }

    setUsernames(fromCache);

    if (!unresolved.length) {
      return;
    }

    let isCancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/users/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: unresolved }),
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ResolveResponse;
        const nextMap: Record<string, string> = {};

        for (const [address, username] of Object.entries(payload.usernames ?? {})) {
          if (!username) continue;
          const normalizedAddress = normalizeAddress(address);
          usernameCache.set(normalizedAddress, username);
          nextMap[normalizedAddress] = username;
        }

        if (!isCancelled) {
          setUsernames((previous) => ({
            ...previous,
            ...nextMap,
          }));
        }
      } catch {
        // no-op
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [addressKey, normalizedAddresses]);

  return usernames;
}

