import { createConfig, configureChains } from "wagmi";
import { polygon } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";

const { chains, publicClient } = configureChains(
  [polygon],
  [publicProvider()]
);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({
      chains,
    }),
  ],
  publicClient,
});


