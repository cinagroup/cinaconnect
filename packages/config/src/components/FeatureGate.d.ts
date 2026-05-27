/** Props for the `<FeatureGate>` component. */
export interface FeatureGateProps {
    /** Feature flag key (e.g. `"swap_enabled"`). */
    feature: string;
    /** Content to render when the flag is `true`. */
    children: React.ReactNode;
    /** Optional fallback shown when the flag is `false` or still loading. */
    fallback?: React.ReactNode;
}
/**
 * Conditionally renders children based on a remote feature flag.
 *
 * If the flag is `true` (and not loading), the children are rendered.
 * Otherwise, the optional `fallback` is shown (nothing by default).
 *
 * @example
 * ```tsx
 * import { FeatureGate } from "@cinacoin/config/components";
 *
 * <FeatureGate feature="swap_enabled">
 *   <SwapPanel />
 * </FeatureGate>
 *
 * // With fallback:
 * <FeatureGate
 *   feature="swap_enabled"
 *   fallback={<p>Swapping is currently unavailable.</p>}
 * >
 *   <SwapPanel />
 * </FeatureGate>
 * ```
 */
export declare function FeatureGate({ feature, children, fallback, }: FeatureGateProps): React.ReactElement | null;
//# sourceMappingURL=FeatureGate.d.ts.map