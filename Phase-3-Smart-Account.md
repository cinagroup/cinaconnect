# Phase 3: 智能账户 + 支付集成 — 详细技术设计

> **目标**: 实现 ERC-4337 智能账户、Bundler、Paymaster 以及 Swap/On-Ramp 支付能力  
> **时间**: M4-M5  
> **产出物**: `bundler`, `paymaster`, `@cinacoin/pay`, `@cinacoin/swap`

---

## 1. 智能账户架构 (ERC-4337)

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        智能账户生态系统                               │
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐          │
│  │  UserOp      │      │  Bundler    │     │  EntryPoint │          │
│  │  构造器      │─────►│  (自建)     │────►│  合约        │          │
│  │  (SDK)       │      │             │     │  (链上)      │          │
│  └─────────────┘      └──────┬──────┘     └──────┬──────┘          │
│                              │                   │                 │
│                    ┌─────────┴─────────┐         │                 │
│                    │                   │         │                 │
│              ┌─────┴─────┐     ┌──────┴───┐     │                 │
│              │ Paymaster │     │ 验证器   │     │                 │
│              │ (Gas 赞助)│     │ (Pimlico)│     │                 │
│              └───────────┘     └──────────┘     │                 │
│                                                  │                 │
│                    ┌─────────────────────────────┘                 │
│                    │                                               │
│              ┌─────┴─────┐                                        │
│              │ Smart     │  ← 用户智能账户合约                      │
│              │ Account   │     Safe / Kernel / 自研                 │
│              └───────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 UserOperation 构造

```typescript
// UserOp 构造器
interface UserOperationBuilder {
  /** 设置发送者 */
  sender(address: string): this;
  
  /** 设置 nonce */
  nonce(nonce: bigint): this;
  
  /** 设置 initCode (首次部署) */
  initCode(factory: string, data: BytesLike): this;
  
  /** 设置调用数据 */
  callData(target: string, value: bigint, data: BytesLike): this;
  
  /** 设置 Gas 限制 */
  callGasLimit(gas: bigint): this;
  verificationGasLimit(gas: bigint): this;
  preVerificationGas(gas: bigint): this;
  
  /** 设置 Gas 价格 */
  maxFeePerGas(gas: bigint): this;
  maxPriorityFeePerGas(gas: bigint): this;
  
  /** 设置 Paymaster (可选) */
  paymaster(paymaster: string): this;
  paymasterVerificationGasLimit(gas: bigint): this;
  paymasterPostOpGasLimit(gas: bigint): this;
  paymasterData(data: BytesLike): this;
  
  /** 设置签名 */
  signature(sig: BytesLike): this;
  
  /** 构建 */
  build(): UserOperation;
  
  /** 估算 Gas */
  estimateGas(): Promise<GasEstimation>;
}

// 使用示例
const userOp = new UserOperationBuilder()
  .sender(smartAccountAddress)
  .nonce(await getNonce(smartAccountAddress))
  .callData(
    targetContract,
    0n,
    encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient, amount],
    })
  )
  .paymaster(paymasterAddress)           // 使用 Paymaster 赞助 Gas
  .paymasterData(encodeSponsorData())
  .signature(await signUserOp(userOp, privateKey))
  .build();
```

### 1.3 自建 Bundler

