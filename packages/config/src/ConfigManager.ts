import { createClient, type Client } from "@cinacoin/core-sdk";

/**
 * Remote configuration options for initializing the feature flag system.
 */
export interface RemoteConfig {
  /** Project identifier used to fetch remote feature flags. */
  projectId: string;
  /** Polling interval in milliseconds. Defaults to 300000 (5 min). */
  pollingInterval?: number;
  /** Fallback flag values used when the remote endpoint is unreachable. */
  fallback?: Record<string, boolean>;
}

/**
 * Built-in feature flags available in the system.
 * Additional flags can be defined at runtime via the `[key: string]` index.
 */
export interface FeatureFlags {
  headless: boolean;
  analytics_enabled: boolean;
  swap_enabled: boolean;
  onramp_enabled: boolean;
  smart_accounts_enabled: boolean;
  social_login_enabled: boolean;
  [key: string]: boolean;
}

/**
 * Callback signature for feature flag change listeners.
 */
export type FeatureChangeCallback = (flag: string, value: boolean) => void;

/** Internal options after defaults are applied. */
interface NormalizedConfig {
  projectId: string;
  pollingInterval: number;
  fallback: Record<string, boolean>;
}

/** Default feature flags — safe baseline when nothing remote is available. */
const DEFAULT_FEATURES: FeatureFlags = {
  headless: true,
  analytics_enabled: true,
  swap_enabled: true,
  onramp_enabled: true,
  smart_accounts_enabled: false,
  social_login_enabled: false,
};

/** Default polling interval: 5 minutes. */
const DEFAULT_POLLING_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Resolve the remote feature-flag URL for a given project.
 *
 * In production this hits your backend / CDN.  Override the base URL
 * by setting `CINA_CONNECT_CONFIG_BASE_URL` in the environment.
 */
function resolveConfigUrl(projectId: string): string {
  const baseUrl =
    typeof process !== "undefined" && process.env?.CINA_CONNECT_CONFIG_BASE_URL
      ? process.env.CINA_CONNECT_CONFIG_BASE_URL
      : "https://config.cinacoin.io";
  return `${baseUrl}/v1/projects/${projectId}/features`;
}

/**
 * **ConfigManager** — Central manager for remote feature flags.
 *
 * Handles fetching, caching, polling, and change notifications for
 * feature flags tied to a project.  Falls back to local defaults when
 * the remote endpoint is unavailable.
 *
 * @example
 * ```ts
 * const config = ConfigManager.create({ projectId: "proj_abc123" });
 * await config.init();
 *
 * if (config.getFeature("swap_enabled")) {
 *   // show swap UI
 * }
 *
 * config.onFeatureChange("swap_enabled", (flag, value) => {
 *   console.log(`${flag} is now ${value}`);
 * });
 * ```
 */
export class ConfigManager {
  /** @internal */
  private config: NormalizedConfig;

  /** Current merged feature flags. */
  private features: FeatureFlags;

  /** Flag-specific listener maps: flag → set of callbacks. */
  private listeners: Map<string, Set<FeatureChangeCallback>>;

  /** Active AbortController for the polling loop. */
  private abortController: AbortController | null = null;

  /** Whether `init()` has completed. */
  private initialized = false;

  private constructor(config: RemoteConfig) {
    this.config = {
      projectId: config.projectId,
      pollingInterval: config.pollingInterval ?? DEFAULT_POLLING_INTERVAL_MS,
      fallback: { ...DEFAULT_FEATURES, ...(config.fallback ?? {}) },
    };
    this.features = { ...this.config.fallback } as FeatureFlags;
    this.listeners = new Map();
  }

  // ─── Factory ────────────────────────────────────────────────

  /**
   * Create a new ConfigManager instance.
   *
   * @param config - Remote configuration options.
   * @returns A new (uninitialized) ConfigManager.
   */
  static create(config: RemoteConfig): ConfigManager {
    return new ConfigManager(config);
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  /**
   * Initialize the manager by fetching remote feature flags and
   * starting the background polling loop.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.fetchRemoteFlags();
    this.startPolling();
    this.initialized = true;
  }

  /**
   * Stop the background polling loop.  Existing flag values remain
   * available through `getFeature()` / `getAllFeatures()`.
   */
  destroy(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.initialized = false;
  }

  // ─── Feature access ─────────────────────────────────────────

  /**
   * Get the current value of a single feature flag.
   *
   * @param flag - Flag key (e.g. `"swap_enabled"`).
   * @returns The boolean value of the flag.  Returns `false` for
   *          unknown flags.
   */
  getFeature(flag: string): boolean {
    return this.features[flag] ?? false;
  }

  /**
   * Return a snapshot of all active feature flags.
   *
   * @returns A shallow copy of the current flags.
   */
  getAllFeatures(): Readonly<FeatureFlags> {
    return { ...this.features };
  }

  /**
   * Subscribe to changes on a specific feature flag.
   *
   * The callback is invoked immediately if the flag already has a value.
   *
   * @param flag - Flag key to watch.
   * @param callback - Called with `(flag, newValue)` on every change.
   * @returns An unsubscribe function.
   */
  onFeatureChange(
    flag: string,
    callback: FeatureChangeCallback
  ): () => void {
    if (!this.listeners.has(flag)) {
      this.listeners.set(flag, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.listeners.get(flag)!.add(callback);

    // Immediate invocation with current value
    callback(flag, this.getFeature(flag));

    return () => {
      this.listeners.get(flag)?.delete(callback);
    };
  }

  // ─── Internal helpers ───────────────────────────────────────

  /** Fetch remote flags and merge them over local defaults. */
  private async fetchRemoteFlags(): Promise<void> {
    try {
      const url = resolveConfigUrl(this.config.projectId);
      const response = await fetch(url, {
        signal: this.abortController?.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(
          `[ConfigManager] Remote fetch returned ${response.status} for project ${this.config.projectId}; using fallback.`
        );
        return;
      }

      const remote: Record<string, boolean> = await response.json();
      const previous = { ...this.features };
      this.features = { ...this.config.fallback, ...remote } as FeatureFlags;
      this.notifyChanges(previous);
    } catch (err: unknown) {
      // Network error — keep using fallback.
      console.warn(
        `[ConfigManager] Failed to fetch remote flags:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  /** Start the periodic polling loop. */
  private startPolling(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();

    const poll = async () => {
      await this.fetchRemoteFlags();
      // Schedule next poll (aborted signal will bail out inside fetchRemoteFlags).
      this.abortController?.signal.addEventListener(
        "abort",
        () => {},
        { once: true }
      );
      setTimeout(() => {
        if (!this.abortController?.signal.aborted) {
          poll();
        }
      }, this.config.pollingInterval);
    };

    // First poll is already done in init(); schedule the next one.
    setTimeout(() => {
      if (!this.abortController?.signal.aborted) {
        poll();
      }
    }, this.config.pollingInterval);
  }

  /** Notify listeners whose flags changed between two snapshots. */
  private notifyChanges(previous: FeatureFlags): void {
    for (const [flag, callbacks] of this.listeners) {
      const prev = previous[flag];
      const curr = this.features[flag];
      if (prev !== curr) {
        for (const cb of callbacks) {
          try {
            cb(flag, curr ?? false);
          } catch (err) {
            console.error(
              `[ConfigManager] Error in listener for "${flag}":`,
              err
            );
          }
        }
      }
    }
  }
}

export type { ConfigManager as ConfigManagerInterface };
