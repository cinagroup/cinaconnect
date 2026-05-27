import type { HeadlessClient } from '@cinacoin/config';
interface AccountDisplayProps {
    client: HeadlessClient;
    connected: boolean;
}
/**
 * HeadlessAccountDisplay — a custom account info display.
 *
 * Shows connected address, balance, and network info using only
 * the headless client API. Fully styleable — no built-in UI.
 *
 * @example
 * ```tsx
 * const client = createHeadlessClient({ projectId })
 *
 * <HeadlessAccountDisplay client={client} connected={!!account} />
 * ```
 */
export declare function HeadlessAccountDisplay({ client, connected, }: AccountDisplayProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=HeadlessAccountDisplay.d.ts.map