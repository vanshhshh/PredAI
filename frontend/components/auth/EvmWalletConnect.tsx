"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 border rounded"
      >
        Disconnect {address?.slice(0, 6)}…
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="px-4 py-2 border rounded w-full"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
