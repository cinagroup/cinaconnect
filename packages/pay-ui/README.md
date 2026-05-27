# @cinacoin/pay-ui

Cinacoin Pay UI Components — Swap & On-Ramp widgets with React + Web Components.

## Installation

```bash
npm install @cinacoin/pay-ui
```

## Usage

```tsx
import { SwapWidget, OnRampWidget } from '@cinacoin/pay-ui';

<SwapWidget fromToken="ETH" toToken="USDC" />
<OnRampWidget currency="USD" />
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SwapWidget` | component | Swap widget UI |
| `OnRampWidget` | component | On-ramp widget UI |
| `SwapWidgetCore` | class | Core swap logic |
| `OnRampWidgetCore` | class | Core on-ramp logic |
| `colors` | const | Color tokens |
| `spacing` | const | Spacing tokens |
| `borderRadius` | const | Border radius tokens |
| `getWidgetStyles` | function | Get widget styles |
| `SwapWidgetProps` | type | Swap props type |
| `OnRampWidgetProps` | type | On-ramp props type |