```rust
// Bundler 核心
#[derive(Clone)]
struct Bundler {
    /// EntryPoint 合约地址
    entry_point: Address,
    
    /// RPC 客户端 (用于发送 bundle 交易)
    rpc_client: JsonRpcClient,
    
    /// UserOp Pool (内存池)
    mempool: Arc<Mutex<UserOpPool>>,
    
    /// Gas 价格预言机
    gas_oracle: GasOracle,
    
    /// Bundler 收益地址
    beneficiary: Address,
    
    /// 配置
    config: BundlerConfig,
}

#[derive(Clone)]
struct BundlerConfig {
    /// 最小 Gas 利润率 (bps)
    min_profit_margin_bps: u16,
    
    /// Bundle 最大 UserOp 数量
    max_ops_per_bundle: usize,
    
    /// Bundle 超时 (ms)
    bundle_timeout_ms: u64,
    
    /// 最小 UserOp Gas 限制
    min_gas_limit: u64,
    
    /// 黑名单地址
    blacklisted_senders: HashSet<Address>,
}

impl Bundler {
    /// 提交 UserOp 到内存池
    async fn submit_user_op(&self, user_op: UserOperation) -> Result<H256> {
        // 1. 验证 UserOp
        self.validate_user_op(&user_op).await?;
        
        // 2. 添加到内存池
        let hash = self.mempool.lock().await.add(user_op)?;
        
        // 3. 触发 bundling
        self.maybe_bundle().await?;
        
        Ok(hash)
    }
    
    /// 打包并发送 Bundle 交易
    async fn maybe_bundle(&self) -> Result<()> {
        let mut mempool = self.mempool.lock().await;
        
        // 1. 获取待打包的 UserOps (按优先级排序)
        let ops = mempool.get_pending(
            self.config.max_ops_per_bundle,
        );
        
        if ops.is_empty() {
            return Ok(());
        }
        
        // 2. 调用 EntryPoint.handleOps()
        let handle_ops_tx = self.create_handle_ops_tx(&ops).await?;
        
        // 3. 发送交易
        let tx_hash = self.rpc_client
            .send_raw_transaction(handle_ops_tx.encode())
            .await?;
        
        // 4. 标记 UserOps 为已发送
        mempool.mark_sent(&ops, tx_hash);
        
        info!("Bundle sent: tx_hash={}, ops={}", tx_hash, ops.len());
        Ok(())
    }
    
    /// 验证 UserOp
    async fn validate_user_op(&self, op: &UserOperation) -> Result<()> {
        // 模拟验证 (eth_call)
        let result = self.rpc_client
            .call(
                EntryPoint::handleOps(vec![op.clone()]),
                BlockId::Latest,
            )
            .await?;
        
        // 检查验证结果
        if !result.success {
            return Err(ValidationError::SimulationFailed(result.reason));
        }
        
        // 检查 Gas 利润率
        let profit = self.calculate_profit(op)?;
        if profit < self.config.min_profit_margin_bps {
            return Err(ValidationError::InsufficientProfit);
        }
        
        // 检查黑名单
        if self.config.blacklisted_senders.contains(&op.sender) {
            return Err(ValidationError::Blacklisted);
        }
        
        Ok(())
    }
}
```

### 1.4 Paymaster 实现

```solidity
// 自有品牌 Paymaster 合约
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CinacoinPaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;
    
    // 赞助模式
    enum SponsorMode {
        Fixed,          // 固定金额赞助
        Percentage,     // 按比例赞助
        FreeTier,       // 免费额度 (每用户每日 N 次)
        Whitelist       // 白名单全额赞助
    }
    
    struct SponsorConfig {
        SponsorMode mode;
        uint256 maxAmountPerOp;      // 单笔最大赞助
        uint256 dailyLimitPerUser;   // 每日每用户限制
        uint256 totalDailyBudget;    // 每日总预算
    }
    
    mapping(address => SponsorConfig) public sponsors;
    mapping(address => uint256) public dailySpent;       // 每日支出
    mapping(address => uint256) public userDailyOps;     // 用户每日操作数
    mapping(address => bool) public whitelistedUsers;
    mapping(address => bool) public whitelistedTargets;  // 白名单目标合约
    
    uint256 public currentDay;
    
    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Not EntryPoint");
        _;
    }
    
    constructor(address _entryPoint) Ownable(msg.sender) {
        entryPoint = IEntryPoint(_entryPoint);
    }
    
    function validatePaymasterUserOp(
        bytes32 userOpHash,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas
    ) external view override onlyEntryPoint returns (
        uint256 validationData,
        bytes memory context
    ) {
        // 解码 UserOp
        (address sender, , , , , , , uint256 callGasLimit, , , , ) = 
            abi.decode(_getUserOpData(userOpHash), (address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes, bytes32));
        
        // 检查赞助配置
        SponsorConfig memory config = sponsors[sender];
        require(config.mode != SponsorMode(0) || whitelistedUsers[sender], "No sponsor config");
        
        // 检查每日限制
        uint256 estimatedCost = callGasLimit * maxFeePerGas;
        require(
            dailySpent[sender] + estimatedCost <= config.totalDailyBudget,
            "Daily budget exceeded"
        );
        
        return (0, abi.encode(sender, estimatedCost));
    }
    
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external override onlyEntryPoint {
        if (mode == PostOpMode.postOpReverted) return;
        
        (address sender, uint256 estimated) = abi.decode(context, (address, uint256));
        
        // 记录实际支出
        dailySpent[sender] += actualGasCost;
        userDailyOps[sender]++;
        
        emit UserOperationSponsored(sender, actualGasCost);
    }
    
    // 管理函数
    function setSponsorConfig(address user, SponsorConfig calldata config) external onlyOwner {
        sponsors[user] = config;
    }
    
    function addToWhitelist(address user) external onlyOwner {
        whitelistedUsers[user] = true;
    }
    
    // 充值
    function deposit() external payable {
        entryPoint.depositTo(address(this));
    }
    
    // 提款
    function withdrawTo(address payable withdrawAddress, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }
    
    event UserOperationSponsored(address indexed user, uint256 gasCost);
}
```

---

## 2. Swap 与 On-Ramp 集成

### 2.1 Swap 聚合器架构

