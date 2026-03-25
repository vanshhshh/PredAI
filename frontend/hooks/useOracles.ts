"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";

import {
  fetchOracles,
  registerOracleRecord,
  stakeOracleRecord,
  submitOracleOutcome,
} from "@/lib/api";
import { contractAddresses, sendContractTx, toWeiAmount } from "@/lib/evmTx";

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

const ORACLE_REGISTRY_ABI = ["function registerOracle(bytes32 oracleId, string metadataURI)"];
const ORACLE_STAKING_ABI = ["function stake() payable"];
const ORACLE_CONSENSUS_ABI = ["function submitOutcome(address market, bool outcome)"];

export function useOracles() {
  const queryClient = useQueryClient();
  const oraclesQuery = useQuery({
    queryKey: ["oracles"],
    queryFn: fetchOracles,
  });

  const registerOracleMutation = useMutation({
    mutationFn: async (input: RegisterOracleInput) => {
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

      return registerOracleRecord({
        oracleId,
        metadataUri,
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["oracles"] });
    },
  });

  const stakeOracleMutation = useMutation({
    mutationFn: async (input: StakeOracleInput) => {
      const amountWei = toWeiAmount(input.amount);
      const txHash = await sendContractTx({
        address: contractAddresses.oracleStaking,
        abi: ORACLE_STAKING_ABI,
        functionName: "stake",
        args: [],
        valueWei: amountWei,
        label: "OracleStaking",
      });

      return stakeOracleRecord({
        amount: amountWei.toString(),
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["oracles"] });
    },
  });

  const submitOutcomeMutation = useMutation({
    mutationFn: async (input: SubmitOutcomeInput) => {
      const txHash = await sendContractTx({
        address: contractAddresses.oracleConsensus,
        abi: ORACLE_CONSENSUS_ABI,
        functionName: "submitOutcome",
        args: [input.marketAddress, input.outcome === "YES"],
        label: "OracleConsensus",
      });

      return submitOracleOutcome({
        marketId: input.marketId,
        outcome: input.outcome,
        txHash,
      });
    },
  });

  const error =
    (registerOracleMutation.error as Error | null) ??
    (stakeOracleMutation.error as Error | null) ??
    (submitOutcomeMutation.error as Error | null) ??
    (oraclesQuery.error as Error | null) ??
    null;

  return {
    oracles: (oraclesQuery.data ?? []) as Oracle[],
    isLoading: oraclesQuery.isLoading,
    isMutating:
      registerOracleMutation.isPending || stakeOracleMutation.isPending || submitOutcomeMutation.isPending,
    error,
    refetch: oraclesQuery.refetch,
    registerOracle: registerOracleMutation.mutateAsync,
    stakeOracle: stakeOracleMutation.mutateAsync,
    submitOutcome: submitOutcomeMutation.mutateAsync,
  };
}
