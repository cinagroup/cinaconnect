# @cinacoin/ui-theme

Cinacoin UI theme tokens, animations, and base components.

## Installation

```bash
npm install @cinacoin/ui-theme
```

## Usage

```ts
import { ThemeProvider, tokens, createTheme } from '@cinacoin/ui-theme';

// Use design tokens
const theme = createTheme({
  colors: {
    primary: tokens.colors.blue500,
    accent: tokens.colors.purple500,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

## License

MIT
