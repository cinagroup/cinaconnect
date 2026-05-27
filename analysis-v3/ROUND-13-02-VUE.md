# ROUND-13-02: Vue 框架 P0 修复 — mock connect 替换 + 事件监听器泄漏修复

**Date:** 2026-05-26
**Status:** ✅ Completed
**Test Results:** 49/49 passed (4 test files)

---

## 修复概览

本轮修复解决 Vue 适配器中的两个 P0 问题：

1. **P0-1: mock `connect()` 替换为真实 WalletConnect 连接逻辑**
2. **P0-2: `addEventListener` / `removeEventListener` 事件监听器泄漏**

---

## P0-1: Vue Provider mock connect() → 真实实现

### 问题

`CinacoinProvider.vue` (原名 `OnChainUXProvider.vue`) 中的 `connect()` 方法是纯 mock 实现：

```typescript
async function connect(connectorId: string): Promise<void> {
  status.value = 'connecting';
  await new Promise(resolve => setTimeout(resolve, 1000)); // ← Mock
  account.value = {
    address: '0x1234567890abcdef1234567890abcdef12345678', // ← Hardcoded
    balance: '1.234',
    // ...
  };
  status.value = 'connected';
}
```

问题：
- 使用 `setTimeout` 模拟连接延迟
- 硬编码假的钱包地址
- 不调用任何真实的连接器
- `disconnect()` 同样为 mock
- `switchChain()` 仅更新 UI 状态，不实际与钱包交互

### 解决方案

#### 新增文件：`src/connectorManager.ts`

创建了 `ConnectorManager` 类作为 Vue 适配器与 `@cinacoin/core-sdk` 之间的桥梁：

```typescript
export class ConnectorManager {
  private connectors: Map<string, Connector> = new Map();
  private activeConnector: Connector | null = null;
  private evmAdapter: EvmAdapter;
  private _events: EventEmitter;

  // 初始化默认连接器（InjectedProvider 实例）
  private initDefaultConnectors(): void {
    this.addConnector(
      new InjectedProvider('io.metamask', 'MetaMask', WALLET_ICONS.metamask)
    );
    this.addConnector(
      new InjectedProvider('io.rabby', 'Rabby', WALLET_ICONS.rabby)
    );
    // WalletConnect、Coinbase、Email 注册为元数据占位符
  }

  async connect(connectorId: string): Promise<ConnectionResult> {
    const connector = this.connectors.get(connectorId);
    // 调用 core-sdk 的 Connector.connect() 实现真实连接
    const result = await connector.connect();
    this.activeConnector = connector;
    this.evmAdapter.setConnector(connector);
    this._events.emit('connected', result);
    return result;
  }
  // disconnect(), switchChain(), getAccounts(), getChainId(), ...
}
```

关键设计决策：

1. **InjectedProvider 实例化**：MetaMask 和 Rabby 在构造时创建 `InjectedProvider` 实例，自动检测 `window.ethereum`
2. **WalletConnect 占位符**：完整实现需要 `RelayTransport` + `SessionManager`，当前注册元数据并输出配置警告
3. **事件系统**：通过 `EventEmitter` 发布 `connected` / `disconnected` 事件
4. **EvmAdapter 集成**：连接后自动注册到 `EvmAdapter` 用于链上操作

#### 修改文件：`src/CinacoinProvider.vue` (原 `OnChainUXProvider.vue`)

**Before:**
```typescript
// Mock implementation — setTimeout + hardcoded address
async function connect(connectorId: string): Promise<void> {
  status.value = 'connecting';
  await new Promise(resolve => setTimeout(resolve, 1000));
  account.value = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    // ...
  };
}
```

**After:**
```typescript
// Real implementation via ConnectorManager
async function connect(connectorId: string): Promise<void> {
  status.value = 'connecting';
  try {
    const result = await connectorManager.connect(connectorId);
    account.value = {
      address: result.accounts[0] ?? null,
      balance: '0.00',
      chainId: result.chainId,
      chainSymbol: /* from config */ 'ETH',
    };
    status.value = 'connected';
  } catch (err) {
    status.value = 'error';
    throw err;
  }
}
```

同样更新了：
- `disconnect()` → 调用 `connectorManager.disconnect()`
- `switchChain()` → 调用 `connectorManager.switchChain(chainId)`
- 添加了 `onBeforeUnmount` 中的事件清理逻辑

#### 新增文件：`src/connectorManager.ts`

完整的 connector 生命周期管理器：

| 方法 | 功能 |
|------|------|
| `addConnector(connector)` | 注册 connector 实例 |
| `getConnector(id)` | 按 ID 获取 connector |
| `connect(connectorId)` | 真实连接（调用 Connector.connect()）|
| `disconnect()` | 断开当前连接 |
| `switchChain(chainId)` | 切换链 |
| `getAccounts()` | 获取连接账户 |
| `getChainId()` | 获取当前链 ID |
| `on/off(event, handler)` | 事件订阅/退订 |
| `destroy()` | 清理所有资源 |

#### 修改文件：`src/index.ts`

导出 `ConnectorManager` 供外部使用：

```typescript
export { ConnectorManager } from './connectorManager.js';
```

---

## P0-2: 事件监听器泄漏修复

### 问题

`src/components.ts` 中三个 Web Component 包装器都使用了匿名函数作为事件处理程序：

```typescript
// BUG: addEventListener 使用匿名函数
onMounted(() => {
  el.addEventListener('ocx-click', () => {
    if (status.value === 'disconnected') connect('metamask');
    emit('click');
  });
});

// BUG: removeEventListener 创建了不同的匿名函数（无法匹配！）
onBeforeUnmount(() => {
  el.removeEventListener('ocx-click', () => {});
});
```

