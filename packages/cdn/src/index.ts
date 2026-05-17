/**
 * @onchainux/cdn
 *
 * CDN bundle entry point.
 * Exposes global window.OnChainUX namespace for script-tag usage.
 */

import { getConfig, validateConfig } from "./config.js.js";
import type { OnChainUXConfig } from "./config.js.js";
import {
  renderConnectButton,
  getConnectButtonState,
  getConnectedAddress as getButtonAddress,
  disconnect,
} from "./connect.js.js";
import type { ConnectButtonOptions } from "./connect.js.js";
import {
  renderConnectModal,
  showModal,
  hideModal,
  toggleModal,
  getCurrentView,
  getConnectedAddress as getModalAddress,
} from "./modal.js.js";
import type { ConnectModalOptions } from "./modal.js.js";
import { loadModule, isLoaded, getModule, clearCache, preloadModules } from "./loader.js.js";
import type { LoadState, LoadResult } from "./loader.js.js";

// ============================================================
// Global API — mounted on window.OnChainUX
// ============================================================

export interface OnChainUXAPI {
  // Config
  config: () => OnChainUXConfig;
  validate: () => string[];

  // ConnectButton
  renderConnectButton: (selector: string, options?: ConnectButtonOptions) => void;
  getButtonState: () => string;
  getButtonAddress: () => string | null;
  disconnect: () => void;

  // ConnectModal
  renderConnectModal: (selector: string, options?: ConnectModalOptions) => void;
  showModal: () => void;
  hideModal: () => void;
  toggleModal: () => void;
  getModalView: () => string;
  getModalAddress: () => string | null;

  // Loader
  loadModule: typeof loadModule;
  isLoaded: typeof isLoaded;
  getModule: typeof getModule;
  clearCache: typeof clearCache;
  preloadModules: typeof preloadModules;

  // Version
  version: string;
}

// Attach to window if in browser
declare global {
  interface Window {
    OnChainUX: OnChainUXAPI;
  }
}

const api: OnChainUXAPI = {
  config: getConfig,
  validate: () => validateConfig(getConfig()),
  renderConnectButton,
  getButtonState: getConnectButtonState,
  getButtonAddress,
  disconnect,
  renderConnectModal,
  showModal,
  hideModal,
  toggleModal,
  getModalView: getCurrentView,
  getModalAddress,
  loadModule,
  isLoaded,
  getModule,
  clearCache,
  preloadModules,
  version: "0.1.0",
};

if (typeof window !== "undefined") {
  window.OnChainUX = api;
}

export { getConfig, validateConfig };
export { renderConnectButton, getConnectButtonState, disconnect };
export { renderConnectModal, showModal, hideModal, toggleModal, getCurrentView };
export { loadModule, isLoaded, getModule, clearCache, preloadModules };
export type { OnChainUXConfig, ConnectButtonOptions, ConnectModalOptions, LoadState, LoadResult };
export default api;
