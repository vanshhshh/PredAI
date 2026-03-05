import { createConfig, configureChains } from "wagmi";
import { polygon } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";

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

const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID?.trim() ?? "0");
const activeChain = configuredChainId === polygon.id ? polygon : (polygonAmoy as any);

const { chains, publicClient } = configureChains(
  [activeChain],
  [publicProvider()]
);

export const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: [
    new InjectedConnector({
      chains,
    }),
  ],
  publicClient,
});


