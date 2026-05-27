# SIWE API

> `@cinacoin/siwe` — Sign-In with Ethereum (EIP-4361) 实现参考。

## 概述

SIWE 允许用户使用以太坊钱包签名消息来验证身份，替代传统用户名密码登录。Cinacoin 实现了完整的 SIWE 流程。

## 创建 SIWE 消息

```typescript
import { generateMessage, verifyMessage } from '@cinacoin/siwe'

const siweMessage = generateMessage({
  domain: 'mydapp.com',
  address: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
  statement: 'Sign in to My dApp',
  uri: 'https://mydapp.com',
  version: '1',
  chainId: 1,
  nonce: generateNonce(),        // 防重放
  issuedAt: new Date().toISOString(),
  expirationTime: new Date(Date.now() + 3600000).toISOString(),  // 1 小时后过期
  requestId: 'request-123',      // 可选
  resources: [                    // 可选
    'https://mydapp.com/terms',
  ],
})

console.log(siweMessage)
// mydapp.com wants you to sign in with your Ethereum account:
// 0x1a2b3c4d5e6f7890abcdef1234567890abcdef12
//
// Sign in to My dApp
//
// URI: https://mydapp.com
// Version: 1
// Chain ID: 1
// Nonce: abc123
// Issued At: 2026-05-16T10:00:00.000Z
// Expiration Time: 2026-05-16T11:00:00.000Z
```

## 签名消息

```typescript
import { useCinacoin } from '@cinacoin/react'
import { generateMessage } from '@cinacoin/siwe'

function SignInButton() {
  const { signMessage, account } = useCinacoin()

  const handleSignIn = async () => {
    const message = generateMessage({
      domain: 'mydapp.com',
      address: account!,
      statement: 'Sign in to My dApp',
      uri: 'https://mydapp.com',
      version: '1',
      chainId: 1,
      nonce: generateNonce(),
      issuedAt: new Date().toISOString(),
    })

    // 用户通过钱包签名
    const signature = await signMessage(message)

    // 发送签名到后端验证
    const response = await fetch('/api/auth/siwe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    })

    const result = await response.json()
    if (result.success) {
      console.log('登录成功', result.user)
    }
  }

  return <button onClick={handleSignIn}>用钱包登录</button>
}
```

## 后端验证

```typescript
// 服务端验证 SIWE 签名
import { verifyMessage } from '@cinacoin/siwe'

app.post('/api/auth/siwe', async (req, res) => {
  const { message, signature } = req.body

  try {
    // 验证签名
    const result = await verifyMessage(message, signature)

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // 检查 nonce 是否已被使用（防重放）
    if (await isNonceUsed(result.nonce)) {
      return res.status(401).json({ error: 'Nonce already used' })
    }

    // 检查是否过期
    if (result.expirationTime && new Date(result.expirationTime) < new Date()) {
      return res.status(401).json({ error: 'Message expired' })
    }

    // 标记 nonce 为已使用
    await markNonceUsed(result.nonce)

    // 创建或获取用户
    const user = await findOrCreateUser(result.address)

    // 生成 session token
    const token = generateSessionToken(user)

    res.json({ success: true, user, token })
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' })
  }
})
```

## API 参考

### `generateMessage(params: SiweParams): string`

生成标准 SIWE 消息字符串。

#### SiweParams

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `domain` | `string` | ✅ | 请求域（RFC 3986 URI） |
| `address` | `string` | ✅ | 以太坊地址 |
| `statement` | `string` | ✅ | 人类可读的意图声明 |
| `uri` | `string` | ✅ | 发起请求的 URI |
| `version` | `string` | ✅ | 消息版本（当前为 "1"） |
| `chainId` | `number` | ✅ | 链 ID |
| `nonce` | `string` | ✅ | 随机数（至少 8 位） |
| `issuedAt` | `string` | ✅ | 创建时间 (ISO-8601) |
| `expirationTime` | `string` | ❌ | 过期时间 |
| `notBefore` | `string` | ❌ | 生效时间 |
| `requestId` | `string` | ❌ | 请求 ID |
| `resources` | `string[]` | ❌ | 附加资源 URI 列表 |

### `verifyMessage(message: string, signature: string): Promise<SiweResult>`

验证 SIWE 消息签名。

#### SiweResult

```typescript
interface SiweResult {
  /** 签名是否有效 */
  valid: boolean
  /** 签名者地址 */
  address: string
  /** 解析后的消息字段 */
  domain: string
  address: string
  statement: string
  uri: string
  version: string
  chainId: number
  nonce: string
  issuedAt: string
  expirationTime?: string
  notBefore?: string
  requestId?: string
  resources?: string[]
}
```

### `generateNonce(): string`

生成加密安全的随机 nonce。

```typescript
import { generateNonce } from '@cinacoin/siwe'

const nonce = generateNonce()
// "dGH5nB7kL2pQxR8m"
```

### `parseMessage(message: string): SiweParsedMessage`

解析 SIWE 消息字符串为结构化对象。

```typescript
import { parseMessage } from '@cinacoin/siwe'

const parsed = parseMessage(siweMessage)
console.log(parsed.domain)  // "mydapp.com"
console.log(parsed.chainId) // 1
```

## 安全注意事项

1. **Nonce 防重放**：每个 SIWE 消息必须使用唯一 nonce，后端应记录已使用的 nonce
2. **过期时间**：始终设置 `expirationTime`，避免消息长期有效
3. **Domain 验证**：后端必须验证 `domain` 与实际请求来源匹配
4. **Chain ID 验证**：确认签名发生在预期的链上
5. **HTTPS**：生产环境必须使用 HTTPS 传输

## 与 NextAuth.js 集成

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyMessage } from '@cinacoin/siwe'

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: { label: 'Message', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.message || !credentials?.signature) {
          return null
        }

        const result = await verifyMessage(
          credentials.message,
          credentials.signature
        )

        if (!result.valid) {
          return null
        }

        return {
          id: result.address,
          name: result.address,
        }
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        address: token.sub,
      },
    }),
  },
})
```
