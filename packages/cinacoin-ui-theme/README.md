# @cinacoin/cinacoin-ui-theme

Theming, animations, and UI components for Cinacoin with framer-motion and Tailwind CSS.

## Installation

```bash
npm install @cinacoin/cinacoin-ui-theme
```

## Usage

```ts
import { CinacoinThemeProvider, useTheme } from '@cinacoin/cinacoin-ui-theme';

function App() {
  return (
    <CinacoinThemeProvider theme="dark">
      <YourApp />
    </CinacoinThemeProvider>
  );
}

function YourComponent() {
  const { colors, spacing } = useTheme();
  return <div style={{ color: colors.accent }}>Themed content</div>;
}
```

## License

MIT
