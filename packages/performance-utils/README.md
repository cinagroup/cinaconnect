# @cinacoin/performance-utils

Performance monitoring and optimization utilities for Cinacoin.

## Installation

```bash
npm install @cinacoin/performance-utils
```

## Usage

```ts
import { PerformanceMonitor, optimizeRender, debounce } from '@cinacoin/performance-utils';

// Initialize performance monitoring
const monitor = new PerformanceMonitor({
  appName: 'my-cinacoin-app',
  samplingRate: 0.1,
});

// Optimize expensive renders
const OptimizedComponent = optimizeRender(MyComponent);

// Debounce utility
const debouncedSearch = debounce(searchFn, 300);
```

## License

MIT