```
┌──────────────────────────────────────────────────────────┐
│                    Swap 聚合器                             │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌───────────┐          │
│  │ 1inch    │    │ Uniswap   │    │ 0x Protocol│         │
│  │ API      │    │ V3/V4     │    │            │         │
│  └────┬─────┘    └─────┬─────┘    └─────┬─────┘         │
│       └────────────────┼────────────────┘                │
│                        │                                 │
│               ┌────────┴────────┐                        │
│               │  价格比较引擎    │                        │
│               │  (最优路径选择)  │                        │
│               └────────┬────────┘                        │
│                        │                                 │
│               ┌────────┴────────┐                        │
│               │  自有 Swap UI   │                        │
│               │  + 滑点保护     │                        │
│               └─────────────────┘                        │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Swap SDK 接口

```typescript
interface SwapSDK {
  /** 获取报价 */
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  
  /** 执行 Swap */
  executeSwap(params: SwapExecuteParams): Promise<SwapReceipt>;
  
  /** 获取支持的 Token 列表 */
  getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
  
  /** 获取价格影响 */
  getPriceImpact(params: SwapQuoteParams): Promise<PriceImpact>;
}

interface SwapQuoteParams {
  fromToken: string;      // Token 地址
  toToken: string;        // Token 地址
  fromAmount: bigint;     // 输入金额 (wei)
  chainId: number;        // 链 ID
  slippageBps: number;    // 最大滑点 (bps)
  recipient?: string;     // 接收地址 (默认 = 发送者)
}

interface SwapQuote {
  toAmount: bigint;       // 预计输出
  priceImpact: number;    // 价格影响 (%)
  route: SwapRoute[];     // 路由路径
  gasEstimate: bigint;    // 预估 Gas
  minimumReceived: bigint;// 最小接收量 (考虑滑点)
  provider: string;       // 来源 DEX
  expiresAt: number;      // 报价过期时间
}
```

### 2.3 On-Ramp 集成

```typescript
// 法币入金聚合
interface OnRampSDK {
  /** 获取支持的 On-Ramp 提供商 */
  getProviders(region: string): Promise<OnRampProvider[]>;
  
  /** 获取报价 */
  getQuote(params: OnRampQuoteParams): Promise<OnRampQuote>;
  
  /** 打开 On-Ramp Widget */
  openWidget(params: OnRampWidgetParams): Promise<OnRampResult>;
}

interface OnRampProvider {
  id: 'moonpay' | 'ramp' | 'transak' | 'stripe' | 'coinbase';
  name: string;
  icon: string;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  fees: OnRampFees;
  regions: string[];
}

// 聚合逻辑：选择最优提供商
function selectBestProvider(
  quote: OnRampQuote[],
  userRegion: string,
  preferences: UserPreferences,
): OnRampProvider {
  return quote
    .filter(q => q.regions.includes(userRegion))
    .sort((a, b) => {
      // 优先级：总费用最低 > 支付方式匹配 > 到账时间最短
      if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
      if (a.estimatedTime !== b.estimatedTime) return a.estimatedTime - b.estimatedTime;
      return 0;
    })[0];
}
```

---

## 3. 多链智能账户

### 3.1 跨链会话同步

```
┌─────────────────────────────────────────────────────────────┐
│                   跨链智能账户                                │
│                                                             │
│  Ethereum          Arbitrum           Optimism              │
│  ┌───────┐        ┌───────┐          ┌───────┐             │
│  │ Safe  │◄──────►│ Safe  │◄────────►│ Safe  │             │
│  │ Account│  CCIP  │ Account│  CCIP  │ Account│             │
│  └───┬───┘        └───┬───┘          └───┬───┘             │
│      │                │                  │                   │
│      └────────────────┼──────────────────┘                   │
│                       │                                      │
│               ┌───────┴───────┐                              │
│               │  跨链状态同步   │  ← 链下索引器                 │
│               │  (Indexer)    │                              │
│               └───────────────┘                              │
│                                                             │
│  用户只需管理一个主密钥，所有链上的智能账户共享同一身份          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Batch Transaction (批量交易)

```typescript
// 批量交易构造
interface BatchTransaction {
  /** 多个操作打包 */
  operations: Operation[];
  
  /** 原子性要求 */
  atomic: boolean;  // true = 全部成功或全部回滚
}

interface Operation {
  type: 'transfer' | 'approve' | 'swap' | 'mint' | 'custom';
  target: string;
  value: bigint;
  data: BytesLike;
}

// 使用示例
const batchTx = {
  operations: [
    // 1. 批准 USDC 支出
    {
      type: 'approve' as const,
      target: USDC_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [UNISWAP_ROUTER, 1_000_000n * 10n ** 6n],
      }),
    },
    // 2. 执行 Swap (USDC → ETH)
    {
      type: 'swap' as const,
      target: UNISWAP_ROUTER,
      value: 0n,
      data: encodeSwapData(...),
    },
    // 3. 添加流动性
    {
      type: 'custom' as const,
      target: UNISWAP_FACTORY,
      value: 0n,
      data: encodeAddLiquidityData(...),
    },
  ],
  atomic: true,  // 全部原子执行
};

// 通过智能账户执行（一次签名，多步操作）
const result = await smartAccount.executeBatch(batchTx);
```

