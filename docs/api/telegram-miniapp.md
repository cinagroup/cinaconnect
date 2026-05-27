# Telegram Mini App API

> `@cinacoin/telegram-miniapp` — Telegram 小程序钱包连接。

## Installation

```bash
npm install @cinacoin/telegram-miniapp
```

## Usage

```typescript
import { TelegramProvider } from '@cinacoin/telegram-miniapp'

const provider = new TelegramProvider({
  projectId: 'your-project-id',
  botToken: 'your-bot-token',
})

// Connect wallet
const result = await provider.connect()
console.log('Connected:', result.address)
```

## Authentication

```typescript
import { validateInitData, parseInitData, buildLoginResult, telegramIdToAddress, generateSignInMessage } from '@cinacoin/telegram-miniapp'

// Validate Telegram init data
const isValid = validateInitData(initData, botToken)

// Parse init data
const user = parseInitData(initData)

// Generate sign-in message
const message = generateSignInMessage(user.id)

// Convert Telegram ID to wallet address
const address = telegramIdToAddress(user.id)
```

## Modal

```tsx
import { TelegramModal } from '@cinacoin/telegram-miniapp'

<TelegramModal config={{ projectId: '...' }} />
```

## Error Handling

```typescript
if (isInitDataExpired(initData, 300)) {
  // Init data expired (> 5 minutes old)
}
```

## See Also

- [Core SDK](./core-sdk.md)
