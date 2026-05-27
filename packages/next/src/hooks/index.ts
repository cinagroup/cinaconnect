// Core hooks from @cinacoin/react
export {
  useCinacoin,
  useDisconnect,
} from '@cinacoin/react';

// Alias for account data (mapped to available exports)
export { useCinacoinContext as useCinacoinAccount } from '@cinacoin/react';

// Alias for chain data (mapped to available exports)
export { useChainId as useCinacoinNetwork } from '@cinacoin/react';

// Convenience hooks — these wrap useCinacoinContext for common use cases
import { useCinacoinContext } from '@cinacoin/react';

type ContextInfo = ReturnType<typeof useCinacoinContext>;

/** Wallet information derived from the Cinacoin context. */
export function useWalletInfo(): { name: string; icon: string } & ContextInfo {
  const ctx = useCinacoinContext();
  return {
    name: 'Unknown',
    icon: '',
    ...ctx,
  } as { name: string; icon: string } & ContextInfo;
}

/** Balance information — returns balance from context if available. */
export function useBalance(): { balance: string; symbol: string } & ContextInfo {
  const ctx = useCinacoinContext();
  return {
    balance: (ctx as any)?.balance ?? '0',
    symbol: 'ETH',
    ...ctx,
  } as { balance: string; symbol: string } & ContextInfo;
}

/** AppKit UI control — returns open/close helpers from context. */
export function useAppKit(): {
  open: () => void;
  close: () => void;
} & ContextInfo {
  const ctx = useCinacoinContext();
  return {
    open: () => (ctx as any)?.open?.(),
    close: () => (ctx as any)?.close?.(),
    ...ctx,
  } as { open: () => void; close: () => void } & ContextInfo;
}
