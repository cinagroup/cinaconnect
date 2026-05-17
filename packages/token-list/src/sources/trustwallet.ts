import type { TokenInfo, TokenSource } from '../types.js';

const TRUST_WALLET_TOKENS_BASE =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

export interface TrustWalletOptions {
  baseUrl?: string;
}

/**
 * Trust Wallet token list source.
 * Fetches token data from the trustwallet/assets repository.
 */
export class TrustWalletSource implements TokenSource {
  readonly name = 'trustwallet';
  private baseUrl: string;

  constructor(options: TrustWalletOptions = {}) {
    this.baseUrl = options.baseUrl || TRUST_WALLET_TOKENS_BASE;
  }

  async fetch(chain = 'ethereum'): Promise<TokenInfo[]> {
    const url = `${this.baseUrl}/${chain}/tokenlist.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Trust Wallet token list error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.tokens.map((t: Record<string, unknown>) => ({
      address: t.contractAddress as string,
      chainId: t.decimals ? data.tokenChainId ?? 1 : 1,
      name: t.name as string,
      symbol: t.symbol as string,
      decimals: t.decimals as number,
      logoURI: t.logoURI as string | undefined,
      tags: ['trustwallet'],
      extensions: {
        chain,
      },
    }));
  }

  /**
   * Fetch token logo URI from Trust Wallet assets.
   */
  getLogoUri(chain: string, address: string): string {
    return `${this.baseUrl}/${chain}/${address.toLowerCase()}/logo.png`;
  }

  /**
   * Get the info URL for a token on Trust Wallet.
   */
  getInfoUrl(chain: string, address: string): string {
    return `${this.baseUrl}/${chain}/${address.toLowerCase()}/info.json`;
  }
}
