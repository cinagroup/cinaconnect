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
export declare const configManagerRef: {
    current: ConfigManager | null;
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
export declare function useFeatureFlag(flag: string): {
    enabled: boolean;
    loading: boolean;
};
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
export declare function useAllFeatures(): {
    features: Readonly<FeatureFlags>;
    loading: boolean;
};
//# sourceMappingURL=useFeatures.d.ts.map