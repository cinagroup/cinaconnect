/**
 * @cinaconnect/unity-csharp
 * TypeScript type definitions for the Unity C# SDK.
 * Maps to the Runtime/OnChainUX.cs and related C# classes.
 */

export interface UnityWalletConfig {
  chainId: number
  rpcUrl: string
}

export interface UnityTransaction {
  to: string
  value: string
  data: string
  gasLimit: number
}

export interface UnityConnectionResult {
  address: string
  chainId: number
  connected: boolean
}

export declare function Connect(config: UnityWalletConfig): Promise<UnityConnectionResult>
export declare function Disconnect(): Promise<void>
export declare function SignTransaction(tx: UnityTransaction): Promise<string>
