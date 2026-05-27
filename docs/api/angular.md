# Angular SDK API

> `@cinacoin/angular` — Angular 钱包连接模块。

## Installation

```bash
npm install @cinacoin/angular
```

## Setup

### Module

```typescript
import { NgModule } from '@angular/core'
import { CinacoinModule } from '@cinacoin/angular'

@NgModule({
  imports: [
    CinacoinModule.forRoot({
      projectId: 'your-project-id',
      relayUrl: 'wss://relay.yourdomain.com/v1',
      chains: [
        { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrl: 'https://eth.llamarpc.com' },
      ],
      metadata: { name: 'My Angular dApp', description: 'Angular dApp with Cinacoin', url: window.location.origin, icons: [] },
    }),
  ],
})
export class AppModule {}
```

### Service

```typescript
import { Component } from '@angular/core'
import { CinacoinService } from '@cinacoin/angular'

@Component({ /* ... */ })
export class WalletComponent {
  constructor(private cinaConnect: CinacoinService) {}

  async connect() {
    await this.cinaConnect.connect()
  }

  async disconnect() {
    await this.cinaConnect.disconnect()
  }
}
```

## Components

### ConnectButtonComponent

```html
<ocx-connect-button label="Connect Wallet"></ocx-connect-button>
```

### AccountButtonComponent

```html
<ocx-account-button></ocx-account-button>
```

### NetworkButtonComponent

```html
<ocx-network-button></ocx-network-button>
```

## Pipes

### AddressPipe

缩短地址显示：

```html
<p>{{ address | address }}</p>
<!-- 输出: 0x1234...5678 -->
```

### BalancePipe

格式化余额显示：

```html
<p>{{ balance | balance }}</p>
<!-- 输出: 1.234 ETH -->
```

## Directives

### ConnectDirective

```html
<button [ocxConnect]="connector">Connect</button>
```

## EIP-5792 Service

```typescript
import { Eip5792Service } from '@cinacoin/angular'

@Component({ /* ... */ })
export class BatchComponent {
  constructor(private eip5792: Eip5792Service) {}

  async sendBatch() {
    const result = await this.eip5792.sendCalls({
      calls: [
        { to: '0x...', value: '0x0', data: '0x...' },
      ],
    })
    const status = await this.eip5792.getCallsStatus(result.id)
  }
}
```

## Error Handling

CinacoinService 提供 `error$` observable：

```typescript
this.cinaConnect.error$.subscribe(err => {
  if (err) console.error('Wallet error:', err.message)
})
```

## See Also

- [Core SDK](./core-sdk.md)
- [React SDK](./react.md)
