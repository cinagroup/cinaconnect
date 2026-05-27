/**
 * @cinacoin/cdn
 *
 * CDN bundle entry point.
 * Exposes global window.Cinacoin namespace for script-tag usage.
 */
import { getConfig, validateConfig } from "./config.js";
import type { CinacoinConfig } from "./config.js";
import { renderConnectButton, getConnectButtonState, disconnect } from "./connect.js";
import type { ConnectButtonOptions } from "./connect.js";
import { renderConnectModal, showModal, hideModal, toggleModal, getCurrentView } from "./modal.js";
import type { ConnectModalOptions } from "./modal.js";
import { loadModule, isLoaded, getModule, clearCache, preloadModules } from "./loader.js";
import type { LoadState, LoadResult } from "./loader.js";
export interface CinacoinAPI {
    config: () => CinacoinConfig;
    validate: () => string[];
    renderConnectButton: (selector: string, options?: ConnectButtonOptions) => void;
    getButtonState: () => string;
    getButtonAddress: () => string | null;
    disconnect: () => void;
    renderConnectModal: (selector: string, options?: ConnectModalOptions) => void;
    showModal: () => void;
    hideModal: () => void;
    toggleModal: () => void;
    getModalView: () => string;
    getModalAddress: () => string | null;
    loadModule: typeof loadModule;
    isLoaded: typeof isLoaded;
    getModule: typeof getModule;
    clearCache: typeof clearCache;
    preloadModules: typeof preloadModules;
    version: string;
}
declare global {
    interface Window {
        Cinacoin: CinacoinAPI;
    }
}
declare const api: CinacoinAPI;
export { getConfig, validateConfig };
export { renderConnectButton, getConnectButtonState, disconnect };
export { renderConnectModal, showModal, hideModal, toggleModal, getCurrentView };
export { loadModule, isLoaded, getModule, clearCache, preloadModules };
export type { CinacoinConfig, ConnectButtonOptions, ConnectModalOptions, LoadState, LoadResult };
export default api;
//# sourceMappingURL=index.d.ts.map