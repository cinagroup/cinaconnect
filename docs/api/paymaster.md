# Paymaster Contract

> `@cinacoin/paymaster` — ERC-4337 Paymaster contracts for gas sponsorship.

## Overview

Cinacoin Paymaster contracts allow dApps to sponsor gas fees for their users, enabling gasless transactions. Users interact with smart accounts without holding native tokens — the Paymaster covers the gas cost through various business models.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   dApp Flow                      │
│                                                   │
│  User → Smart Account → UserOp → Bundler ──┐    │
│                                            │    │
│                              ┌─────────────┴──┐ │
│                              │   EntryPoint   │ │
│                              │                │ │
│                              │  validatePay   │ │
│    ┌──────────────┐         │  masterUserOp   │ │
│    │  Paymaster   │◄────────│                │ │
│    │              │         │  postOp        │ │
│    └──────────────┘         └────────────────┘ │
│                                                   │
│  Paymaster pays gas → gets reimbursed by:         │
│    • dApp subscription                            │
│    • Token collected from user                    │
│    • Protocol revenue sharing                     │
└─────────────────────────────────────────────────┘
```

## Contract Types

### CinacoinPaymaster (Base)

The core Paymaster contract implementing `IPaymaster` from the ERC-4337 spec.

#### Key Functions

```solidity
// Validate a UserOperation and determine sponsorship
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external returns (bytes memory context, uint256 validationData);

// Post-operation callback for accounting
function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256 actualGasUsed
) external;

// Deposit native tokens for gas sponsorship
function deposit() external payable;

// Withdraw deposited funds
function withdrawTo(address payable withdrawAddress, uint256 amount) external;
```

#### Deposit Management

The Paymaster must hold a deposit at the EntryPoint to sponsor gas:

```bash
# Deposit ETH into the Paymaster via EntryPoint
cast send $ENTRY_POINT "depositTo(address)" $PAYMASTER --value 1ether
```

### VerifyingPaymaster

Uses an off-chain signer to authorize gas sponsorship. The dApp backend signs a hash of the UserOp, and the Paymaster verifies the signature on-chain.

```solidity
contract VerifyingPaymaster is CinacoinPaymaster {
    address public verifyingSigner;

    function setSigner(address newSigner) external onlyOwner {
        verifyingSigner = newSigner;
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external view override returns (bytes memory context, uint256 validationData) {
        // Verify the signature from the off-chain signer
        bytes memory sigAndData = userOp.paymasterData;
        (bytes memory signature, ) = abi.decode(sigAndData, (bytes, bytes));

        bytes32 hash = keccak256(abi.encode(userOpHash, address(this), block.chainid));
        address signer = ECDSA.recover(hash, signature);

        require(signer == verifyingSigner, "invalid signer");
        require(block.timestamp < validUntil, "expired");

        return ("", packValidationData(false, uint48(validUntil), 0));
    }
}
```

#### Off-Signed UserOp Flow

```typescript
// 1. dApp backend generates a signature
const hash = ethers.solidityPackedKeccak256(
  ['bytes32', 'address', 'uint256', 'uint48'],
  [userOpHash, paymasterAddress, chainId, validUntil]
)
const signature = await signer.signMessage(ethers.getBytes(hash))

// 2. Include signature in paymasterData
userOp.paymaster = paymasterAddress
userOp.paymasterVerificationGasLimit = 100_000n
userOp.paymasterPostOpGasLimit = 50_000n
userOp.paymasterData = abi.encode(signature, abi.encode(validUntil))
```

### TokenPaymaster

Allows users to pay gas fees in ERC-20 tokens instead of native tokens.

```solidity
contract TokenPaymaster is CinacoinPaymaster {
    IERC20 public immutable token;
    uint256 public priceDenominator;
    mapping(address => uint256) public userBalances;

    // Sponsor gas, charge user in ERC-20 tokens
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualGasUsed
    ) external override {
        uint256 tokenAmount = calculateTokenAmount(actualGasCost);
        require(token.transferFrom(user, address(this), tokenAmount));
    }

    // Users deposit tokens into the Paymaster
    function depositFor(address user, uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        userBalances[user] += amount;
    }

    // Calculate token amount for a given gas cost
    function calculateTokenAmount(uint256 gasCost) public view returns (uint256) {
        // Uses an oracle (Chainlink, Uniswap TWAP) for price
        uint256 tokenPrice = oracle.getTokenPrice();
        return (gasCost * priceDenominator) / tokenPrice;
    }
}
```

### UpgradeablePaymaster

A UUPS-upgradeable version of the Paymaster for safe contract upgrades.

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UpgradeablePaymaster is
    CinacoinPaymaster,
    UUPSUpgradeable
{
    function initialize(address _owner, address _entryPoint) external initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

## Types

### IPaymaster Interface

```solidity
interface IPaymaster {
    enum PostOpMode {
        opSucceeded,   // User operation succeeded
        opReverted,    // User operation reverted
        postOpReverted // postOp itself reverted
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualGasUsed
    ) external;
}
```

### validationData Packing

The `validationData` return value packs three fields into a single `uint256`:

| Bits | Field | Description |
|------|-------|-------------|
| 0 | `aggregator` | 0 = no aggregator, address = validation aggregator |
| 48-111 | `validUntil` | Timestamp until which the validation is valid (0 = unlimited) |
| 112-175 | `validAfter` | Timestamp after which the validation is valid (0 = from now) |

## Business Models

### 1. Gas Sponsorship (Free for Users)

The dApp pays all gas costs as a user acquisition strategy.

```typescript
// UserOp with Paymaster
const userOp = {
  sender: smartAccountAddress,
  // ... other fields ...
  paymaster: paymasterAddress,
  paymasterVerificationGasLimit: 100_000n,
  paymasterPostOpGasLimit: 50_000n,
  paymasterData: encodeSponsorData(),  // Signature from backend
}
```

### 2. Token Payment

Users pay gas in ERC-20 tokens via the TokenPaymaster.

### 3. Revenue Sharing

The Paymaster takes a percentage of transaction value as compensation for gas.

### 4. Subscription Model

dApps subscribe to the Paymaster service and pay a flat monthly fee.

## SDK Usage

```typescript
import { UserOperationBuilder } from '@cinacoin/core'

