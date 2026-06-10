"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import EthereumProvider from "@walletconnect/ethereum-provider";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWallet } from "@/hooks/useWallet";
import {
  checkUsernameAvailability,
  requestWalletChallenge,
  resolveUsernames,
  updateMyProfile,
  verifyWallet,
  writeAccessToken,
} from "@/lib/api";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  WalletProvider,
  normalizeAddress,
  normalizeUsername,
  validateUsername,
} from "@/lib/identity";

export const dynamic = "force-dynamic";

type UsernameAvailabilityResponse = {
  available: boolean;
  username: string;
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

type WalletConnectProvider = Eip1193Provider & {
  disconnect?: () => Promise<void>;
};

const walletConnectProjectIdRaw =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ||
  "";
const walletConnectProjectId = /^[a-f0-9]{32}$/i.test(walletConnectProjectIdRaw)
  ? walletConnectProjectIdRaw
  : "";

function getInjectedEthereumProviders(): Eip1193Provider[] {
  if (typeof window === "undefined") return [];
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) return [];
  if (Array.isArray(ethereum.providers)) {
    return ethereum.providers;
  }
  return [ethereum];
}

function getMetaMaskProvider(): Eip1193Provider | null {
  const providers = getInjectedEthereumProviders();
  return (
    providers.find((provider) => Boolean(provider.isMetaMask) && !Boolean(provider.isPhantom)) ??
    null
  );
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

  const [activeProvider, setActiveProvider] = useState<WalletProvider | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [pendingIdentity, setPendingIdentity] = useState<PendingIdentity | null>(null);

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);
  const [phantomInstalled, setPhantomInstalled] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const walletConnectProviderRef = useRef<WalletConnectProvider | null>(null);

  useEffect(() => {
    if (isConnected && storedUsername) {
      router.replace("/dashboard");
    }
  }, [isConnected, router, storedUsername]);

  useEffect(() => {
    setMetamaskInstalled(Boolean(getMetaMaskProvider()));
    setPhantomInstalled(Boolean(getPhantomProvider()));
  }, []);

  const isBusy = activeProvider !== null || isAuthenticating;

  const fetchExistingUsername = useCallback(async (address: string): Promise<string | null> => {
    try {
      const payload = await resolveUsernames([address]);
      return payload.usernames?.[address] ?? null;
    } catch {
      return null;
    }
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
      const challenge = await requestWalletChallenge({
        address: normalizedAddress,
        chainId,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      const signature = await signMessage(challenge.message);
      const verification = await verifyWallet({
        address: normalizedAddress,
        signature,
        message: challenge.message,
        challengeToken: challenge.challenge_token,
      });

      writeAccessToken(verification.access_token);

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

  const connectMetaMask = useCallback(async () => {
    if (!acceptedLegal) {
      setConnectionError("Confirm eligibility before connecting.");
      return;
    }

    setActiveProvider("metamask");
    setConnectionError(null);
    setIsAuthenticating(true);

    try {
      const provider = getMetaMaskProvider();
      if (!provider) {
        throw new Error("MetaMask extension not found");
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      if (!address) {
        throw new Error("MetaMask did not return an account");
      }

      const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
      await authenticateWallet({
        address,
        chainId,
        walletProvider: "metamask",
        signMessage: (message) => signMessageWithProvider(provider, message, address),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "MetaMask connection failed";
      setConnectionError(message);
    } finally {
      setIsAuthenticating(false);
      setActiveProvider(null);
    }
  }, [acceptedLegal, authenticateWallet]);

  const connectWalletConnect = useCallback(async () => {
    if (!acceptedLegal) {
      setConnectionError("Confirm eligibility before connecting.");
      return;
    }

    if (!walletConnectProjectId) {
      setConnectionError("WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.");
      return;
    }

    setActiveProvider("walletconnect");
    setConnectionError(null);
    setIsAuthenticating(true);

    try {
      const provider = (await EthereumProvider.init({
        projectId: walletConnectProjectId,
        chains: [137],
        showQrModal: true,
        rpcMap: {
          137: process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://polygon-rpc.com",
        },
        metadata: {
          name: "MoltMarket",
          description: "Prediction markets on Polygon",
          url: typeof window !== "undefined" ? window.location.origin : "https://moltmarket.com",
          icons: [],
        },
      })) as WalletConnectProvider;
      walletConnectProviderRef.current = provider;

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
      if (!address) {
        throw new Error("WalletConnect did not return an account");
      }

      const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
      await authenticateWallet({
        address,
        chainId,
        walletProvider: "walletconnect",
        signMessage: (message) => signMessageWithProvider(provider, message, address),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "WalletConnect connection failed";
      setConnectionError(message);
    } finally {
      setIsAuthenticating(false);
      setActiveProvider(null);
    }
  }, [acceptedLegal, authenticateWallet]);

  const connectPhantom = useCallback(async () => {
    if (!acceptedLegal) {
      setConnectionError("Confirm eligibility before connecting.");
      return;
    }

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
  }, [acceptedLegal, authenticateWallet]);

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
        const payload = (await checkUsernameAvailability(normalized, pendingIdentity.address, controller.signal)) as UsernameAvailabilityResponse;
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
    await walletConnectProviderRef.current?.disconnect?.();
    walletConnectProviderRef.current = null;
    await disconnectWalletSession();
    setPendingIdentity(null);
    setUsernameInput("");
    setUsernameAvailable(null);
    setUsernameError(null);
    setConnectionError(null);
    setActiveProvider(null);
    setIsAuthenticating(false);
  }, [disconnectWalletSession]);

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
        const payload = await updateMyProfile(normalized);
        const savedUsername = normalizeUsername(payload.username ?? normalized);
        setUsername(savedUsername);
        setPendingIdentity(null);
        router.replace("/dashboard");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save username";
        if (message.includes("USERNAME_ALREADY_TAKEN")) {
          setUsernameAvailable(false);
          setUsernameError("Username already taken");
          return;
        }
        setUsernameError(message);
      } finally {
        setIsSavingUsername(false);
      }
    },
    [pendingIdentity, router, setUsername, usernameAvailable, usernameInput]
  );

  const modalWalletLabel = pendingIdentity?.walletProvider ?? "";
  const legalHint = acceptedLegal ? undefined : "Confirm eligibility first";

  return (
    <>
      <main className="page-container section-stack flex min-h-[calc(100vh-3rem)] items-center justify-center py-10">
        <section className="ui-card w-full max-w-xl p-6 sm:p-8">
          <header className="text-center">
            <h1 className="mt-2 text-3xl font-semibold text-white">Connect To MoltMarket</h1>
            <p className="mt-2 text-sm text-slate-300">
              Wallet-only access.
            </p>
          </header>

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm text-slate-200">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(event) => setAcceptedLegal(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
            />
            <span>
              I am 18+ and allowed to use this platform.
            </span>
          </label>

          <div className="mt-8 grid gap-3">
            <WalletButton
              label="Connect MetaMask"
              hint={legalHint ?? (metamaskInstalled ? "EVM wallet" : "Install MetaMask extension")}
              onClick={() => void connectMetaMask()}
              disabled={isBusy || !metamaskInstalled || !acceptedLegal}
              active={activeProvider === "metamask"}
              icon={<WalletGlyph label="MM" />}
            />
            <WalletButton
              label="Connect Phantom"
              hint={legalHint ?? (phantomInstalled ? "Phantom EVM" : "Install Phantom extension")}
              onClick={() => void connectPhantom()}
              disabled={isBusy || !phantomInstalled || !acceptedLegal}
              active={activeProvider === "phantom"}
              icon={<WalletGlyph label="PH" />}
            />
            <WalletButton
              label="Connect WalletConnect"
              hint={legalHint ?? (walletConnectProjectId ? "Mobile + desktop" : "Set WalletConnect project ID")}
              onClick={() => void connectWalletConnect()}
              disabled={isBusy || !walletConnectProjectId || !acceptedLegal}
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
