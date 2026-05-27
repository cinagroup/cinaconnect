/**
 * Image Optimization for Cinacoin Wallet Icons
 *
 * Lazy-loads wallet icons using IntersectionObserver and provides
 * a fallback for environments where the API is unavailable.
 */
/** Configuration for lazy image loading. */
export interface LazyImageConfig {
    /** Root margin for preloading (e.g., "50px 0px"). */
    rootMargin?: string;
    /** Threshold for visibility detection (0-1). */
    threshold?: number;
    /** Placeholder image data URI or CSS background. */
    placeholder?: string;
}
/**
 * Lazy-load a single image element.
 *
 * @param img - The img element to lazy-load.
 * @param config - Lazy loading configuration.
 * @returns Promise that resolves when the image is loaded.
 */
export declare function lazyLoadImage(img: HTMLImageElement, config?: LazyImageConfig): Promise<void>;
/**
 * Lazy-load all wallet icons in a container.
 *
 * Scans for img elements with data-src attributes and sets up
 * IntersectionObserver-based lazy loading.
 *
 * @param container - The container element containing wallet icons.
 * @param config - Lazy loading configuration.
 * @returns Cleanup function to disconnect the observer.
 */
export declare function lazyLoadAllImages(container: HTMLElement, config?: LazyImageConfig): () => void;
/**
 * Create an optimized wallet icon element.
 *
 * Returns an img element configured for lazy loading with
 * proper alt text and sizing.
 *
 * @param iconUrl - URL of the wallet icon.
 * @param walletName - Wallet name for alt text.
 * @param size - Width/height in pixels.
 * @returns Configured img element.
 */
export declare function createWalletIcon(iconUrl: string, walletName: string, size?: number): HTMLImageElement;
//# sourceMappingURL=image-optimization.d.ts.map