const userOp = new UserOperationBuilder()
  .sender(smartAccountAddress)
  .nonce(nonce)
  .callData(encodedCalldata)
  .callGasLimit(100_000n)
  .verificationGasLimit(200_000n)
  .preVerificationGas(50_000n)
  .maxFeePerGas(maxFee)
  .maxPriorityFeePerGas(priorityFee)
  .paymaster(paymasterAddress)
  .paymasterVerificationGasLimit(100_000n)
  .paymasterPostOpGasLimit(50_000n)
  .paymasterData(encodePaymasterData(signature))
  .sign(account)

// Submit to bundler
const hash = await bundler.sendUserOperation(userOp)
```

## Deployment

```bash
# Using Foundry
cd packages/paymaster

# Deploy base Paymaster
forge create contracts/CinacoinPaymaster.sol:CinacoinPaymaster \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --constructor-args $ENTRY_POINT

# Deploy TokenPaymaster
forge create contracts/TokenPaymaster.sol:TokenPaymaster \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --constructor-args $ENTRY_POINT $TOKEN_ADDRESS

# Deploy UpgradeablePaymaster (with proxy)
forge script deploy/UpgradeablePaymaster.s.sol \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast
```

## Security Considerations

1. **Deposit management** — Monitor Paymaster balance and alert when low
2. **Signature expiration** — Always set `validUntil` to prevent replay
3. **Rate limiting** — Implement per-user limits to prevent abuse
4. **Oracle reliability** — Use multiple price sources for TokenPaymaster
5. **Upgradeable safety** — Use timelock for proxy upgrades
6. **Access control** — Restrict signer and owner to authorized addresses

## Error Codes

| Error | Code | Description |
|-------|------|-------------|
| `InvalidSignature` | `0x01` | Paymaster signature verification failed |
| `ExpiredSignature` | `0x02` | Signature past `validUntil` timestamp |
| `InsufficientDeposit` | `0x03` | Paymaster deposit is too low |
| `TokenTransferFailed` | `0x04` | Token payment collection failed |
| `InvalidToken` | `0x05` | Token not supported by TokenPaymaster |
| `Unauthorized` | `0x06` | Caller not authorized |
| `PriceStale` | `0x07` | Oracle price is too old |
