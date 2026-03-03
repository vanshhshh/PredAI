"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useConnect, useDisconnect, useSignMessage } from "wagmi";

import { useWallet } from "@/hooks/useWallet";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  WalletProvider,
  normalizeAddress,
  normalizeUsername,
  validateUsername,
} from "@/lib/identity";

export const dynamic = "force-dynamic";

type WalletChallengeResponse = {
  message: string;
  challenge_token: string;
};

type UsernameAvailabilityResponse = {
  available: boolean;
  username: string;
};

type UsersResolveResponse = {
  usernames: Record<string, string>;
};

type UserProfileResponse = {
  address: string;
  username: string | null;
};

type PendingIdentity = {
  address: string;
  walletProvider: WalletProvider;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: Eip1193Provider[];
};

function parseApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybeError = payload as { error?: unknown; detail?: unknown };
  if (typeof maybeError.error === "string" && maybeError.error.trim()) {
    return maybeError.error.trim();
  }
  if (typeof maybeError.detail === "string" && maybeError.detail.trim()) {
    return maybeError.detail.trim();
  }
  return null;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;
    return parseApiError(payload) ?? fallback;
  } catch {
    return fallback;
  }
}

function getInjectedEthereumProviders(): Eip1193Provider[] {
  if (typeof window === "undefined") return [];
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) return [];
  if (Array.isArray(ethereum.providers)) {
    return ethereum.providers;
  }
  return [ethereum];
}

function getPhantomProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const phantomEthereum = (window as Window & { phantom?: { ethereum?: Eip1193Provider } }).phantom
    ?.ethereum;
  if (phantomEthereum) {
    return phantomEthereum;
  }
  return getInjectedEthereumProviders().find((provider) => Boolean(provider.isPhantom)) ?? null;
}

function parseChainId(chainIdHex: unknown): number | undefined {
  if (typeof chainIdHex !== "string" || !chainIdHex.trim()) return undefined;
  const value = Number.parseInt(chainIdHex, 16);
  return Number.isFinite(value) ? value : undefined;
}

function extractConnectedAddress(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const maybe = result as { account?: unknown; accounts?: unknown };
  if (typeof maybe.account === "string" && maybe.account.trim()) {
    return maybe.account.trim();
  }
  if (Array.isArray(maybe.accounts) && typeof maybe.accounts[0] === "string") {
    return maybe.accounts[0].trim();
  }
  return null;
}

function extractConnectedChainId(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  const maybe = result as { chain?: { id?: unknown } };
  return typeof maybe.chain?.id === "number" ? maybe.chain.id : undefined;
}

async function signMessageWithProvider(
  provider: Eip1193Provider,
  message: string,
  address: string
): Promise<string> {
  try {
    const signature = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });
    if (typeof signature !== "string" || !signature.trim()) {
      throw new Error("Invalid signature response");
    }
    return signature;
  } catch {
    const fallback = await provider.request({
      method: "personal_sign",
      params: [address, message],
    });
    if (typeof fallback !== "string" || !fallback.trim()) {
      throw new Error("Invalid signature response");
    }
    return fallback;
  }
}

