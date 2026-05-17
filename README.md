# CinaConnect — 自有品牌链上 UX 工具包

> **状态**: 架构设计阶段  
> **创建**: 2026-05-16  
> **目标**: 完全独立于 Reown/WalletConnect，构建自有品牌的链上连接与交互工具包

---

## 📁 文档结构

| 文档 | 说明 |
|------|------|
| [总体架构设计](./Master-Architecture.md) | 项目背景、总体架构图、技术栈、Phase 路线图 |
| [Phase 1: 自建 Relay + RPC 代理](./Phase-1-Relay-RPC.md) | WebSocket Relay、RPC Proxy、Core SDK 详细设计 |
| [Phase 2: 自有品牌 UI 组件库](./Phase-2-UI-Components.md) | Design Token、组件架构、多框架适配、无障碍 |
| [Phase 3: 智能账户 + 支付集成](./Phase-3-Smart-Account.md) | ERC-4337 Bundler、Paymaster、Swap、On-Ramp |
| [Phase 4: 生产部署与监控](./Phase-4-Production.md) | K8s 部署、监控告警、CI/CD、Runbook、SLA |
| [Phase 5: 成本优化与链扩展](./Phase-5-Optimization.md) | 成本分析、链扩展、性能调优、灾备 |

---

## 🗓️ 路线图总览

```
2026 Q3 (M1-M3)          2026 Q4 (M4-M6)           2027 Q1+
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Phase 1          │     │ Phase 3          │     │ Phase 5          │
│ Relay + RPC Proxy│     │ Smart Account    │     │ 成本优化         │
│ Core SDK         │────→│ Swap + OnRamp    │────→│ 链扩展           │
│                  │     │                  │     │ 去中心化演进     │
│ Phase 2          │     │ Phase 4          │     │                  │
│ UI 组件库        │     │ 生产部署         │     │                  │
│ 多框架适配       │     │ 监控告警         │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 💰 投资回报

| 方案 | 月成本 | MAU 限制 | 单点风险 |
|------|--------|---------|---------|
| Reown 商业授权 | $500-5,000 | 500 (超限需付费) | 高 |
| 自建 CinaConnect | $2,800-6,900 | 无限制 | 低 |

> 预期 MAU > 500 时，自建方案 1-3 个月回本

---

*CinaConnect Project — 2026-05-16*
