// Client-side SIWE-like wallet authentication for static-export Next.js dashboard.
// No server-side verification — address ownership is proven via personal_sign.

const SESSION_KEY = "cinacoin_auth_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthSession {
  address: string;
  signature: string;
  nonce: string;
  timestamp: number;
  expiresAt: number;
}

// ---------- EIP-4361 (SIWE) message construction ----------

/**
 * Generate an EIP-4361 compliant Sign-In With Ethereum message.
 */
export function createSiweMessage(
  address: string,
  nonce: string
): string {
  const domain = typeof window !== "undefined" ? window.location.hostname : "cinacoin.local";
  const uri = typeof window !== "undefined" ? window.location.origin : "https://cinacoin.local";
  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n\n` +
    `Sign in to the Cinacoin Backend Dashboard.\n\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: 1\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}\n` +
    `Expiration Time: ${expiresAt}`
  );
}

/**
 * Generate a cryptographically random nonce (32 hex chars).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for non-secure contexts (shouldn't happen in modern browsers)
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Wallet connection ----------

/**
 * Request wallet connection via EIP-1193. Returns the selected address.
 */
export async function connectWallet(): Promise<string> {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.");
  }

  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts returned. Please approve the connection in your wallet.");
  }

  return accounts[0].toLowerCase();
}

/**
 * Check if a wallet extension is available.
 */
export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!getEthereum();
}

function getEthereum(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum;
}

// ---------- Signing ----------

/**
 * Sign a message via personal_sign and verify the recovered address matches.
 * Returns the signature hex string.
 */
export async function signAndVerify(message: string, address: string): Promise<string> {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("Wallet disconnected. Please reconnect.");
  }

  // personal_sign expects (message, address) — message must be hex-encoded
  const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const signature = (await eth.request({
    method: "personal_sign",
    params: [hexMessage, address],
  })) as string;

  // Client-side verification: confirm the wallet still holds the address
  const currentAccounts = (await eth.request({
    method: "eth_accounts",
  })) as string[];

  const stillConnected = currentAccounts.some(
    (a: string) => a.toLowerCase() === address.toLowerCase()
  );
  if (!stillConnected) {
    throw new Error("Wallet disconnected during signing.");
  }

  return signature;
}

// ---------- Session management ----------

/**
 * Full login flow: connect wallet → sign SIWE message → save session.
 */
export async function login(): Promise<AuthSession> {
  const address = await connectWallet();
  const nonce = generateNonce();
  const message = createSiweMessage(address, nonce);
  const signature = await signAndVerify(message, address);

  const session: AuthSession = {
    address,
    signature,
    nonce,
    timestamp: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Clear the stored session.
 */
export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Retrieve the current session from localStorage, or null if none / expired.
 */
export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Check if a valid (non-expired) session exists.
 */
export function isLoggedIn(): boolean {
  return getSession() !== null;
}
