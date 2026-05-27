# Cinacoin .NET SDK

[![NuGet](https://img.shields.io/nuget/v/Cinacoin.svg)](https://www.nuget.org/packages/Cinacoin)
[![NuGet Downloads](https://img.shields.io/nuget/dt/Cinacoin.svg)](https://www.nuget.org/packages/Cinacoin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Official .NET SDK for the Cinacoin wallet connectivity platform. Provides client interfaces for account management, transaction signing, session management, and multi-chain network operations.

> **⚠️ Important: Current Architecture**
>
> This .NET SDK is an **HTTP API client** — it communicates with the Cinacoin relay/proxy server over REST + WebSocket. It does **not** implement the native WalletConnect v2 protocol directly.
>
> - ✅ Account management, balance queries, transaction signing (via relay API)
> - ✅ WC v2 pairing URI generation and parsing (format utilities only)
> - ✅ Session proposal construction (wallet-side approval payloads)
> - ❌ **Not** a native WC protocol implementation — no direct X25519 DH, ChaCha20-Poly1305 encryption, or IRN relay routing
> - ❌ Messages through the relay are JSON-serialised but **not** encrypted on the wire in this release
>
> For comparison:
> | Platform | Protocol Implementation | Encryption |
> |----------|------------------------|------------|
> | iOS (Swift) | Native WC v2 via WalletConnectSwiftV2 SDK | ✅ ChaCha20-Poly1305 (CryptoKit) |
> | Android (Kotlin) | Native WC v2 via WalletConnectKotlin SDK | ✅ Handled by SDK |
> | Flutter (Dart) | HTTP relay API (with deep link integration) | ✅ Via relay server |
> | .NET (C#) | **HTTP relay API client** | ❌ Not encrypted (see limitations below) |
>
> See [Limitations](#limitations) for details and migration path.

## Installation

### Package Manager

```bash
dotnet add package Cinacoin
```

### .NET CLI

```bash
dotnet add package Cinacoin
```

### PackageReference

```xml
<PackageReference Include="Cinacoin" Version="1.0.0" />
```

## Quick Start

```csharp
using Cinacoin;
using Cinacoin.Services;

// Create and dispose the client properly (implements IAsyncDisposable)
await using var client = new CinacoinClient("YOUR_PROJECT_ID");
await using var walletService = new WalletService(client);

// List available networks
var networks = await walletService.GetNetworksAsync();
foreach (var network in networks)
{
    Console.WriteLine($"{network.Name} — Chain {network.ChainId}");
}

// Check balance
var balance = await walletService.GetTokenBalanceAsync("0xYourAddress...");
Console.WriteLine($"Balance: {balance} ETH");

// Create a wallet session (via HTTP relay)
var session = await walletService.CreateSessionAsync("walletconnect", "eip155");
Console.WriteLine($"Pairing URI: {session.Uri}");
```

## Usage

### Creating a Client

```csharp
// Basic
await using var client = new CinacoinClient("YOUR_PROJECT_ID");

// With custom API URL and logging
await using var client = new CinacoinClient(
    projectId: "YOUR_PROJECT_ID",
    baseUrl: "https://api.cinacoin.com",
    logger: logger); // Microsoft.Extensions.Logging.ILogger<CinacoinClient>
```

### Wallet Connection

```csharp
var connection = await client.ConnectAsync(new ConnectParams
{
    Chains = new[] { 1, 137, 10 }, // Ethereum, Polygon, Optimism
    Metadata = new AppMetadata
    {
        Name = "My DApp",
        Description = "An example decentralized application",
        Url = "https://example.com",
        Icons = new[] { "https://example.com/icon.png" }
    }
});

Console.WriteLine($"Connected! Session: {connection.SessionId}");
Console.WriteLine($"Accounts: {string.Join(", ", connection.Accounts)}");
```

### Getting Account Info

```csharp
var account = await client.GetAccountAsync("metamask");
Console.WriteLine($"Address: {account.Address}");
Console.WriteLine($"Chain ID: {account.ChainId}");
Console.WriteLine($"Balance:  {account.Balance}");
```

### Checking Balance

```csharp
// Default: Ethereum mainnet (chainId = "1")
var balance = await client.GetBalanceAsync("0xYourAddress...");

// Specify a different chain
var polygonBalance = await client.GetBalanceAsync(
    address: "0xYourAddress...",
    chainId: "137"); // Polygon
```

### Signing Messages

```csharp
// EIP-191 personal sign
var signature = await client.SignMessageAsync(
    address: "0xYourAddress...",
    message: "Sign in to My DApp");

// EIP-712 typed data
var typedSignature = await client.SignTypedDataAsync(
    address: "0xYourAddress...",
    typedData: "{ \"types\": {...}, \"domain\": {...}, \"message\": {...} }");
```

### Sending Transactions

```csharp
var tx = await client.SendTransactionAsync(new TransactionRequest
{
    From = "0xSender...",
    To = "0xReceiver...",
    Value = "0x0",             // Wei as hex
    Data = "0x...",            // Contract call data
    ChainId = 1                // Ethereum mainnet
});

Console.WriteLine($"Transaction hash: {tx.Hash}");
Console.WriteLine($"Status: {tx.Status}");
```

### Session Management

```csharp
// Create a session via HTTP relay
var session = await client.CreateSessionAsync("walletconnect", "eip155");

// Disconnect when done
await client.DisconnectAsync(session.SessionId);
```

### Proper Resource Cleanup

Both `CinacoinClient` and `WalletService` implement `IAsyncDisposable`:

```csharp
// Using statement (recommended)
await using var client = new CinacoinClient("YOUR_PROJECT_ID");
await using var walletService = new WalletService(client);
// Disposed automatically at scope exit

// Manual disposal
var client = new CinacoinClient("YOUR_PROJECT_ID");
try
{
    // ... use client
}
finally
{
    await client.DisposeAsync();
}
```

## Using WalletService

The `WalletService` provides a higher-level convenience wrapper:

```csharp
await using var client = new CinacoinClient("YOUR_PROJECT_ID");
await using var walletService = new WalletService(client);

// All client methods are available through the service
var networks = await walletService.GetNetworksAsync();
var balance = await walletService.GetTokenBalanceAsync("0x...");
var account = await walletService.GetAccountAsync("metamask");
```

## Building from Source

### Pack NuGet Package

```bash
cd packages/dotnet
./scripts/pack.sh
```

Packages are output to `nupkg/`.

### Publish to NuGet.org

```bash
NUGET_API_KEY=your-api-key ./scripts/publish.sh
```

### Run the Example

```bash
cd packages/dotnet/Example
dotnet run
```

## Supported Frameworks

| Target         | Supported |
| -------------- | --------- |
| .NET 8.0       | ✅        |
| .NET 7.0       | ✅        |
| .NET 6.0       | ✅        |
| .NET Core 3.1  | ✅        |
| .NET Standard  | —         |

## Dependencies

| Package                             | Version |
| ----------------------------------- | ------- |
| System.Text.Json                    | 8.0.5   |
| Microsoft.Extensions.Http           | 8.0.1   |
| Microsoft.Extensions.Logging.Abstractions | 8.0.2   |

## WalletConnect v2 Handshake

The SDK includes `WalletConnectV2Handshake` in `Cinacoin.Services` for
WC v2 pairing URI generation, parsing, topic derivation, and session
approval construction. These are **format-level utilities** — they produce
correct WC v2 URIs and payloads but do **not** implement the full protocol
(native DH key exchange, on-wire encryption, IRN relay routing).

```csharp
using Cinacoin.Services;

await using var handshake = new WalletConnectV2Handshake(
    projectId: "YOUR_PROJECT_ID",
    metadata: new AppMetadata
    {
        Name = "My DApp",
        Description = "An example decentralized application",
        Url = "https://example.com",
        Icons = new[] { "https://example.com/icon.png" }
    });

// Generate a pairing URI for QR display
var pairingUri = await handshake.CreatePairingAsync();
Console.WriteLine($"Scan this URI: {pairingUri}");

// Parse an incoming WC v2 URI
var components = WalletConnectV2Handshake.ParsePairingUri(pairingUri);
Console.WriteLine($"Topic: {components.Topic}");

// Derive a session topic from two public keys (SHA-256, not full DH)
var sessionTopic = WalletConnectV2Handshake.DeriveSessionTopic(
    myPublicKey: "aa...aa",    // our 64-char hex public key
    peerPublicKey: "bb...bb"  // peer's 64-char hex public key
);
```

### Limitations

The .NET SDK is an **HTTP API client**, not a native WalletConnect v2 protocol implementation. Key limitations:

| Feature | Status | Detail |
|---------|--------|--------|
| **HTTP API (REST + WebSocket)** | ✅ Implemented | All account, balance, tx operations go through the Cinacoin relay API |
| **WC v2 URI generation/parsing** | ✅ Implemented | `WcUriFormatter` produces correct WC v2 URIs |
| **Session topic derivation** | ✅ Implemented | SHA-256 over concatenated public keys |
| **Session approval construction** | ✅ Implemented | Wallet-side approval payload generation |
| **X25519 key exchange** | ⚠️ Placeholder | Uses ECDH P-256 (compilation-safe). For production X25519, add `BouncyCastle.Cryptography` and replace `GenerateKeyPair()`. |
| **ChaCha20-Poly1305 encryption** | ❌ Not included | Messages relayed through the server are JSON-serialised but **not encrypted** on the wire. Add encryption via `BouncyCastle.Cryptography` for authenticated confidentiality. |
| **IRN relay routing** | ❌ Not implemented | `RelayClient` connects to a relay WebSocket but does not implement the full IRN protocol (topic routing, store/forward, subscription management). |
| **Session key rotation** | ❌ Not implemented | |
| **History sync** | ❌ Not implemented | |

**What this means for you:**

1. **The SDK works** for account management, balance queries, and transaction signing through the Cinacoin relay API.
2. **Messages are not encrypted** on the wire in this release. The relay server handles the connection, but confidentiality relies on HTTPS/WSS transport-layer security only.
3. **For a full native WC v2 implementation** in .NET, consider:
   - Integrating the [`WalletConnectNet`](https://github.com/WalletConnect/WalletConnectNet) community library
   - Adding `BouncyCastle.Cryptography` for X25519 + ChaCha20-Poly1305
   - Waiting for an official WalletConnect .NET SDK release

**Production readiness checklist:**

```
[ ] Add BouncyCastle.Cryptography for proper X25519 key exchange
[ ] Implement ChaCha20-Poly1305 encryption for relay messages
[ ] Add IRN relay subscription management
[ ] Implement session key rotation
[ ] Add comprehensive integration tests against a production relay
```

## API Reference

### `CinacoinClient`

| Method                       | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `GetAccountAsync(walletId)`  | Get account info for a connected wallet      |
| `GetBalanceAsync(address)`   | Get native token balance for an address      |
| `GetNetworksAsync()`         | List available networks                      |
| `CreateSessionAsync(id, ns)` | Create a wallet session, returns pairing URI |
| `ConnectAsync(params)`       | Connect to a wallet with parameters          |
| `DisconnectAsync(sessionId)` | Disconnect an active session                 |
| `SendTransactionAsync(req)`  | Send a transaction for signing               |
| `SignMessageAsync(addr, msg)`| Sign a message (EIP-191)                     |
| `SignTypedDataAsync(addr, d)`| Sign typed data (EIP-712)                    |

### `WalletConnectV2Handshake`

| Method                         | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `GeneratePairingUri()`         | Generate a WC v2 pairing URI                   |
| `CreatePairingAsync()`         | Connect to relay, subscribe, return pairing URI|
| `ParsePairingUri(uri)`         | Parse a WC v2 URI into components              |
| `BuildSessionApproval(id,addr)`| Construct a session approval payload            |
| `DeriveSessionTopic(pk1, pk2)` | SHA-256 topic derivation from two public keys  |
| `SendRequestAsync<T>(m, p)`    | Send a JSON-RPC request over the session       |

## License

MIT — see [LICENSE](../../LICENSE).