---

## 4. 安全设计

### 4.1 智能账户安全

| 安全措施 | 实现 | 说明 |
|---------|------|------|
| 多签名 | Safe MultiSig | 关键操作需要多签确认 |
| 会话密钥 | 临时签名密钥 | 限定时间/金额/目标合约的会话密钥 |
|  Spending Limit | ERC-20 限额 | 每 Token 每日支出上限 |
| 社交恢复 |  Guardian 机制 | 3/5 可信 Guardian 可恢复账户 |
| 时间锁 | 延迟执行 | 大额交易需 24h 时间锁 |
| 模拟执行 | tenderly_simulate | 执行前模拟检测风险 |

### 4.2 会话密钥 (Session Keys)

```typescript
interface SessionKeyPolicy {
  /** 过期时间 */
  expiresAt: number;
  
  /** 允许的目标合约 */
  allowedTargets: string[];
  
  /** 允许的方法 */
  allowedMethods: string[];
  
  /** 单笔最大金额 */
  maxAmountPerTx: bigint;
  
  /** 每日总限额 */
  dailyLimit: bigint;
  
  /** 允许的链 */
  allowedChains: number[];
}

// 创建会话密钥
async function createSessionKey(
  smartAccount: SmartAccount,
  policy: SessionKeyPolicy,
  dappAddress: string,
): Promise<SessionKey> {
  const sessionKey = generateRandomKey();
  
  // 在智能账户上注册会话密钥 + 策略
  const enableTx = await smartAccount.enableSessionKey(
    sessionKey.publicKey,
    policy,
  );
  
  // 用户签名确认
  const signature = await userSign(enableTx);
  await smartAccount.execute(enableTx, signature);
  
  return {
    privateKey: sessionKey.privateKey,
    publicKey: sessionKey.publicKey,
    expiresAt: policy.expiresAt,
  };
}
```

---

## 5. Paymaster 商业模式

### 5.1 Gas 赞助策略

| 模式 | 描述 | 适用场景 |
|------|------|---------|
| **免费额度** | 每用户每日 N 次免费交易 | 新用户引导 |
| **Token 支付** | 用任意 Token 支付 Gas | ERC-20 Gas 支付 |
| **赞助商模式** | dApp 为用户支付 Gas | 营销活动、空投 |
| **分层订阅** | 付费会员享受免费 Gas | SaaS 模式 |
| **收入分成** | 从交易收入中扣除 Gas | Swap/交易场景 |

### 5.2 Paymaster 收入模型

```
收入来源：
├── 1. Gas 加价 (Bundler 利润)
│   └── Bundler 执行成本 + 利润率 → 用户支付的 Gas
│
├── 2. Swap 手续费
│   └── 从聚合 Swap 中收取 5-20 bps 费用
│
├── 3. On-Ramp 佣金
│   └── 从 On-Ramp 提供商获得 0.5-2% 佣金
│
└── 4. Paymaster 赞助服务
    └── dApp 按使用量付费的 Gas 赞助服务
```

---

## 6. Phase 3 里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|---------|
| M3.1 | Week 1-2 | Bundler 原型 + 本地测试网运行 |
| M3.2 | Week 3-4 | Paymaster 合约 + 审计 |
| M3.3 | Week 5-6 | Swap 聚合器 SDK + UI 组件 |
| M3.4 | Week 7-8 | On-Ramp 聚合集成 |
| M3.5 | Week 9 | 会话密钥 + 社交恢复 |
| M3.6 | Week 10 | 批量交易 + 跨链账户 |
| M3.7 | Week 10 | 集成测试 + 安全审计 |

---

## 7. 依赖的第三方合约

| 合约 | 地址 | 用途 | 审计状态 |
|------|------|------|---------|
| EntryPoint v0.7 | 链上 | ERC-4337 入口点 | 已审计 |
| Safe v1.4.1 | 链上 | 智能账户基础 | 已审计 |
| Kernel (ZeroDev) | 链上 | 模块化智能账户 | 已审计 |
| Pimlico Bundler | SaaS | 参考 Bundler 实现 | 已审计 |

**注意**：所有第三方合约在使用前必须进行独立安全审计。

---

*Phase 3 Design Document v1.0 — 2026-05-16*
