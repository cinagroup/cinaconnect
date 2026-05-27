# @cinacoin/angular

Angular 17+ support for Cinacoin.

## Installation

```bash
npm install @cinacoin/angular
```

## Usage

### Module-based

```ts
import { CinacoinModule } from '@cinacoin/angular';

@NgModule({
  imports: [
    CinacoinModule.forRoot({
      projectId: 'YOUR_PROJECT_ID',
      networks: [mainnet, arbitrum, base],
    }),
  ],
})
export class AppModule {}
```

### Standalone Components

```ts
import { CinacoinService, CINA_CONNECT_OPTIONS } from '@cinacoin/angular';

@Component({
  providers: [
    CinacoinService,
    { provide: CINA_CONNECT_OPTIONS, useValue: { projectId: 'YOUR_PROJECT_ID' } },
  ],
})
export class AppComponent {}
```

### Template

```html
<cina-connect-button></cina-connect-button>
<cina-account-button *ngIf="account$ | async as account"></cina-account-button>
<cina-network-button></cina-network-button>

<p>Address: {{ address | cinaAddress }}</p>
<p>Balance: {{ balance | cinaBalance }}</p>
```

### Service Injection

```ts
@Component({...})
export class AppComponent {
  account$ = this.cinaConnect.account$;
  network$ = this.cinaConnect.network$;

  constructor(private cinaConnect: CinacoinService) {}

  connect() {
    this.cinaConnect.open();
  }
}
```

## Components

| Component | Selector | Description |
|-----------|----------|-------------|
| ConnectButtonComponent | `<cina-connect-button>` | Connect wallet button |
| AccountButtonComponent | `<cina-account-button>` | Connected account display |
| NetworkButtonComponent | `<cina-network-button>` | Network switcher button |

## Pipes

| Pipe | Usage | Description |
|------|-------|-------------|
| `cinaAddress` | `{{ address \| cinaAddress }}` | Format address: `0x1234...5678` |
| `cinaBalance` | `{{ balance \| cinaBalance }}` | Format balance: `1.234 ETH` |

## Directives

| Directive | Usage | Description |
|-----------|-------|-------------|
| `cinaConnect` | `<button [cinaConnect]="'metamask'">` | Auto-connect on click |
