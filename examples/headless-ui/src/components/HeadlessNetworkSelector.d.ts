import type { HeadlessClient } from '@cinacoin/config';
interface NetworkOption {
    chainId: number;
    name: string;
    rpcUrl?: string;
    icon?: string;
}
interface NetworkSelectorProps {
    client: HeadlessClient;
    networks: NetworkOption[];
    currentChainId?: number;
    onNetworkChange?: (chainId: number) => void;
}
/**
 * HeadlessNetworkSelector — a custom network/chain selector.
 *
 * Renders a fully custom dropdown for switching chains using only
 * the headless client API. No built-in UI components involved.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId })
 *
 * <HeadlessNetworkSelector
 *   client={client}
 *   networks={[
 *     { chainId: 1, name: 'Ethereum', icon: '🔵' },
 *     { chainId: 137, name: 'Polygon', icon: '🟣' },
 *   ]}
 *   currentChainId={currentChain}
 *   onNetworkChange={(id) => console.log('Switched to', id)}
 * />
 * ```
 */
export declare function HeadlessNetworkSelector({ client, networks, currentChainId, onNetworkChange, }: NetworkSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=HeadlessNetworkSelector.d.ts.map