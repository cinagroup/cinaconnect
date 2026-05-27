# @cinacoin/aa-sdk

Account Abstraction SDK for building ERC-4337 compatible smart accounts. Includes smart account management, factory deployment, paymaster integration, and bundler client.

## Installation

```bash
npm install @cinacoin/aa-sdk
```

## Usage

### Smart Account

```ts
import { SmartAccount } from '@cinacoin/aa-sdk';

const account = await SmartAccount.create({
  owner: '0x...',
  entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  factoryAddress: '0x...',
  chainId: 1,
  rpcUrl: 'https://eth.rpc',
});

// Execute a transaction
const result = await account.execute('0xRecipient', 100n, '0x');

// Execute batch transactions
const batchResult = await account.executeBatch([
  { to: '0xAddr1', value: 100n, data: '0x...' },
  { to: '0xAddr2', value: 200n, data: '0x...' },
]);
```

### Factory

```ts
import { SmartAccountFactory } from '@cinacoin/aa-sdk';

const factory = new SmartAccountFactory({
  address: '0x...',
  entryPoint: '0x...',
  saltNonce: 0n,
});

const { address, hash } = await factory.deploy('0xOwner');
```

### Paymaster

```ts
import { PaymasterClient } from '@cinacoin/aa-sdk';

const paymaster = new PaymasterClient({
  url: 'https://paymaster.example.com',
  sponsorType: 'gasless',
});

const sponsored = await paymaster.sponsor({
  userOperation: userOp,
  entryPoint: '0x...',
  chainId: 1,
});
```

### Bundler

```ts
import { BundlerClient } from '@cinacoin/aa-sdk';

const bundler = new BundlerClient({
  url: 'https://bundler.example.com',
});

const { userOpHash } = await bundler.sendUserOperation(userOp);
```

## API

### SmartAccount

| Method | Description |
|--------|-------------|
| `create(config)` | Create a new smart account |
| `getAddress()` | Get the account address |
| `getState()` | Get account state |
| `execute(to, value, data)` | Execute a single transaction |
| `executeBatch(transactions)` | Execute batch transactions |
| `sign(userOp)` | Sign a UserOperation |
| `buildUserOperation(txs)` | Build a UserOperation |
| `getNonce()` | Get the current nonce |

### SmartAccountFactory

| Method | Description |
|--------|-------------|
| `computeAddress(owner, salt?)` | Compute account address |
| `deploy(owner, salt?)` | Deploy a new account |
| `isDeployed(address)` | Check if deployed |

### PaymasterClient

| Method | Description |
|--------|-------------|
| `sponsor(request)` | Sponsor a user operation |
| `getGasLimits(userOp)` | Get gas limits |
| `getBalance()` | Get paymaster balance |
| `canSponsor(request)` | Check if can sponsor |

### BundlerClient

| Method | Description |
|--------|-------------|
| `sendUserOperation(userOp)` | Send user op to bundler |
| `estimateUserOperationGas(userOp)` | Estimate gas |
| `getUserOperationStatus(hash)` | Get op status |
| `getSupportedEntryPoints()` | Get supported entry points |
| `fillUserOperationDefaults(userOp)` | Fill default values |

## License

MIT
