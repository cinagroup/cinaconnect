/**
 * On-Ramp Widget Integration Component
 *
 * Provides a unified widget interface for all supported on-ramp providers.
 * Can be embedded in a web page via iframe or opened as a popup.
 */

import type { OnRampResult, OnRampWidgetParams } from "./types.js";
import type { OnRampAggregator } from "./aggregator.js";

// ============================================================
// Events emitted by the widget
// ============================================================

export type OnRampWidgetEvent =
  | { type: "open" }
  | { type: "close" }
  | { type: "success"; result: OnRampResult }
  | { type: "error"; error: string }
  | { type: "payment_initiated" }
  | { type: "payment_completed" }
  | { type: "kyc_started" };

/**
 * Callback type for widget events.
 */
export type OnRampWidgetCallback = (event: OnRampWidgetEvent) => void;

// ============================================================
// Widget Configuration
// ============================================================

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

// ============================================================
// OnRampWidget
// ============================================================

export class OnRampWidget {
  private aggregator: OnRampAggregator;
  private iframe: HTMLIFrameElement | null = null;
  private popupWindow: Window | null = null;
  private config: WidgetConfig;
  private widgetUrl: string | null = null;

  constructor(aggregator: OnRampAggregator, config?: WidgetConfig) {
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
  async open(params: OnRampWidgetParams): Promise<OnRampResult> {
    const url = this.aggregator.getWidgetUrl(params);

    if (!url) {
      const result: OnRampResult = {
        completed: false,
        error: "No on-ramp providers available",
      };
      this.emitEvent({ type: "error", error: result.error! });
      return result;
    }

    this.widgetUrl = url;

    if (this.config.popup) {
      return this.openPopup(url);
    } else {
      return this.openEmbedded(url);
    }
  }

  /**
   * Open as a popup window.
   */
  private openPopup(url: string): Promise<OnRampResult> {
    return new Promise((resolve) => {
      const left = (window.screen.width - this.config.popupWidth!) / 2;
      const top = (window.screen.height - this.config.popupHeight!) / 2;

      this.popupWindow = window.open(
        url,
        "Cinacoin OnRamp",
        `width=${this.config.popupWidth},height=${this.config.popupHeight},left=${left},top=${top},scrollbars=yes`,
      );

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
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "onramp_complete") {
          clearInterval(checkInterval);
          this.popupWindow?.close();
          this.emitEvent({ type: "success", result: event.data.result });
          resolve(event.data.result as OnRampResult);
        } else if (event.data?.type === "onramp_error") {
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
  private openEmbedded(url: string): Promise<OnRampResult> {
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
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "onramp_complete") {
          this.emitEvent({ type: "success", result: event.data.result });
          resolve(event.data.result as OnRampResult);
        } else if (event.data?.type === "onramp_error") {
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
  close(): void {
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
  private emitEvent(event: OnRampWidgetEvent): void {
    this.config.onEvent?.(event);
  }
}
