/**
 * On-Ramp Widget Integration Component
 *
 * Provides a unified widget interface for all supported on-ramp providers.
 * Can be embedded in a web page via iframe or opened as a popup.
 */
// ============================================================
// OnRampWidget
// ============================================================
export class OnRampWidget {
    constructor(aggregator, config) {
        this.iframe = null;
        this.popupWindow = null;
        this.widgetUrl = null;
        this.aggregator = aggregator;
        this.config = {
            width: 400,
            height: 600,
            popupWidth: 480,
            popupHeight: 720,
            popup: true,
            ...config,
        };
    }
    /**
     * Open the widget with the given parameters.
     */
    async open(params) {
        const url = this.aggregator.getWidgetUrl(params);
        if (!url) {
            const result = {
                completed: false,
                error: "No on-ramp providers available",
            };
            this.emitEvent({ type: "error", error: result.error });
            return result;
        }
        this.widgetUrl = url;
        if (this.config.popup) {
            return this.openPopup(url);
        }
        else {
            return this.openEmbedded(url);
        }
    }
    /**
     * Open as a popup window.
     */
    openPopup(url) {
        return new Promise((resolve) => {
            const left = (window.screen.width - this.config.popupWidth) / 2;
            const top = (window.screen.height - this.config.popupHeight) / 2;
            this.popupWindow = window.open(url, "Cinacoin OnRamp", `width=${this.config.popupWidth},height=${this.config.popupHeight},left=${left},top=${top},scrollbars=yes`);
            this.emitEvent({ type: "open" });
            // Poll for popup close
            const checkInterval = setInterval(() => {
                if (this.popupWindow?.closed) {
                    clearInterval(checkInterval);
                    this.emitEvent({ type: "close" });
                    resolve({ completed: false });
                }
            }, 500);
            // Listen for messages from the popup
            const handleMessage = (event) => {
                if (event.data?.type === "onramp_complete") {
                    clearInterval(checkInterval);
                    this.popupWindow?.close();
                    this.emitEvent({ type: "success", result: event.data.result });
                    resolve(event.data.result);
                }
                else if (event.data?.type === "onramp_error") {
                    clearInterval(checkInterval);
                    this.emitEvent({ type: "error", error: event.data.error });
                    resolve({ completed: false, error: event.data.error });
                }
            };
            window.addEventListener("message", handleMessage);
        });
    }
    /**
     * Open as an embedded iframe.
     */
    openEmbedded(url) {
        return new Promise((resolve) => {
            const container = document.getElementById(this.config.containerId || "onramp-widget");
            if (!container) {
                resolve({ completed: false, error: "Widget container not found" });
                return;
            }
            this.iframe = document.createElement("iframe");
            this.iframe.src = url;
            this.iframe.style.width = `${this.config.width}px`;
            this.iframe.style.height = `${this.config.height}px`;
            this.iframe.style.border = "none";
            this.iframe.style.borderRadius = "12px";
            container.innerHTML = "";
            container.appendChild(this.iframe);
            this.emitEvent({ type: "open" });
            // Listen for messages from the iframe
            const handleMessage = (event) => {
                if (event.data?.type === "onramp_complete") {
                    this.emitEvent({ type: "success", result: event.data.result });
                    resolve(event.data.result);
                }
                else if (event.data?.type === "onramp_error") {
                    this.emitEvent({ type: "error", error: event.data.error });
                    resolve({ completed: false, error: event.data.error });
                }
            };
            window.addEventListener("message", handleMessage);
        });
    }
    /**
     * Close the widget.
     */
    close() {
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close();
            this.popupWindow = null;
        }
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        this.emitEvent({ type: "close" });
    }
    /**
     * Emit an event to the callback.
     */
    emitEvent(event) {
        this.config.onEvent?.(event);
    }
}
//# sourceMappingURL=widget.js.map