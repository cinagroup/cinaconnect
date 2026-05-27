import { useFeatureFlag } from "../hooks/useFeatures.js";
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
export function FeatureGate({ feature, children, fallback = null, }) {
    const { enabled, loading } = useFeatureFlag(feature);
    // While loading, show nothing (or the fallback if provided)
    if (loading) {
        return fallback;
    }
    if (!enabled) {
        return fallback;
    }
    return children;
}
//# sourceMappingURL=FeatureGate.js.map