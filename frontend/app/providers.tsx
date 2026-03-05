"use client";

import { WagmiConfig, createConfig, configureChains } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { polygon } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

const { chains, publicClient, webSocketPublicClient } =
  configureChains([polygon], [publicProvider()]);

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
