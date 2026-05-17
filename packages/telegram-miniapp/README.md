# @onchainux/telegram-miniapp

Telegram Mini Apps integration for OnChainUX SDK.

## Features

- **TelegramProvider** — EIP-1193 compatible wallet provider inside Telegram WebApp
- **TelegramModal** — Native-feeling wallet selection modal using Telegram UI components
- **TelegramAuth** — Init data validation and Sign-In message generation

## Install

```bash
npm install @onchainux/telegram-miniapp
```

## Usage

```ts
import { TelegramProvider, TelegramModal, TelegramAuth } from '@onchainux/telegram-miniapp';

// Initialize provider
const provider = new TelegramProvider({
  chains: [1, 8453, 137],
  appName: 'My DApp',
});
await provider.initialize();

// Connect wallet
provider.connect('0x...', 1);

// Show wallet modal
const modal = new TelegramModal({
  wallets: [
    { id: 'mm', name: 'MetaMask', icon: '🦊' },
    { id: 'wc', name: 'WalletConnect', icon: '🔗' },
  ],
});
const selected = await modal.show();

// Auth
const user = provider.getUser();
const loginResult = TelegramAuth.buildLoginResult(provider);
const valid = TelegramAuth.validateInitData(provider.getInitData(), BOT_TOKEN);
```
