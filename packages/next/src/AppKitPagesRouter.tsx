import React, { type ReactNode } from 'react';
import {
  CinaCoinProvider,
  type CinaCoinConfig,
  type ChainConfig,
  type ThemeMode,
} from '@cinacoin/react';

/**
 * Props for the AppKitPagesRouter component.
 */
export interface AppKitPagesRouterProps {
  /**
   * CinaCoin project ID (from https://cloud.cinacoin.com).
   */
  projectId: string;

  /**
   * Supported chains.
   * @default [{ id: 1, name: 'Ethereum', rpcUrl: 'https://eth.llamarpc.com', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }]
   */
  networks?: ChainConfig[];

  /**
   * Theme mode for the connect UI.
   * @default 'dark'
   */
  themeMode?: ThemeMode;

  /**
   * Optional theme variable overrides (CSS custom properties).
   */
  themeVariables?: Record<string, string>;

  /**
   * App metadata displayed in the connect modal.
   */
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons?: string[];
  };

  /**
   * Recommended wallet connector IDs for ordering in the connect UI.
   */
  recommendedWallets?: string[];

  /**
   * Children to render within the provider.
   */
  children: ReactNode;
}

/**
 * Default Ethereum mainnet chain configuration.
 */
const defaultChain: ChainConfig = {
  id: 1,
  name: 'Ethereum',
  rpcUrl: 'https://eth.llamarpc.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorerUrl: 'https://etherscan.io',
};

/**
 * AppKitPagesRouter — SSR-safe provider for Next.js Pages Router (legacy `_app.tsx`).
 *
 * Unlike the App Router provider, this component renders during SSR as well,
 * but initializes the CinaCoin context in a hydration-safe way.
 *
 * Usage:
 * ```tsx
 * // pages/_app.tsx
 * import type { AppProps } from 'next/app';
 * import { AppKitPagesRouter } from '@cinacoin/next';
 *
 * export default function App({ Component, pageProps }: AppProps) {
 *   return (
 *     <AppKitPagesRouter projectId="your-project-id" networks={[mainnet]}>
 *       <Component {...pageProps} />
 *     </AppKitPagesRouter>
 *   );
 * }
 * ```
 */
export function AppKitPagesRouter({
  projectId,
  networks,
  themeMode = 'dark',
  themeVariables,
  metadata,
  recommendedWallets,
  children,
}: AppKitPagesRouterProps): React.JSX.Element {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chains = networks && networks.length > 0 ? networks : [defaultChain];

  const config: CinaCoinConfig = {
    projectId,
    chains,
    theme: {
      mode: themeMode,
      variables: themeVariables,
    },
    metadata,
    recommendedWallets,
  };

  // For Pages Router, we always render the provider, but the inner state
  // (address, balance, etc.) won't hydrate until client-side activation.
  // This is safe because CinaCoinProvider initializes with null/default values.
  if (!mounted) {
    return <CinaCoinProvider config={{ ...config }}>{children}</CinaCoinProvider>;
  }

  return (
    <CinaCoinProvider config={config}>
      {children}
    </CinaCoinProvider>
  );
}