export default function SignInPage() {
  const router = useRouter();
  const {
    isConnected,
    username: storedUsername,
    setExternalWallet,
    setUsername,
    disconnect: disconnectWalletSession,
  } = useWallet();

  const { connectAsync, connectors } = useConnect();
  const { disconnect: disconnectWagmi } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [activeProvider, setActiveProvider] = useState<WalletProvider | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [pendingIdentity, setPendingIdentity] = useState<PendingIdentity | null>(null);

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  useEffect(() => {
    if (isConnected && storedUsername) {
      router.replace("/dashboard");
    }
  }, [isConnected, router, storedUsername]);

  const isBusy = activeProvider !== null || isAuthenticating;

  const fetchExistingUsername = useCallback(async (address: string): Promise<string | null> => {
    const response = await fetch("/api/users/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [address] }),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as UsersResolveResponse;
    return payload.usernames?.[address] ?? null;
  }, []);

  const authenticateWallet = useCallback(
    async ({
      address,
      chainId,
      walletProvider,
      signMessage,
    }: {
      address: string;
      chainId?: number;
      walletProvider: WalletProvider;
      signMessage: (message: string) => Promise<string>;
    }) => {
      const normalizedAddress = normalizeAddress(address);
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: normalizedAddress,
          chainId,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });

      if (!challengeResponse.ok) {
        throw new Error(await readApiError(challengeResponse, "Failed to create wallet challenge"));
      }

      const challenge = (await challengeResponse.json()) as WalletChallengeResponse;
      const signature = await signMessage(challenge.message);

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: normalizedAddress,
          signature,
          message: challenge.message,
          challengeToken: challenge.challenge_token,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(await readApiError(verifyResponse, "Wallet verification failed"));
      }

      setExternalWallet(normalizedAddress, walletProvider);

      const existingUsername = await fetchExistingUsername(normalizedAddress);
      if (existingUsername) {
        const normalizedExisting = normalizeUsername(existingUsername);
        setUsernameInput(normalizedExisting);
        setUsernameAvailable(true);
        setUsernameError(null);
      } else {
        setUsernameInput("");
        setUsernameAvailable(null);
        setUsernameError(null);
      }

      setPendingIdentity({
        address: normalizedAddress,
        walletProvider,
      });
    },
    [fetchExistingUsername, setExternalWallet]
  );

  const connectWithConnector = useCallback(
    async (walletProvider: WalletProvider, connectorNameHint: string) => {
      const connector = connectors.find((item) =>
        item.name.toLowerCase().includes(connectorNameHint.toLowerCase())
      );
      if (!connector) {
        setConnectionError(`${connectorNameHint} connector is not configured.`);
        return;
      }

      setActiveProvider(walletProvider);
      setConnectionError(null);
      setIsAuthenticating(true);

      try {
        const result = await connectAsync({ connector });
        const address = extractConnectedAddress(result);
        if (!address) {
          throw new Error("Wallet did not return an account");
        }
        const chainId = extractConnectedChainId(result);

        await authenticateWallet({
          address,
          chainId,
          walletProvider,
          signMessage: (message) => signMessageAsync({ message }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wallet connection failed";
        setConnectionError(message);
        disconnectWagmi();
      } finally {
        setIsAuthenticating(false);
        setActiveProvider(null);
      }
    },
    [authenticateWallet, connectAsync, connectors, disconnectWagmi, signMessageAsync]
  );

  const connectMetaMask = useCallback(async () => {
    await connectWithConnector("metamask", "metamask");
  }, [connectWithConnector]);

  const connectWalletConnect = useCallback(async () => {
    await connectWithConnector("walletconnect", "walletconnect");
  }, [connectWithConnector]);

  const connectPhantom = useCallback(async () => {
    setActiveProvider("phantom");
    setConnectionError(null);
    setIsAuthenticating(true);

    try {
      const provider = getPhantomProvider();
      if (!provider) {
        throw new Error("Phantom wallet is not installed");
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      if (!address) {
        throw new Error("Phantom did not return an account");
      }

      const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
      await authenticateWallet({
        address,
        chainId,
        walletProvider: "phantom",
        signMessage: (message) => signMessageWithProvider(provider, message, address),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Phantom connection failed";
      setConnectionError(message);
    } finally {
      setIsAuthenticating(false);
      setActiveProvider(null);
    }
  }, [authenticateWallet]);

  useEffect(() => {
    if (!pendingIdentity) return;

    const normalized = normalizeUsername(usernameInput);
    if (!normalized) {
      setUsernameAvailable(null);
      setUsernameError("Username is required");
      return;
    }

    const validationMessage = validateUsername(normalized);
    if (validationMessage) {
      setUsernameAvailable(null);
      setUsernameError(validationMessage);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const params = new URLSearchParams({
          username: normalized,
          address: pendingIdentity.address,
        });
        const response = await fetch(`/api/users/username-availability?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to validate username availability"));
        }

        const payload = (await response.json()) as UsernameAvailabilityResponse;
        if (payload.available) {
          setUsernameAvailable(true);
          setUsernameError(null);
        } else {
          setUsernameAvailable(false);
          setUsernameError("Username already taken");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Unable to validate username availability";
        setUsernameAvailable(null);
        setUsernameError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingUsername(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      setIsCheckingUsername(false);
    };
  }, [pendingIdentity, usernameInput]);

  const canSaveUsername = useMemo(() => {
    if (!pendingIdentity) return false;
    if (isCheckingUsername || isSavingUsername) return false;

    const normalized = normalizeUsername(usernameInput);
    if (!normalized) return false;
    if (validateUsername(normalized)) return false;
    return usernameAvailable === true;
  }, [isCheckingUsername, isSavingUsername, pendingIdentity, usernameAvailable, usernameInput]);

  const disconnectAllWalletState = useCallback(async () => {
    disconnectWagmi();
    await disconnectWalletSession();
    setPendingIdentity(null);
    setUsernameInput("");
    setUsernameAvailable(null);
    setUsernameError(null);
    setConnectionError(null);
    setActiveProvider(null);
    setIsAuthenticating(false);
  }, [disconnectWalletSession, disconnectWagmi]);

  const handleSaveUsername = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingIdentity) return;

      const normalized = normalizeUsername(usernameInput);
      const validationMessage = validateUsername(normalized);
      if (!normalized) {
        setUsernameError("Username is required");
        return;
      }
      if (validationMessage) {
        setUsernameError(validationMessage);
        return;
      }
      if (usernameAvailable !== true) {
        setUsernameError("Username already taken");
        return;
      }

      setIsSavingUsername(true);
      try {
        const response = await fetch("/api/users/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalized }),
        });

        if (!response.ok) {
          const errorMessage = await readApiError(response, "Failed to save username");
          if (errorMessage.includes("USERNAME_ALREADY_TAKEN")) {
            setUsernameAvailable(false);
            setUsernameError("Username already taken");
            return;
          }
          throw new Error(errorMessage);
        }

        const payload = (await response.json()) as UserProfileResponse;
        const savedUsername = normalizeUsername(payload.username ?? normalized);
        setUsername(savedUsername);
        setPendingIdentity(null);
        router.replace("/dashboard");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save username";
        setUsernameError(message);
      } finally {
        setIsSavingUsername(false);
      }
    },
    [pendingIdentity, router, setUsername, usernameAvailable, usernameInput]
  );

  const modalWalletLabel = pendingIdentity?.walletProvider ?? "";

  return (
    <>
      <main className="page-container flex min-h-[calc(100vh-3rem)] items-center justify-center py-10">
        <section className="ui-card w-full max-w-xl p-6 sm:p-8">
          <header className="text-center">
            <p className="ui-kicker">Wallet Authentication</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Connect To PredAI</h1>
            <p className="mt-2 text-sm text-slate-300">
              Wallet-only access. Choose MetaMask, Phantom, or WalletConnect.
            </p>
          </header>

          <div className="mt-8 grid gap-3">
            <WalletButton
              label="Connect MetaMask"
              hint="EVM wallet"
              onClick={() => void connectMetaMask()}
              disabled={isBusy}
              active={activeProvider === "metamask"}
              icon={<WalletGlyph label="MM" />}
            />
            <WalletButton
              label="Connect Phantom"
              hint="Phantom EVM"
              onClick={() => void connectPhantom()}
              disabled={isBusy}
              active={activeProvider === "phantom"}
              icon={<WalletGlyph label="PH" />}
            />
            <WalletButton
              label="Connect WalletConnect"
              hint="Mobile + desktop"
              onClick={() => void connectWalletConnect()}
              disabled={isBusy}
              active={activeProvider === "walletconnect"}
              icon={<WalletGlyph label="WC" />}
            />
          </div>

          {connectionError && <p className="mt-4 text-sm text-rose-300">{connectionError}</p>}

          <footer className="mt-7 text-center text-xs text-slate-400">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-cyan-200 hover:text-cyan-100">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-cyan-200 hover:text-cyan-100">
              Privacy Policy
            </Link>
            .
          </footer>
        </section>
      </main>

      {pendingIdentity && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <section className="ui-card z-[91] w-full max-w-md p-6">
            <p className="ui-kicker">Complete Profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Choose Your Username</h2>
            <p className="mt-2 text-sm text-slate-300">
              Connected with {modalWalletLabel}. Username is required to continue.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSaveUsername}>
              <div>
                <label htmlFor="username" className="ui-label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  className="ui-input"
                  autoComplete="off"
                  spellCheck={false}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder="your_username"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  3-20 chars, letters/numbers/underscore/hyphen only.
                </p>
                {isCheckingUsername && (
                  <p className="mt-2 text-xs text-cyan-200">Checking username availability...</p>
                )}
                {!isCheckingUsername && usernameAvailable === true && !usernameError && (
                  <p className="mt-2 text-xs text-emerald-200">Username is available</p>
                )}
                {usernameError && <p className="mt-2 text-xs text-rose-300">{usernameError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void disconnectAllWalletState()}
                  className="ui-btn ui-btn-secondary"
                  disabled={isSavingUsername}
                >
                  Disconnect Wallet
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
                  disabled={!canSaveUsername}
                >
                  {isSavingUsername ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function WalletButton({
  label,
  hint,
  onClick,
  icon,
  disabled,
  active,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled: boolean;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-cyan-300/45 bg-cyan-400/10"
          : "border-white/15 bg-white/5 hover:border-cyan-300/35 hover:bg-white/10"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/70">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">{label}</span>
          <span className="block text-xs text-slate-300">{hint}</span>
        </span>
      </span>
      <span className="text-xs font-medium text-cyan-200">{active ? "Connecting..." : "Select"}</span>
    </button>
  );
}

function WalletGlyph({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-[11px] font-semibold text-cyan-100">
      {label}
    </span>
  );
}
