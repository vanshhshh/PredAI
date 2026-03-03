import { WalletProvider } from "./identity";

const STORAGE_KEY = "predai.identity";

export type IdentitySession = {
  address: string;
  walletProvider: WalletProvider;
  username?: string;
};

export function readIdentitySession(): IdentitySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IdentitySession;
    if (!parsed?.address || !parsed?.walletProvider) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeIdentitySession(session: IdentitySession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearIdentitySession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

