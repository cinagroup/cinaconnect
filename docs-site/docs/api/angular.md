# Angular

> `@cinacoin/angular` — Angular adapter for Cinacoin.

## Installation

```bash
npm install @cinacoin/angular @cinacoin/core-sdk
```

## Usage

```typescript
import { CinacoinModule } from '@cinacoin/angular'

@NgModule({
  imports: [
    CinacoinModule.forRoot({
      projectId: 'your-project-id',
    }),
  ],
})
export class AppModule {}
```

## Related

- [React](/api/react) — React adapter
- [Vue](/api/vue) — Vue adapter
