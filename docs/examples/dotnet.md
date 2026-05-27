# .NET SDK Example

> Use the Cinacoin .NET SDK in C# applications — wallet connectivity, transaction signing, session management, and multi-chain operations.

## Prerequisites

- .NET 8+ SDK
- A project ID from your Cinacoin dashboard

## Installation

```bash
# NuGet package
dotnet add package Cinacoin

# Or via Package Manager
Install-Package Cinacoin
```

## Quick Start

```csharp
using Cinacoin;
using Cinacoin.Models;

// Create a client
await using var client = new CinacoinClient("YOUR_PROJECT_ID");

// Use WalletService for high-level operations
await using var walletService = new WalletService(client);

// Get available networks
var networks = await walletService.GetNetworksAsync();
foreach (var network in networks)
{
    Console.WriteLine($"{network.Name} (Chain ID: {network.ChainId})");
}
```

## Complete Example

### 1. Full Client Workflow

```csharp
using System;
using System.Threading.Tasks;
using Cinacoin;
using Cinacoin.Models;
using Cinacoin.Services;
using Microsoft.Extensions.Logging;

namespace Cinacoin.Example;

public class Program
{
    public static async Task Main(string[] args)
    {
        // ─── Initialize the client ───
        await using var client = new CinacoinClient(
            projectId: "YOUR_PROJECT_ID",
            baseUrl: "https://api.cinacoin.com"
        );

        await using var walletService = new WalletService(client);

        // ─── Network Discovery ───
        Console.WriteLine("=== Available Networks ===");
        var networks = await walletService.GetNetworksAsync();
        foreach (var network in networks)
        {
            Console.WriteLine($"  {network.Name} (Chain ID: {network.ChainId})");
            Console.WriteLine($"    RPC: {network.RpcUrl}");
        }

        // ─── Balance Check ───
        Console.WriteLine("\n=== Balance Check ===");
        var address = "0x1234567890123456789012345678901234567890";
        var balance = await walletService.GetTokenBalanceAsync(address);
        Console.WriteLine($"  Balance for {address}: {balance} ETH");

        // ─── Account Info ───
        Console.WriteLine("\n=== Account Info ===");
        var account = await walletService.GetAccountAsync("metamask");
        Console.WriteLine($"  Address: {account.Address}");
        Console.WriteLine($"  Label:   {account.Label}");
        Console.WriteLine($"  Chain:   {account.ChainId}");

        // ─── Session Creation ───
        Console.WriteLine("\n=== Session Creation ===");
        var session = await walletService.CreateSessionAsync(
            walletId: "walletconnect",
            chainNamespace: "eip155"
        );
        Console.WriteLine($"  Session ID: {session.SessionId}");
        Console.WriteLine($"  URI:        {session.Uri}");

        // ─── Connect Wallet ───
        Console.WriteLine("\n=== Connecting ===");
        var connection = await walletService.ConnectAsync(new ConnectParams
        {
            Chains = new[] { 1, 137, 10 },
            Metadata = new AppMetadata
            {
                Name = "My DApp",
                Description = "An example dApp",
                Url = "https://example.com",
                Icons = new[] { "https://example.com/icon.png" }
            }
        });
        Console.WriteLine($"  Session ID: {connection.SessionId}");
        Console.WriteLine($"  Chain ID:   {connection.ChainId}");
        Console.WriteLine($"  Accounts:   {string.Join(", ", connection.Accounts)}");

        // ─── Sign a Message ───
        Console.WriteLine("\n=== Message Signing ===");
        var signature = await walletService.SignMessageAsync(
            connection.Accounts[0],
            "Hello, Cinacoin!"
        );
        Console.WriteLine($"  Signature: {signature.Substring(0, 20)}...");

        // ─── Send a Transaction ───
        Console.WriteLine("\n=== Transaction ===");
        var tx = await walletService.SendTransactionAsync(new TransactionRequest
        {
            From = connection.Accounts[0],
            To = "0x0000000000000000000000000000000000000001",
            Value = "0x0",
            Data = "0x"
        });
        Console.WriteLine($"  Hash:   {tx.Hash}");
        Console.WriteLine($"  Status: {tx.Status}");

        Console.WriteLine("\n=== Done! ===");
    }
}
```

### 2. Using the Relay Client Directly

```csharp
using Cinacoin;
using Cinacoin.Services;

// Direct relay client for low-level WebSocket operations
await using var relayClient = new RelayClient("wss://relay.cinacoin.com/v1");

// Connect to relay server
await relayClient.ConnectAsync();

// Send a message through the relay
await relayClient.SendMessageAsync("topic-123", new
{
    type = "session_propose",
    data = new { chains = new[] { "eip155:1", "eip155:137" } }
});

// Listen for incoming messages
relayClient.OnMessage += (sender, message) =>
{
    Console.WriteLine($"Received: {message.Topic}");
    Console.WriteLine($"Payload: {message.Payload}");
};
```

### 3. Crypto Utilities

```csharp
using Cinacoin.Services;

// Generate a keypair
var keypair = CryptoUtils.GenerateKeyPair();
Console.WriteLine($"Public key:  {keypair.PublicKey}");
Console.WriteLine($"Private key: {keypair.PrivateKey}");

// Sign a message
var message = "Hello, Cinacoin!";
var signature = CryptoUtils.SignMessage(message, keypair.PrivateKey);
Console.WriteLine($"Signature: {signature}");

// Verify a signature
var isValid = CryptoUtils.VerifySignature(message, signature, keypair.PublicKey);
Console.WriteLine($"Valid: {isValid}");

// Hash data
var hash = CryptoUtils.SHA256("data-to-hash");
Console.WriteLine($"SHA-256: {hash}");

// EIP-191 hash (Ethereum personal_sign)
var eip191Hash = CryptoUtils.EIP191Hash("Sign this message");
Console.WriteLine($"EIP-191: {eip191Hash}");
```

