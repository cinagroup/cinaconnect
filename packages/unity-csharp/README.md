# OnChainUX Unity SDK

Self-hosted wallet connection toolkit for Unity games and apps. Complete replacement for Reown/WalletConnect infrastructure.

## Installation

### Via UPM (Unity Package Manager)

Add to your `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.onchainux.sdk": "https://github.com/hainai/onchainux.git?path=packages/unity-csharp"
  }
}
```

### Manual

1. Copy `packages/unity-csharp` into your Unity project's `Assets/Plugins/OnChainUX` folder.
2. Add `com.unity.nuget.newtonsoft-json` via Package Manager.

## Quick Start

```csharp
using OnChainUX;

// 1. Add OnChainUXManager to your scene (via Menu > Window > OnChainUX > Configuration)
//    or create programmatically:

var manager = OnChainUXManager.Instance;
manager.Initialize("YOUR_PROJECT_ID", new AppMetadata(
    name: "My Unity Game",
    description: "A blockchain game",
    url: "https://mygame.com"
));

// 2. Connect to a wallet
var result = await manager.ConnectAsync("metamask");

// 3. Sign a message
var signature = await manager.SignMessageAsync("Hello from Unity!");

// 4. Send a transaction
var tx = new TransactionRequest { From = result.Accounts[0], To = "0x...", Value = "0x1" };
var txHash = await manager.SendTransactionAsync(tx);
```

## API Reference

### OnChainUXManager

Unity singleton managing wallet connections. Matches `Connector` + `SessionManager` from the core SDK.

```csharp
// Properties
OnChainUXManager.Instance.Status      // ConnectionStatus
OnChainUXManager.Instance.Accounts    // string[]
OnChainUXManager.Instance.ChainId     // int
OnChainUXManager.Instance.IsConnected  // bool

// Events
OnChainUXManager.Instance.OnStateChanged += (state) => { ... };
OnChainUXManager.Instance.OnWalletConnected += (result) => { ... };
OnChainUXManager.Instance.OnWalletDisconnected += () => { ... };
OnChainUXManager.Instance.OnChainChangedEvent += (chainId) => { ... };
OnChainUXManager.Instance.OnErrorEvent += (error) => { ... };
```

### ConnectButton (UI)

UGUI-compatible connect button. Attach to a GameObject with Button + Text components.

```csharp
var button = gameObject.AddComponent<ConnectButton>();
button.OnConnectRequested += () => ConnectWallet();
button.OnConnectedClick += () => ShowWalletMenu();
```

### ConnectModal (UI)

Wallet selection modal.

```csharp
var modal = GetComponent<ConnectModal>();
modal.Show(WalletRegistry.GetAll());
modal.OnWalletSelected += (wallet) => ConnectWallet(wallet.Id);
modal.OnClosed += () => Debug.Log("Modal closed");
```

### EvmAdapter

EVM chain interactions using Nethereum.

```csharp
var evm = new EvmAdapter("https://eth.llamarpc.com", 1);
var balance = await evm.GetBalanceAsync("0x...");
var txHash = await evm.SendTransactionAsync(tx);
```

### SolanaAdapter

Solana chain interactions using Solana.Unity-SDK.

```csharp
var solana = new SolanaAdapter();
var balance = await solana.GetBalanceAsync("7EcD...");
```

### SIWE

Sign-In with Ethereum (EIP-4361).

```csharp
var message = SIWE.GenerateMessage(new SIWEParams
{
    Domain = "mygame.com",
    Address = "0x...",
    Uri = "https://mygame.com",
    ChainId = 1,
    Nonce = SIWE.GenerateNonce(),
    IssuedAt = SIWE.GenerateTimestamp()
});
```

### WalletRegistry

Registry of 16+ supported wallets.

```csharp
var all = WalletRegistry.GetAll();
var evm = WalletRegistry.GetForChain("eip155:1");
WalletRegistry.Register(customWallet);
```

## Supported Wallets

| Wallet | iOS | Android | Chains |
|--------|-----|---------|--------|
| MetaMask | ✅ | ✅ | EVM |
| Rainbow | ✅ | ✅ | EVM |
| Coinbase Wallet | ✅ | ✅ | EVM |
| Trust Wallet | ✅ | ✅ | EVM |
| Phantom | ✅ | ✅ | Solana + EVM |
| Zerion | ✅ | ✅ | EVM |
| Rabby | ✅ | ✅ | EVM |
| Safe{Wallet} | ✅ | ✅ | EVM |
| Ledger Live | ✅ | ✅ | Multi |
| Exodus | ✅ | ✅ | Multi |
| TokenPocket | ✅ | ✅ | EVM |
| imToken | ✅ | ✅ | EVM |
| OKX Wallet | ✅ | ✅ | Multi |
| Bitget Wallet | ✅ | ✅ | Multi |
| Uniswap Wallet | ✅ | ✅ | EVM |
| WalletConnect | ✅ | ✅ | Multi |

## Architecture

| Unity SDK | TypeScript core-sdk |
|-----------|---------------------|
| `OnChainUXManager` | `Connector` + `SessionManager` |
| `WalletManager` | `Connector` |
| `EvmAdapter` | `EvmAdapter` |
| `SolanaAdapter` | `SolanaChainAdapter` |
| `SIWE` | `generateMessage` / `parseMessage` |
| `DeepLinkHandler` | `links` module |
| `WalletRegistry` | `WALLET_DEEP_LINKS` |

## Requirements

- Unity 2022.3 or later
- Newtonsoft.Json (UPM package)
- Nethereum (optional, for EVM chain interactions)
- Solana.Unity-SDK (optional, for Solana chain interactions)

## License

MIT
