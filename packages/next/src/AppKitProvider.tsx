'use client';

import React, { type ReactNode } from 'react';
import {
  CinaCoinProvider,
  type CinaCoinConfig,
  type ChainConfig,
  type ThemeMode,
} from '@cinacoin/react';

/**
 * Props for the AppKitProvider component.
 */
export interface AppKitProviderProps {
  /**
   * CinaCoin project ID (from https://cloud.cinacoin.com).
   */
  projectId: string;

  /**
   * Supported chains. Each chain must define an `id` and `nativeCurrency`.
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
 * AppKitProvider — App Router compatible provider for Next.js 13+.
 *
 * This is a `'use client'` component that wraps the CinaCoin React provider
 * with Next.js-specific considerations:
 *
 * - Hydration-safe initialization (avoids SSR/CSR mismatch on address, chainId, etc.)
 * - Defers provider rendering until mounted on the client
 * - Passes project ID through to the underlying CinaCoinConfig
 *
 * Usage:
 * ```tsx
 * // app/providers.tsx
 * 'use client';
 * import { AppKitProvider } from '@cinacoin/next';
 * import { mainnet } from 'viem/chains';
 *
 * export function Providers({ children }) {
 *   return (
 *     <AppKitProvider projectId="your-project-id" networks={[mainnet]}>
 *       {children}
 *     </AppKitProvider>
 *   );
 * }
 * ```
 */
export function AppKitProvider({
  projectId,
  networks,
  themeMode = 'dark',
  themeVariables,
  metadata,
  recommendedWallets,
  children,
}: AppKitProviderProps): React.JSX.Element {
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

  // During SSR, render children without the CinaCoin provider to avoid
  // hydration mismatch. The provider activates on first client render.
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <CinaCoinProvider config={config}>
      {children}
    </CinaCoinProvider>
  );
}
