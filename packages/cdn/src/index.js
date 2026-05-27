/**
 * @cinacoin/cdn
 *
 * CDN bundle entry point.
 * Exposes global window.Cinacoin namespace for script-tag usage.
 */
import { getConfig, validateConfig } from "./config.js.js";
import { renderConnectButton, getConnectButtonState, getConnectedAddress as getButtonAddress, disconnect, } from "./connect.js.js";
import { renderConnectModal, showModal, hideModal, toggleModal, getCurrentView, getConnectedAddress as getModalAddress, } from "./modal.js.js";
import { loadModule, isLoaded, getModule, clearCache, preloadModules } from "./loader.js.js";
const api = {
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
export default api;
//# sourceMappingURL=index.js.map