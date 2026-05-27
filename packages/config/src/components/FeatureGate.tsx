import { useFeatureFlag } from "../hooks/useFeatures.js";

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
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: FeatureGateProps): React.ReactElement | null {
  const { enabled, loading } = useFeatureFlag(feature);

  // While loading, show nothing (or the fallback if provided)
  if (loading) {
    return fallback as React.ReactElement | null;
  }

  if (!enabled) {
    return fallback as React.ReactElement | null;
  }

  return children as React.ReactElement;
}
