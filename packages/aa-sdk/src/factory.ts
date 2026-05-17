import type { FactoryConfig } from './types.js';

/**
 * SmartAccountFactory — Account factory for creating new smart accounts.
 */
export class SmartAccountFactory {
  readonly config: FactoryConfig;
  private deployedAccounts = new Map<string, boolean>();

  constructor(config: FactoryConfig) {
    this.config = config;
  }

  /**
   * Compute the address for a new account without deploying it.
   */
  computeAddress(owner: string, salt?: bigint): string {
    const nonce = salt ?? this.config.saltNonce ?? 0n;
    // Simplified address derivation
    const input = `${this.config.address}:${owner}:${nonce}`;
    const encoded = new TextEncoder().encode(input);
    let hash = 0;
    for (const byte of encoded) {
      hash = ((hash << 5) - hash + byte) | 0;
    }
    const hex = (hash >>> 0).toString(16).padStart(40, '0');
    return `0x${hex}`;
  }

  /**
   * Deploy a new smart account.
   * Returns the deployed address.
   */
  async deploy(
    owner: string,
    salt?: bigint,
  ): Promise<{ address: string; hash: string }> {
    const address = this.computeAddress(owner, salt);
    this.deployedAccounts.set(address, true);

    return {
      address,
      hash: `0xdeploy_${Date.now()}`,
    };
  }

  /**
   * Check if an account has been deployed.
   */
  isDeployed(address: string): boolean {
    return this.deployedAccounts.get(address) ?? false;
  }

  /**
   * Get the factory entry point address.
   */
  getEntryPoint(): string {
    return this.config.entryPoint;
  }
}
