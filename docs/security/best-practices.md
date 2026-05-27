# 安全最佳实践

> Cinacoin 安全指南 — 保护用户资产和数据。

## 端到端加密

### Relay 消息加密

所有通过 Relay 的消息都使用 **X25519 + ChaCha20-Poly1305** 端到端加密：

```
dApp ──[加密消息]──► Relay ──[加密消息]──► 钱包
         │                    │
    Relay 不解密          Relay 仅做
    消息内容              Topic 路由
```

**关键原则**：
- ✅ Relay 仅做消息路由，**不持有解密能力**
- ✅ 密钥在 dApp 和钱包之间协商
- ✅ 每次 Pairing 生成新的密钥对

### 密钥管理

```typescript
// 生成 X25519 密钥对
import { generateKeyPair } from '@cinacoin/core/crypto'

const keyPair = generateKeyPair()
// { publicKey: '0x...', privateKey: '0x...' }

// 生成共享密钥 (ECDH)
import { deriveSharedSecret } from '@cinacoin/core/crypto'

const sharedSecret = deriveSharedSecret(
  myPrivateKey,      // 我方私钥
  peerPublicKey,     // 对方公钥
)

// 加密消息
import { encrypt, decrypt } from '@cinacoin/core/crypto'

const encrypted = encrypt(sharedSecret, plaintext)
const decrypted = decrypt(sharedSecret, encrypted)
```

## 签名安全

### EIP-191 个人签名

```typescript
// 安全：使用 EIP-191 格式
const message = '\x19Ethereum Signed Message:\n' + message.length + message
const signature = await signMessage(message)
```

### EIP-712 结构化签名

```typescript
// 推荐：使用 EIP-712 提供清晰的签名意图
const typedData = {
  domain: {
    name: 'Cinacoin',
    version: '1',
    chainId: 1,
  },
  types: {
    Transfer: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  primaryType: 'Transfer',
  message: {
    from: '0x1a2b...',
    to: '0x3c4d...',
    amount: 1000000000000000000n,
  },
}

const signature = await signTypedData(typedData)
```

## SIWE 安全

### 防重放攻击

- 每个 SIWE 消息使用唯一 `nonce`
- 后端记录已使用 nonce
- 设置合理的 `expirationTime`

### Domain 验证

```typescript
// 后端必须验证 domain 匹配
function validateDomain(message: SiweMessage, request: Request): boolean {
  const requestDomain = new URL(request.url).hostname
  return message.domain === requestDomain
}
```

## 会话密钥安全

### 最小权限原则

```typescript
// 会话密钥只授予必要的权限
const sessionKeyPolicy = {
  expiresAt: Date.now() + 3600000,  // 1 小时后过期
  allowedTargets: [USDC_ADDRESS],    // 仅允许与 USDC 合约交互
  allowedMethods: ['transfer'],      // 仅允许 transfer
  maxAmountPerTx: 1000n * 10n ** 6n, // 单笔最大 1000 USDC
  dailyLimit: 10000n * 10n ** 6n,    // 每日最大 10000 USDC
}
```

## 私钥保护

### ⚠️ 永远不要

- ❌ 在前端代码中硬编码私钥
- ❌ 通过 WebSocket/HTTP 传输私钥
- ❌ 将私钥存储在 localStorage
- ❌ 在日志中打印私钥
- ❌ 使用同一私钥管理多用户资产

### ✅ 应该

- ✅ 使用硬件钱包（Ledger, Trezor）管理大额资产
- ✅ 使用多签钱包管理项目资金
- ✅ 对热钱包设置每日提款限额
- ✅ 定期轮换密钥
- ✅ 实施社交恢复机制

## 智能合约安全

### 重入攻击防护

```solidity
// 使用 ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // 1. 更新状态
        balances[msg.sender] = 0;
        // 2. 外部调用
        (bool success, ) = msg.sender.call{value: balances[msg.sender]}("");
        require(success);
    }
}
```

### 访问控制

```solidity
// 使用 OpenZeppelin AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function sensitiveOperation() external onlyRole(ADMIN_ROLE) {
        // ...
    }
}
```

### 输入验证

```solidity
// 始终验证输入
function transfer(address to, uint256 amount) external {
    require(to != address(0), "Invalid recipient");
    require(amount > 0, "Invalid amount");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    // ...
}
```

## RPC 安全

### 速率限制

```yaml
rate_limit:
  per_ip:
    requests_per_second: 100
    burst_size: 500
  per_key:
    requests_per_minute: 100000
  method_limits:
    eth_sendRawTransaction: 50/秒
    debug_*: 10/秒
```

### 输入过滤

- 过滤恶意 payload（超长字符串、注入代码）
- 限制请求大小（max 1MB）
- 验证 JSON-RPC 方法白名单

## 网络安全

| 措施 | 说明 |
|------|------|
| **TLS 1.3** | 所有 WebSocket 和 HTTP 连接使用 TLS 1.3 |
| **HSTS** | 强制 HTTPS |
| **CSP** | 内容安全策略，防止 XSS |
| **CORS** | 严格配置允许的来源 |
| **WAF** | Web 应用防火墙（CloudFlare） |
| **DDoS 防护** | CDN 层 DDoS 缓解 |

## 应急响应

### 发现安全事件时

1. **隔离**：立即停止受影响的服务
2. **评估**：确认影响范围和严重程度
3. **修复**：部署修复补丁
4. **通知**：通知受影响的用户
5. **复盘**：事后分析，更新防御策略

### 紧急联系人

- 安全团队: `security@cinacoin.com`
- 紧急通道: `#cinacoin-security` (内部)