### 4. Dependency Injection Setup

```csharp
// Program.cs (ASP.NET Core)
using Cinacoin;
using Cinacoin.Services;

var builder = WebApplication.CreateBuilder(args);

// Register Cinacoin services
builder.Services.AddSingleton<CinacoinClient>(sp =>
    new CinacoinClient(
        builder.Configuration["Cinacoin:ProjectId"]!,
        logger: sp.GetRequiredService<ILogger<CinacoinClient>>()
    )
);

builder.Services.AddScoped<WalletService>();
builder.Services.AddScoped<RelayClient>();

var app = builder.Builder();

app.MapGet("/api/account/{walletId}", async (
    string walletId,
    WalletService walletService) =>
{
    var account = await walletService.GetAccountAsync(walletId);
    return Results.Ok(account);
});

app.MapPost("/api/transaction", async (
    TransactionRequest request,
    WalletService walletService) =>
{
    var tx = await walletService.SendTransactionAsync(request);
    return Results.Ok(tx);
});

app.Run();
```

### 5. Multi-Chain Operations

```csharp
using Cinacoin;
using Cinacoin.Models;
using Cinacoin.Services;

async Task MultiChainExample()
{
    await using var client = new CinacoinClient("YOUR_PROJECT_ID");
    await using var walletService = new WalletService(client);

    // Connect with multiple chains
    var connection = await walletService.ConnectAsync(new ConnectParams
    {
        Chains = new[] { 1, 137, 42161, 10, 8453 }, // ETH, Polygon, Arb, OP, Base
        Metadata = new AppMetadata
        {
            Name = "Multi-Chain App",
            Description = "Supporting 5 networks",
            Url = "https://mydapp.com",
            Icons = Array.Empty<string>()
        }
    });

    Console.WriteLine($"Connected with {connection.Chains?.Length ?? 0} chains");

    // Switch between chains
    foreach (var chainId in new[] { 1, 137, 42161 })
    {
        var balance = await walletService.GetTokenBalanceAsync(
            connection.Accounts[0],
            chainId
        );
        Console.WriteLine($"Chain {chainId}: {balance} ETH");
    }
}
```

### 6. Session Management

```csharp
using Cinacoin;
using Cinacoin.Models;

// Get account info
var account = await client.GetAccountAsync("metamask");

// Create a new session
var session = await client.CreateSessionAsync(new SessionRequest
{
    WalletId = "walletconnect",
    Chains = new[] { 1 },
});

// Get session state
var sessionState = await client.GetSessionAsync(session.SessionId);
Console.WriteLine($"Active: {sessionState.IsActive}");
Console.WriteLine($"Expiry: {sessionState.Expiry}");

// Close session
await client.CloseSessionAsync(session.SessionId);
```

## Model Reference

| Model | Description |
|-------|-------------|
| `Account` | Wallet account info (address, chain, balance, label) |
| `Chain` | Chain configuration (id, name, rpcUrl, nativeCurrency) |
| `ChainNamespace` | CAIP-2 namespace (Eip155, Solana, Bip122, etc.) |
| `ConnectionResult` | Result of wallet connection (sessionId, accounts, chainId) |
| `ConnectParams` | Connection parameters (chains, metadata) |
| `AppMetadata` | dApp metadata (name, description, url, icons) |
| `Transaction` | Transaction result (hash, status, blockNumber) |
| `TransactionRequest` | Transaction to send (from, to, value, data) |
| `Network` | Network info for discovery |
| `SessionResult` | Session creation result |
| `SessionProposal` | Session proposal data |
| `PairingData` | Pairing information |
| `RelayInfo` | Relay server configuration |
| `RequiredNamespace` | Required namespaces for session |
| `ProposerInfo` | Proposer metadata |
| `NativeCurrency` | Native token definition |
| `ChainReference` | CAIP-2 chain reference |

## Services Reference

| Service | Description |
|---------|-------------|
| `WalletService` | High-level wallet operations (connect, sign, send) |
| `RelayClient` | Low-level WebSocket relay communication |
| `CryptoUtils` | Cryptographic utilities (sign, verify, hash) |

## Expected Output

```
=== Available Networks ===
  Ethereum (Chain ID: 1)
    RPC: https://eth.drpc.org
  Polygon (Chain ID: 137)
    RPC: https://polygon-rpc.com

=== Balance Check ===
  Balance for 0x1234...7890: 1.234 ETH

=== Account Info ===
  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38
  Label:   MetaMask
  Chain:   1

=== Session Creation ===
  Session ID: wc_session_abc123...
  URI:        wc:abc123...@2?relay-protocol=irn&symKey=def456...

=== Connecting ===
  Session ID: wc_session_abc123...
  Chain ID:   1
  Accounts:   0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38

=== Message Signing ===
  Signature: 0x1234abcd...

=== Transaction ===
  Hash:   0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204...
  Status: confirmed

=== Done! ===
```

## Related

- [Ethereum](./ethereum.md)
- [Multi-Chain](./multi-chain.md)
- [API Reference](../api/core-sdk)
