import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
/**
 * HeadlessConnectButton — a completely custom connect button.
 *
 * Uses only the headless client API (`@cinacoin/config`) with zero
 * built-in UI. You control every pixel of the experience.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId: 'your-project-id' })
 *
 * <HeadlessConnectButton
 *   client={client}
 *   onConnected={(account) => console.log('Connected:', account)}
 * />
 * ```
 */
export function HeadlessConnectButton({ client, onConnected, }) {
    const [account, setAccount] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);
    const handleConnect = useCallback(async () => {
        if (account)
            return; // Already connected
        setConnecting(true);
        setError(null);
        try {
            const result = await client.connect();
            const address = result?.address ?? result?.account ?? '0xunknown';
            setAccount(address);
            onConnected?.(address);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        }
        finally {
            setConnecting(false);
        }
    }, [account, client, onConnected]);
    const handleDisconnect = useCallback(async () => {
        try {
            await client.disconnect();
            setAccount(null);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Disconnect failed');
        }
    }, [client]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [!account ? (_jsx("button", { onClick: handleConnect, disabled: connecting, style: {
                    padding: '10px 20px',
                    background: connecting ? '#94a3b8' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: connecting ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                }, children: connecting ? 'Connecting...' : 'Connect Wallet' })) : (_jsx("button", { onClick: handleDisconnect, style: {
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                }, children: "Disconnect" })), error && (_jsx("span", { style: { color: '#dc2626', fontSize: 12 }, children: error }))] }));
}
//# sourceMappingURL=HeadlessConnectButton.js.map