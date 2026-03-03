"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useNetwork, useSignMessage } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBackendAuthed, setIsBackendAuthed] = useState(false);

  useEffect(() => {
    if (!isConnected || !address || isAuthenticating || isBackendAuthed) return;

    async function authenticate() {
      setIsAuthenticating(true);
      setAuthError(null);
      try {
        const challengeRes = await fetch("/api/auth/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            chainId: chain?.id,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
        });
        if (!challengeRes.ok) {
          throw new Error("Failed to generate wallet challenge");
        }
        const challenge = (await challengeRes.json()) as {
          message: string;
          challenge_token: string;
        };
        const signature = await signMessageAsync({ message: challenge.message });

        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            signature,
            message: challenge.message,
            challengeToken: challenge.challenge_token,
          }),
        });
        if (!verifyRes.ok) {
          throw new Error("Wallet signature verification failed");
        }
        setIsBackendAuthed(true);
      } catch (error: any) {
        setAuthError(error?.message ?? "Wallet authentication failed");
      } finally {
        setIsAuthenticating(false);
      }
    }

    void authenticate();
  }, [address, chain?.id, isAuthenticating, isBackendAuthed, isConnected, signMessageAsync]);

  if (isConnected) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={async () => {
            disconnect();
            setIsBackendAuthed(false);
            setAuthError(null);
            await fetch("/api/auth/logout", { method: "POST" });
          }}
          className="ui-btn ui-btn-secondary w-full justify-center"
        >
          {isAuthenticating ? "Verifying wallet..." : `Disconnect ${address?.slice(0, 6)}...`}
        </button>
        {authError && <p className="text-xs text-rose-300">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          type="button"
          onClick={() => connect({ connector })}
          className="ui-btn ui-btn-secondary w-full justify-center"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
