import React from 'react';
import { ConnectButton } from '@cinacoin/react';

// OnuxProvider, AccountButton, NetworkButton — placeholder exports
// These will be implemented when @cinacoin/react adds them
export { ConnectButton };

/** Placeholder OnuxProvider component */
export function OnuxProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

/** Placeholder AccountButton component */
export function AccountButton(): React.JSX.Element {
  return <button type="button">Account</button>;
}

/** Placeholder NetworkButton component */
export function NetworkButton(): React.JSX.Element {
  return <button type="button">Network</button>;
}
