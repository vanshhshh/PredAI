"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  compilePrompt as compilePromptRequest,
  fetchSocialFeeds,
  spawnSocialMarket,
  stakeSocialArgument,
} from "@/lib/api";

export interface SocialFeedItem {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore?: number;
  marketEligible?: boolean;
}

function getPollIntervalMs(): number | false {
  const raw = process.env.NEXT_PUBLIC_SOCIAL_POLL_INTERVAL_MS ?? "0";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : false;
}

export function useSocialFeeds() {
  const queryClient = useQueryClient();
  const feedsQuery = useQuery({
    queryKey: ["social", "feeds"],
    queryFn: fetchSocialFeeds,
    refetchInterval: getPollIntervalMs(),
  });

  const spawnMutation = useMutation({
    mutationFn: async (feedId: string) => spawnSocialMarket(feedId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["social", "feeds"] });
    },
  });

  const stakeMutation = useMutation({
    mutationFn: async (input: {
      argumentId: string;
      amount: number;
      walletAddress: string;
      txHash?: string;
    }) => stakeSocialArgument(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["social", "feeds"] });
    },
  });

  const compileMutation = useMutation({
    mutationFn: async (prompt: string) => compilePromptRequest(prompt),
  });

  const feeds = (feedsQuery.data ?? []) as unknown as SocialFeedItem[];
  const error =
    (spawnMutation.error as Error | null) ??
    (stakeMutation.error as Error | null) ??
    (compileMutation.error as Error | null) ??
    (feedsQuery.error as Error | null) ??
    null;

  return {
    feeds,
    argumentsFeed: feeds.filter(
      (feed) => typeof feed.signalScore === "number" && feed.signalScore > 0.5
    ),
    isLoading: feedsQuery.isLoading,
    isRefreshing: feedsQuery.isFetching && !feedsQuery.isLoading,
    isSpawning: spawnMutation.isPending || stakeMutation.isPending,
    isCompiling: compileMutation.isPending,
    pollIntervalMs: getPollIntervalMs() || 0,
    error,
    refetch: feedsQuery.refetch,
    spawnMarket: spawnMutation.mutateAsync,
    spawnMarketFromFeed: spawnMutation.mutateAsync,
    stakeOnArgument: (
      argumentId: string,
      amount: number,
      walletAddress: string,
      txHash?: string
    ) =>
      stakeMutation.mutateAsync({
        argumentId,
        amount,
        walletAddress,
        txHash,
      }),
    compilePrompt: compileMutation.mutateAsync,
  };
}
