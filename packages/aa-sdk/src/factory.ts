/**
 * SmartAccountFactory — Account factory for deploying smart accounts on-chain.
 *
 * Uses viem to interact with the factory contract and deploy
 * new smart accounts via the ERC-4337 entry point.
 */

import {
  type Address,
  type Hex,
  type Chain,
  type Account,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  concat,
  pad,
  toHex,
  createPublicClient,
  http,
  type WalletClient,
} from 'viem';
import type { FactoryConfig } from './types.js';

// Factory contract ABI for deployment
const FACTORY_ABI = [
  {
    name: 'createAccount',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: 'account', type: 'address' }],
  },
  {
    name: 'getAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ name: 'account', type: 'address' }],
  },
] as const;

export class SmartAccountFactory {
  readonly config: FactoryConfig;
  private deployedAccounts = new Map<Address, boolean>();
  private publicClient: ReturnType<typeof createPublicClient>;
  private chain?: Chain;

  constructor(config: FactoryConfig & { rpcUrl: string; chain?: Chain }) {
    this.config = config;
    this.chain = config.chain;
    this.publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl ?? 'http://127.0.0.1:8545'),
    });
  }

  /**
   * Compute the address for a new account without deploying it.
   *
   * If the factory is already deployed on-chain, this reads from the
   * contract. Otherwise falls back to local derivation.
   */
  async computeAddress(
    owner: Address,
    salt?: bigint,
  ): Promise<Address> {
    const nonce = salt ?? this.config.saltNonce ?? 0n;

    try {
      // Try reading from the deployed factory contract
      const address = await this.publicClient.readContract({
        address: this.config.address,
        abi: FACTORY_ABI,
        functionName: 'getAddress',
        args: [owner, nonce],
      });
      return address as Address;
    } catch {
      // Fall back to local derivation
      return this.deriveAddressLocally(owner, nonce);
    }
  }

  /**
   * Deploy a new smart account via the factory contract.
   *
   * Returns the deployed address and the transaction hash.
   * Requires a deployer wallet client with an account to send the
   * deployment transaction.
   */
  async deploy(
    deployer: WalletClient<ReturnType<typeof http>, Chain, Account>,
    owner: Address,
    salt?: bigint,
  ): Promise<{ address: Address; hash: Hex }> {
    const nonce = salt ?? this.config.saltNonce ?? 0n;

    const txHash = await deployer.writeContract({
      address: this.config.address,
      abi: FACTORY_ABI,
      functionName: 'createAccount',
      args: [owner, nonce],
      chain: this.chain,
      account: deployer.account,
    });

    // Wait for the transaction to be mined using the public client
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Extract the deployed account address from logs
    const deployedAddress = receipt.logs[0]?.address as Address;

    this.deployedAccounts.set(deployedAddress, true);

    return {
      address: deployedAddress,
      hash: txHash,
    };
  }

  /**
   * Check if an account has been deployed (local cache).
   * For on-chain verification, check the entry point.
   */
  isDeployed(address: Address): boolean {
    return this.deployedAccounts.get(address) ?? false;
  }

  /**
   * Check on-chain whether an account is deployed by reading its code.
   */
  async isDeployedOnChain(address: Address): Promise<boolean> {
    try {
      const code = await this.publicClient.getCode({ address });
      return code !== undefined && code !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Get the factory entry point address.
   */
  getEntryPoint(): Address {
    return this.config.entryPoint;
  }

  // ── Private helpers ───────────────────────────────────────────

  private deriveAddressLocally(owner: Address, salt: bigint): Address {
    const input = concat([
      pad(this.config.address, { size: 20 }),
      pad(owner, { size: 20 }),
      pad(toHex(salt), { size: 32 }),
    ]);
    const hash = keccak256(input);
    return ('0x' + hash.slice(-40)) as Address;
  }
}
