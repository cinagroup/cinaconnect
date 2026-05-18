/**
 * On-Ramp Widget Integration Component
 *
 * Provides a unified widget interface for all supported on-ramp providers.
 * Can be embedded in a web page via iframe or opened as a popup.
 */
import type { OnRampResult, OnRampWidgetParams } from "./types.js";
import type { OnRampAggregator } from "./aggregator.js";
export type OnRampWidgetEvent = {
    type: "open";
} | {
    type: "close";
} | {
    type: "success";
    result: OnRampResult;
} | {
    type: "error";
    error: string;
} | {
    type: "payment_initiated";
} | {
    type: "payment_completed";
} | {
    type: "kyc_started";
};
/**
 * Callback type for widget events.
 */
export type OnRampWidgetCallback = (event: OnRampWidgetEvent) => void;
export interface WidgetConfig {
    /** Container element ID for embedded mode */
    containerId?: string;
    /** Widget width in pixels (for embedded mode) */
    width?: number;
    /** Widget height in pixels (for embedded mode) */
    height?: number;
    /** Whether to show as popup instead of embedded */
    popup?: boolean;
    /** Popup window width */
    popupWidth?: number;
    /** Popup window height */
    popupHeight?: number;
    /** Event callback */
    onEvent?: OnRampWidgetCallback;
}
export declare class OnRampWidget {
    private aggregator;
    private iframe;
    private popupWindow;
    private config;
    private widgetUrl;
    constructor(aggregator: OnRampAggregator, config?: WidgetConfig);
    /**
     * Open the widget with the given parameters.
     */
    open(params: OnRampWidgetParams): Promise<OnRampResult>;
    /**
     * Open as a popup window.
     */
    private openPopup;
    /**
     * Open as an embedded iframe.
     */
    private openEmbedded;
    /**
     * Close the widget.
     */
    close(): void;
    /**
     * Emit an event to the callback.
     */
    private emitEvent;
}
//# sourceMappingURL=widget.d.ts.map