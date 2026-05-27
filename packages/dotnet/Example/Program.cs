using System;
using System.Threading.Tasks;
using Cinacoin;
using Cinacoin.Models;
using Cinacoin.Services;

namespace Cinacoin.Example;

/// <summary>
/// Example usage of the Cinacoin .NET SDK.
/// Demonstrates client initialization, network enumeration, balance queries,
/// account retrieval, session management, and transaction signing.
/// </summary>
public class Program
{
    public static async Task Main(string[] args)
    {
        // Initialize the client with your project ID
        await using var client = new CinacoinClient("YOUR_PROJECT_ID");

        // Use WalletService for high-level convenience operations
        await using var walletService = new WalletService(client);

        // ─── Network Discovery ───
        Console.WriteLine("Available Networks:");
        var networks = await walletService.GetNetworksAsync();
        foreach (var network in networks)
        {
            Console.WriteLine($"  {network.Name} (Chain ID: {network.ChainId}) — {network.RpcUrl}");
        }

        // ─── Balance Check ───
        var address = "0x1234567890123456789012345678901234567890";
        var balance = await walletService.GetTokenBalanceAsync(address);
        Console.WriteLine($"\nBalance for {address}: {balance} ETH");

        // ─── Account Info ───
        var account = await walletService.GetAccountAsync("metamask");
        Console.WriteLine($"\nAccount:");
        Console.WriteLine($"  Address: {account.Address}");
        Console.WriteLine($"  Label:   {account.Label}");

        // ─── Session Creation ───
        var session = await walletService.CreateSessionAsync("walletconnect", "eip155");
        Console.WriteLine($"\nSession:");
        Console.WriteLine($"  Session ID: {session.SessionId}");
        Console.WriteLine($"  URI:        {session.Uri}");

        // ─── Connect ───
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
        Console.WriteLine($"\nConnection:");
        Console.WriteLine($"  Session ID: {connection.SessionId}");
        Console.WriteLine($"  Chain ID:   {connection.ChainId}");
        Console.WriteLine($"  Accounts:   {string.Join(", ", connection.Accounts)}");

        // ─── Sign a Message ───
        var signature = await walletService.SignMessageAsync(
            connection.Accounts[0],
            "Hello, Cinacoin!");
        Console.WriteLine($"\nSignature: {signature}");

        // ─── Send a Transaction ───
        var tx = await walletService.SendTransactionAsync(new TransactionRequest
        {
            From = connection.Accounts[0],
            To = "0x0000000000000000000000000000000000000001",
            Value = "0x0",
            Data = "0x"
        });
        Console.WriteLine($"\nTransaction:");
        Console.WriteLine($"  Hash: {tx.Hash}");
        Console.WriteLine($"  Status: {tx.Status}");

        Console.WriteLine("\nDone!");
    }
}
