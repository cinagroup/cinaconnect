# @cinacoin/embedded-wallet

Embedded wallet system with email, social, and phone authentication.

## Installation

```bash
npm install @cinacoin/embedded-wallet
```

## Usage

```ts
import { EmbeddedWallet } from '@cinacoin/embedded-wallet';

const wallet = new EmbeddedWallet({
  projectId: 'YOUR_PROJECT_ID',
  auth: {
    providers: ['email', 'google', 'phone'],
  },
});

// Sign in with email
await wallet.signInWithEmail('user@example.com');

// Sign in with Google
await wallet.signInWithSocial('google');

// Sign in with phone
await wallet.signInWithPhone('+1234567890');
```

## License

MIT
