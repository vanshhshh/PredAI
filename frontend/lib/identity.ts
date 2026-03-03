export type WalletProvider = "metamask" | "walletconnect" | "phantom";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Use only letters, numbers, underscores, or hyphens";
  }
  return null;
}

export function shortenAddress(address: string): string {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatIdentity(
  address: string | undefined,
  username: string | undefined | null
): string {
  if (username && username.trim()) {
    return username;
  }
  if (!address) {
    return "Unknown";
  }
  return shortenAddress(address);
}

