import { useState, useEffect, useRef } from "react";
import { ConfigManager, type FeatureFlags } from "../ConfigManager.js";

/**
 * Context for sharing a single ConfigManager across hooks.
 * Set this at the top of your app so all hooks share the same manager.
 *
 * @example
 * ```ts
 * import { configManagerRef } from "@cinacoin/config/hooks";
 * import { ConfigManager } from "@cinacoin/config";
 *
 * configManagerRef.current = ConfigManager.create({ projectId: "proj_abc" });
 * await configManagerRef.current.init();
 * ```
 */
export const configManagerRef: { current: ConfigManager | null } = {
  current: null,
};

/**
 * React hook that returns the state of a single feature flag.
 *
 * @param flag - Flag key (e.g. `"swap_enabled"`).
 * @returns `{ enabled, loading }` — `enabled` is the current boolean
 *          value; `loading` is `true` until the initial remote fetch
 *          completes.
 *
 * @example
 * ```tsx
 * const { enabled, loading } = useFeatureFlag("swap_enabled");
 *
 * if (loading) return <Spinner />;
 * if (!enabled) return <FeatureDisabled />;
 * return <SwapPanel />;
 * ```
 */
export function useFeatureFlag(flag: string): {
  enabled: boolean;
  loading: boolean;
} {
  const [enabled, setEnabled] = useState(() =>
    configManagerRef.current?.getFeature(flag) ?? false
  );
  const [loading, setLoading] = useState(!configManagerRef.current);

  // Track current flag value to avoid stale closures
  const flagRef = useRef(flag);
  flagRef.current = flag;

  useEffect(() => {
    const manager = configManagerRef.current;
    if (!manager) return;

    // Already initialized — read current value
    setEnabled(manager.getFeature(flagRef.current));
    setLoading(false);

    // Subscribe to future changes
    const unsubscribe = manager.onFeatureChange(
      flagRef.current,
      (_f, value) => {
        setEnabled(value);
      }
    );

    return unsubscribe;
  }, [flag]);

  return { enabled, loading };
}

/**
 * React hook that returns all feature flags.
 *
 * @returns `{ features, loading }` — `features` is a read-only snapshot
 *          of all flags; `loading` is `true` until the initial remote
 *          fetch completes.
 *
 * @example
 * ```tsx
 * const { features, loading } = useAllFeatures();
 *
 * if (loading) return <Spinner />;
 * return (
 *   <ul>
 *     {Object.entries(features).map(([k, v]) => (
 *       <li key={k}>{k}: {v ? "✅" : "❌"}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useAllFeatures(): {
  features: Readonly<FeatureFlags>;
  loading: boolean;
} {
  const [features, setFeatures] = useState<Readonly<FeatureFlags>>(
    () => configManagerRef.current?.getAllFeatures() ?? {}
  );
  const [loading, setLoading] = useState(!configManagerRef.current);

  useEffect(() => {
    const manager = configManagerRef.current;
    if (!manager) return;

    setFeatures(manager.getAllFeatures());
    setLoading(false);

    // Subscribe to all known flags
    const unsubscribes: (() => void)[] = [];
    const currentFlags = manager.getAllFeatures();
    for (const flag of Object.keys(currentFlags)) {
      unsubscribes.push(
        manager.onFeatureChange(flag, () => {
          setFeatures(manager.getAllFeatures());
        })
      );
    }

    return () => {
      for (const unsub of unsubscribes) unsub();
    };
  }, []);

  return { features, loading };
}
