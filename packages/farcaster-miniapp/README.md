# @cinacoin/farcaster-miniapp

Farcaster Mini Apps integration for Cinacoin SDK.

## Features

- **FarcasterProvider** — EIP-1193 compatible wallet provider inside Farcaster Mini Apps
- **FarcasterAuth** — Sign-In with Farcaster (SIWF) message generation and verification
- **Farcaster types** — User, context, and auth type definitions

## Install

```bash
npm install @cinacoin/farcaster-miniapp
```

## Usage

```ts
import { FarcasterProvider, FarcasterAuth } from '@cinacoin/farcaster-miniapp';

// Initialize provider
const provider = new FarcasterProvider({
  chains: [1, 10, 8453],
  appName: 'My Farcaster DApp',
});
await provider.init();

// Connect wallet
provider.setAccount('0x...');

// Sign-In with Farcaster
const user = provider.user;
const params = {
  domain: 'mydapp.com',
  nonce: FarcasterAuth.generateNonce(),
  statement: 'Sign in to My DApp',
};
const message = FarcasterAuth.createSignInMessage(user!, params);
```
