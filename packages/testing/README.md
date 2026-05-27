# @cinacoin/testing

Testing utilities for Cinacoin — mock providers, wallets, chains, transactions, and fixtures.

## Installation

```bash
npm install -D @cinacoin/testing
```

## Quick Start

```ts
import {
  MockProvider,
  MockWallet,
  MOCK_CHAINS,
  createMockTransaction,
  ADDRESSES,
} from "@cinacoin/testing";

// Create a mock EIP-1193 provider
const provider = new MockProvider({
  accounts: ["0xabc..."],
  chainId: "0x1",
});

// Configure custom responses
provider.mock("eth_getBalance", { result: "0xde0b6b3a7640000" });
provider.mock("eth_sendTransaction", {
  error: { code: 4001, message: "User rejected" },
});

// Use with your wallet connector
const wallet = new MockWallet({
  accounts: ["0xabc..."],
  chainId: "0x1",
  connectDelay: 100,
});

await wallet.connect();
console.log(wallet.state); // { connected: true, accounts: [...], chainId: "0x1", ... }
```

## API

### MockProvider

Full EIP-1193 mock provider with configurable responses.

```ts
const provider = new MockProvider({
  accounts?: string[];          // default: 2 mock addresses
  chainId?: string;             // default: "0x1"
  defaultResponse?: object;     // fallback for unmocked methods
  responses?: Record<string, object>;  // per-method configs
  autoEmit?: boolean;           // default: true
});

// Configure responses
provider.mock("method_name", { result: value });
provider.mock("method_name", { error: { code, message, data? } });
provider.mock("method_name", { result: value, delay: 100 });

// State management
provider.setAccounts(["0xnew..."]);
provider.setChainId("0x89");
provider.reset();

// Call history
provider.callLog;       // array of { method, params, ts }
provider.resetCallLog();

// Events
provider.on("chainChanged", (chainId) => { ... });
provider.on("accountsChanged", (accounts) => { ... });
provider.once("connect", () => { ... });
provider.removeAllListeners();

// Builtin methods handled automatically:
//   eth_accounts, eth_chainId, eth_sendTransaction,
//   eth_signTypedData_v4, personal_sign,
//   wallet_switchEthereumChain, wallet_addEthereumChain,
//   wallet_requestPermissions, wallet_getPermissions, net_version
```

### MockWallet

Simulated wallet connector.

```ts
const wallet = new MockWallet({
  connectorId?: string;   // default: "mock"
  accounts?: string[];
  chainId?: string;
  connectDelay?: number;
  disconnectDelay?: number;
  connectError?: Error | null;
  disconnectError?: Error | null;
});

await wallet.connect();      // returns WalletState
await wallet.disconnect();
await wallet.switchChain("0x89");
wallet.state;                // { connected, accounts, chainId, connectorId }
wallet.isConnected;
wallet.provider;             // underlying MockProvider
```

### MockChains

Pre-built chain configurations.

```ts
import { MOCK_CHAINS, getChainById, createMockChain } from "@cinacoin/testing";

MOCK_CHAINS.mainnet;         // Ethereum Mainnet config
MOCK_CHAINS.sepolia;         // Sepolia testnet
MOCK_CHAINS.polygon;
MOCK_CHAINS.optimism;
MOCK_CHAINS.arbitrum;
MOCK_CHAINS.base;
MOCK_CHAINS.localhost;
MOCK_CHAINS.hardhat;

getChainById(1);             // or "0x1"
getChainById("0x89");        // Polygon
createMockChain({ id: 999, name: "Custom" });
```

### MockTransactions

Generate mock transactions and receipts.

```ts
import { createMockTransaction, createMockReceipt, simulateTransaction } from "@cinacoin/testing";

const tx = createMockTransaction({
  from: "0x...",
  to: "0x...",
  value: "0x1000000000000000000",
});

const receipt = createMockReceipt(tx, "confirmed");  // or "failed" / "reverted"

// Simulate full lifecycle with delay
const { tx, receipt } = await simulateTransaction(
  { from: "0x...", to: "0x..." },
  "confirmed",
  500  // ms delay
);
```

### Fixtures

Common test data.

```ts
import {
  ADDRESSES,       // pre-defined addresses (zero, user1, user2, contract, ens)
  SIGNATURES,      // valid, empty, malformed signatures
  HASHES,          // tx, block, data hashes
  TYPED_DATA,      // EIP-712 typed data example
  ERC20_ABI,       // ERC20 contract ABI
  ERC721_ABI,      // ERC721 contract ABI
  CHAIN_FIXTURES,  // chain shorthand objects
  PROVIDER_STATES, // disconnected, connected, multiAccount, testnet
  ERRORS,          // standard EIP-1193 error objects
} from "@cinacoin/testing";
```

## License

MIT
