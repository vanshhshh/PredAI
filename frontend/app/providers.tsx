"use client";

import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { polygon } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

import { DEFAULT_CHAIN_ID } from "../lib/constants";

const amoyRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://rpc-amoy.polygon.technology";
const polygonAmoy = {
  id: 80002,
  name: "Polygon Amoy",
  network: "polygon-amoy",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: {
    default: { http: [amoyRpcUrl] },
    public: { http: [amoyRpcUrl] },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
} as const;

const activeChain = DEFAULT_CHAIN_ID === polygon.id ? polygon : (polygonAmoy as any);

const { chains, publicClient, webSocketPublicClient } =
  configureChains([activeChain], [publicProvider()]);

const walletConnectProjectIdRaw =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ||
  "";
const walletConnectProjectId = /^[a-f0-9]{32}$/i.test(walletConnectProjectIdRaw)
  ? walletConnectProjectIdRaw
  : "";

const connectors = [
  new MetaMaskConnector({ chains }),
  ...(walletConnectProjectId
    ? [
        new WalletConnectConnector({
          chains,
          options: {
            projectId: walletConnectProjectId,
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>;
}
