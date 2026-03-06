"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractAddresses, sendContractTx, toWeiAmount } from "../lib/evmTx";

export interface Oracle {
  oracleId: string;
  address: string;
  active: boolean;
  stake: number;
  metadataUri: string;
}

export interface RegisterOracleInput {
  oracleId: string;
  metadataUri: string;
}

export interface StakeOracleInput {
  amount: number;
}

export interface SubmitOutcomeInput {
  marketId: string;
  marketAddress: string;
  outcome: "YES" | "NO";
}

const ORACLE_REGISTRY_ABI = [
  "function registerOracle(bytes32 oracleId, string metadataURI)",
];

const ORACLE_STAKING_ABI = ["function stake() payable"];

const ORACLE_CONSENSUS_ABI = [
  "function submitOutcome(address market, bool outcome)",
];

export function useOracles() {
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOracles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oracles", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch oracles");
      }
      const data = (await res.json()) as { oracles?: Oracle[] };
      setOracles(Array.isArray(data.oracles) ? data.oracles : []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOracles();
  }, [fetchOracles]);

  const registerOracle = useCallback(
    async (input: RegisterOracleInput) => {
      setIsMutating(true);
      setError(null);
      try {
        const oracleId = input.oracleId.trim();
        if (!oracleId) {
          throw new Error("oracleId is required");
        }
        const metadataUri = input.metadataUri.trim();
        if (!metadataUri) {
          throw new Error("metadataUri is required");
        }

        const txHash = await sendContractTx({
          address: contractAddresses.oracleRegistry,
          abi: ORACLE_REGISTRY_ABI,
          functionName: "registerOracle",
          args: [ethers.id(oracleId), metadataUri],
          label: "OracleRegistry",
        });

        const res = await fetch("/api/oracles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REGISTER_ORACLE",
            payload: {
              oracleId,
              metadataUri,
              txHash,
            },
          }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        await fetchOracles();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchOracles]
  );

  const stakeOracle = useCallback(
    async (input: StakeOracleInput) => {
      setIsMutating(true);
      setError(null);
      try {
        const amountWei = toWeiAmount(input.amount);
        const txHash = await sendContractTx({
          address: contractAddresses.oracleStaking,
          abi: ORACLE_STAKING_ABI,
          functionName: "stake",
          args: [],
          valueWei: amountWei,
          label: "OracleStaking",
        });

        const res = await fetch("/api/oracles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "STAKE_ORACLE",
            payload: {
              amount: amountWei.toString(),
              txHash,
            },
          }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        await fetchOracles();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchOracles]
  );

  const submitOutcome = useCallback(
    async (input: SubmitOutcomeInput) => {
      setIsMutating(true);
      setError(null);
      try {
        const txHash = await sendContractTx({
          address: contractAddresses.oracleConsensus,
          abi: ORACLE_CONSENSUS_ABI,
          functionName: "submitOutcome",
          args: [input.marketAddress, input.outcome === "YES"],
          label: "OracleConsensus",
        });

        const res = await fetch("/api/oracles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUBMIT_OUTCOME",
            payload: {
              marketId: input.marketId,
              outcome: input.outcome,
              txHash,
            },
          }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  return {
    oracles,
    isLoading,
    isMutating,
    error,
    refetch: fetchOracles,
    registerOracle,
    stakeOracle,
    submitOutcome,
  };
}
