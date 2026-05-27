/**
 * @cinacoin/config
 *
 * Remote feature flags, headless mode SDK, and virtual testnet integration.
 *
 * @packageDocumentation
 */

// Core ConfigManager
export {
  ConfigManager,
  type RemoteConfig,
  type FeatureFlags,
  type FeatureChangeCallback,
} from "./ConfigManager.js";

// Headless mode
export {
  createHeadlessClient,
  type HeadlessClientOptions,
  type HeadlessClient,
} from "./headless.js";

// Virtual testnet
export {
  createVirtualTestnet,
  type VirtualTestnet,
  type VirtualTestnetConfig,
  type VirtualTestnetAccount,
} from "./virtual-testnet.js";
