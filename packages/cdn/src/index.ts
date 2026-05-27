/**
 * @cinacoin/cdn
 *
 * CDN bundle entry point.
 * Exposes global window.Cinacoin namespace for script-tag usage.
 */

import { getConfig, validateConfig } from "./config.js";
import type { CinacoinConfig } from "./config.js";
import {
  renderConnectButton,
  getConnectButtonState,
  getConnectedAddress as getButtonAddress,
  disconnect,
} from "./connect.js";
import type { ConnectButtonOptions } from "./connect.js";
import {
  renderConnectModal,
  showModal,
  hideModal,
  toggleModal,
  getCurrentView,
  getConnectedAddress as getModalAddress,
} from "./modal.js";
import type { ConnectModalOptions } from "./modal.js";
import { loadModule, isLoaded, getModule, clearCache, preloadModules } from "./loader.js";
import type { LoadState, LoadResult } from "./loader.js";

// ============================================================
// Global API — mounted on window.Cinacoin
// ============================================================

export interface CinacoinAPI {
  // Config
  config: () => CinacoinConfig;
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
    Cinacoin: CinacoinAPI;
  }
}

const api: CinacoinAPI = {
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
  window.Cinacoin = api;
}

export { getConfig, validateConfig };
export { renderConnectButton, getConnectButtonState, disconnect };
export { renderConnectModal, showModal, hideModal, toggleModal, getCurrentView };
export { loadModule, isLoaded, getModule, clearCache, preloadModules };
export type { CinacoinConfig, ConnectButtonOptions, ConnectModalOptions, LoadState, LoadResult };
export default api;