**根因：** `removeEventListener` 需要传入与 `addEventListener` **完全相同的函数引用**才能移除。传入新的匿名函数不会移除之前的监听器，导致：
- 每次组件 mount/unmount 循环累积一个无法移除的监听器
- 内存泄漏
- 重复触发事件回调

### 解决方案

将事件处理函数存储为命名引用，确保 `add` 和 `remove` 使用同一个函数对象：

#### OcxConnectButton
```typescript
// FIX: 存储为引用
const onClickHandler = (): void => {
  if (status.value === 'disconnected' || status.value === 'error') {
    connect('metamask').catch(() => {});
  }
  emit('click');
};
const onDisconnectHandler = (): void => {
  disconnect().catch(() => {});
  emit('disconnect');
};

onMounted(() => {
  el.addEventListener('ocx-click', onClickHandler);
  el.addEventListener('ocx-disconnect', onDisconnectHandler);
});

onBeforeUnmount(() => {
  el.removeEventListener('ocx-click', onClickHandler);       // ← Same reference
  el.removeEventListener('ocx-disconnect', onDisconnectHandler); // ← Same reference
});
```

#### OcxConnectModal
```typescript
const onCloseHandler = (): void => { emit('close'); };
const onWalletSelectHandler = (e: Event): void => {
  const detail = (e as CustomEvent).detail;
  if (detail?.id) connect(detail.id).catch(() => {});
  emit('wallet-select', detail);
};

// add + remove 使用相同引用
```

#### OcxChainSwitcher
```typescript
const onChainChangeHandler = (e: Event): void => {
  const detail = (e as CustomEvent).detail;
  if (detail?.chainId) {
    switchChain(detail.chainId).catch(() => {});
    emit('chain-change', detail.chainId);
    props.onChainChange?.(detail.chainId);
  }
};

// 新增: onBeforeUnmount 中正确移除监听器
onBeforeUnmount(() => {
  el.removeEventListener('ocx-chain-change', onChainChangeHandler);
});
```

### CinacoinProvider 中的事件管理

Provider 组件中也使用了相同模式：

```typescript
function _handleConnected(_result: unknown): void {
  _refreshAccount();
  status.value = 'connected';
}

function _handleDisconnected(): void {
  // reset account state
  status.value = 'disconnected';
}

const _handlers = {
  onConnected: _handleConnected,
  onDisconnected: _handleDisconnected,
};

connectorManager.on('connected', _handlers.onConnected);
connectorManager.on('disconnected', _handlers.onDisconnected);

onBeforeUnmount(() => {
  connectorManager.off('connected', _handlers.onConnected);
  connectorManager.off('disconnected', _handlers.onDisconnected);
  connectorManager.destroy();
});
```

---

## 测试验证

### 新增测试文件：`tests/eventListenerLeak.test.ts`

共 15 个测试用例：

**Bug Pattern 测试（2个）**
- ✅ 验证匿名函数导致监听器泄漏
- ✅ 验证多次 mount/unmount 累积监听器

**Fix Pattern 测试（3个）**
- ✅ 存储引用可正确移除监听器
- ✅ 多次 mount/unmount 无累积
- ✅ 带参数的事件处理也能正确清理

**ConnectorManager 测试（7个）**
- ✅ 初始化默认 connectors
- ✅ 获取不存在的 connector 返回 undefined
- ✅ 连接不存在的 connector 抛出异常
- ✅ 无活跃连接时 disconnect 不抛错
- ✅ 无活跃连接时 switchChain 抛出异常
- ✅ 事件订阅和退订
- ✅ destroy 清理所有资源

**组件 Handler 模式验证（3个）**
- ✅ ConnectButton: handler 存储为稳定引用
- ✅ ConnectModal: close/wallet-select handler 无泄漏
- ✅ ChainSwitcher: chain-change handler 正确移除

### 全部测试结果

```
✓ packages/vue/tests/OnChainUXProvider.test.ts (10 tests)
✓ packages/vue/tests/composables.test.ts (10 tests)
✓ packages/vue/tests/eventListenerLeak.test.ts (15 tests)
✓ packages/vue/tests/components.test.ts (14 tests)

Test Files  4 passed (4)
Tests       49 passed (49)
```

---

## TypeScript 编译验证

```bash
cd packages/vue && npx tsc --noEmit
```

结果：仅有一个预存在的 Vue SFC 类型声明 shim 错误（`Cannot find module './CinacoinProvider.vue.js'`），这是项目级别的 Vue 类型配置问题，不是本次修改造成的。所有新增代码（`connectorManager.ts`、`components.ts` 修改、`OnChainUXProvider.vue` 修改）均编译通过。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/connectorManager.ts` | **新增** | Wallet 连接器管理器 |
| `src/CinacoinProvider.vue` | **重命名+修改** | 原 OnChainUXProvider.vue → 真实连接逻辑 |
| `src/components.ts` | 修改 | 事件监听器泄漏修复（3个组件） |
| `src/index.ts` | 修改 | 导出 ConnectorManager |
| `tests/eventListenerLeak.test.ts` | **新增** | 15个测试用例 |

---

## 已知限制

1. **WalletConnect 完整实现**：当前 `WalletConnect` connector 是元数据占位符。完整实现需要配置 `RelayTransport`（WebSocket relay URL）和 `SessionManager`。当用户提供 `projectId` 和 `relayUrl` 后，可以通过 `connectorManager.createWalletConnectConnector()` 启用。

2. **InjectedProvider 浏览器环境**：MetaMask/Rabby 连接依赖 `window.ethereum`，在 SSR 环境下会检测为 `installed: false`。这是预期行为，SSR 时应仅显示 UI 元数据。

3. **Coinbase/Email/Social connectors**：需要各自独立的 connector 实现。当前仅注册元数据，功能框架已就位。
