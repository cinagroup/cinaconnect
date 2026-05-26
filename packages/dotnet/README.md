# CinaConnect .NET SDK

[![NuGet](https://img.shields.io/nuget/v/CinaConnect.svg)](https://www.nuget.org/packages/CinaConnect)
[![NuGet Downloads](https://img.shields.io/nuget/dt/CinaConnect.svg)](https://www.nuget.org/packages/CinaConnect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Official .NET SDK for the CinaConnect wallet connectivity platform. Provides client interfaces for account management, transaction signing, session management, and multi-chain network operations.

## Installation

### Package Manager

```bash
dotnet add package CinaConnect
```

### .NET CLI

```bash
dotnet add package CinaConnect
```

### PackageReference

```xml
<PackageReference Include="CinaConnect" Version="1.0.0" />
```

## Quick Start

```csharp
using CinaConnect;
using CinaConnect.Services;

// Create and dispose the client properly (implements IAsyncDisposable)
await using var client = new CinaConnectClient("YOUR_PROJECT_ID");
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

// Create a wallet session
var session = await walletService.CreateSessionAsync("walletconnect", "eip155");
Console.WriteLine($"Pairing URI: {session.Uri}");
```

## Usage

### Creating a Client

```csharp
// Basic
await using var client = new CinaConnectClient("YOUR_PROJECT_ID");

// With custom API URL and logging
await using var client = new CinaConnectClient(
    projectId: "YOUR_PROJECT_ID",
    baseUrl: "https://api.cinaconnect.com",
    logger: logger); // Microsoft.Extensions.Logging.ILogger<CinaConnectClient>
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
// Create a session
var session = await client.CreateSessionAsync("walletconnect", "eip155");

// Disconnect when done
await client.DisconnectAsync(session.SessionId);
```

### Proper Resource Cleanup

Both `CinaConnectClient` and `WalletService` implement `IAsyncDisposable`:

```csharp
// Using statement (recommended)
await using var client = new CinaConnectClient("YOUR_PROJECT_ID");
await using var walletService = new WalletService(client);
// Disposed automatically at scope exit

// Manual disposal
var client = new CinaConnectClient("YOUR_PROJECT_ID");
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
await using var client = new CinaConnectClient("YOUR_PROJECT_ID");
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

## API Reference

### `CinaConnectClient`

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

## License

MIT — see [LICENSE](../../LICENSE).
