# Angular

> `@cinaconnect/angular` — Angular adapter for CinaConnect.

## Installation

```bash
npm install @cinaconnect/angular @cinaconnect/core-sdk
```

## Usage

```typescript
import { CinaConnectModule } from '@cinaconnect/angular'

@NgModule({
  imports: [
    CinaConnectModule.forRoot({
      projectId: 'your-project-id',
    }),
  ],
})
export class AppModule {}
```

## Related

- [React](/api/react) — React adapter
- [Vue](/api/vue) — Vue adapter
