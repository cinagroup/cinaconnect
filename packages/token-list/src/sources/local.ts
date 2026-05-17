import type { TokenInfo, TokenSource, TokenList } from '../types.js';

export interface LocalSourceOptions {
  tokenList?: TokenList;
  tokens?: TokenInfo[];
}

/**
 * Local token list source.
 * Accepts a static TokenList or array of TokenInfo for custom tokens.
 */
export class LocalSource implements TokenSource {
  readonly name = 'local';
  private tokenList: TokenList;

  constructor(options: LocalSourceOptions = {}) {
    if (options.tokenList) {
      this.tokenList = options.tokenList;
    } else if (options.tokens) {
      this.tokenList = {
        name: 'Local Token List',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: options.tokens,
        timestamp: new Date().toISOString(),
      };
    } else {
      this.tokenList = {
        name: 'Empty Token List',
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async fetch(): Promise<TokenInfo[]> {
    return Promise.resolve(this.tokenList.tokens);
  }

  /**
   * Add a token to the local list.
   */
  addToken(token: TokenInfo): void {
    this.tokenList.tokens.push(token);
  }

  /**
   * Remove a token by address and chainId.
   */
  removeToken(address: string, chainId: number): boolean {
    const idx = this.tokenList.tokens.findIndex(
      (t) =>
        t.address.toLowerCase() === address.toLowerCase() &&
        t.chainId === chainId,
    );
    if (idx === -1) return false;
    this.tokenList.tokens.splice(idx, 1);
    return true;
  }

  /**
   * Get the full token list object.
   */
  getTokenList(): TokenList {
    return { ...this.tokenList };
  }

  /**
   * Merge another TokenList into this one.
   */
  merge(other: TokenList): void {
    const existing = new Set(
      this.tokenList.tokens.map(
        (t) => `${t.chainId}:${t.address.toLowerCase()}`,
      ),
    );
    for (const token of other.tokens) {
      const key = `${token.chainId}:${token.address.toLowerCase()}`;
      if (!existing.has(key)) {
        this.tokenList.tokens.push(token);
        existing.add(key);
      }
    }
  }
}
