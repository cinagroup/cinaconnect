/**
 * Virtual Scroll for Cinacoin Wallet Lists
 *
 * Renders only visible items in large wallet lists to maintain
 * 60fps scrolling performance even with hundreds of items.
 */
export interface VirtualScrollConfig {
    /** Total number of items. */
    itemCount: number;
    /** Height of each item in pixels. */
    itemHeight: number;
    /** Height of the viewport container in pixels. */
    viewportHeight: number;
    /** Number of extra items to render above/below viewport (overscan). */
    overscan?: number;
}
export interface VirtualScrollResult {
    /** Index of the first visible item. */
    startIndex: number;
    /** Index of the last visible item (inclusive). */
    endIndex: number;
    /** Total height of all items (for spacer calculation). */
    totalHeight: number;
    /** Offset for the rendered items container (top padding). */
    offset: number;
}
/**
 * Calculate which items should be rendered for a given scroll position.
 *
 * @param scrollTop - Current scroll position in pixels.
 * @param config - Virtual scroll configuration.
 * @returns Rendering instructions.
 */
export declare function calculateVisibleRange(scrollTop: number, config: VirtualScrollConfig): VirtualScrollResult;
/**
 * Calculate scroll position to bring a specific item into view.
 *
 * @param itemIndex - Index of the item to scroll to.
 * @param config - Virtual scroll configuration.
 * @returns Scroll position to set.
 */
export declare function scrollToItem(itemIndex: number, config: VirtualScrollConfig): number;
/**
 * Create a virtual scroll handler for use with DOM scroll events.
 *
 * Returns a function to call on scroll and helpers for DOM manipulation.
 */
export declare function createVirtualScroller(config: VirtualScrollConfig, onRangeChange?: (range: VirtualScrollResult) => void): {
    /** Call this on scroll events. */
    onScroll: (scrollTop: number) => VirtualScrollResult;
    /** Get the current visible range without triggering a change event. */
    getCurrentRange: () => VirtualScrollResult | null;
};
/**
 * Apply virtual scroll to a wallet list element.
 *
 * @param container - The scrollable container element.
 * @param content - The content wrapper element (receives offset/height).
 * @param renderItem - Function to render a single wallet item.
 * @param config - Virtual scroll configuration.
 */
export declare function applyVirtualScroll<T>(container: HTMLElement, content: HTMLElement, renderItem: (item: T, index: number) => HTMLElement, items: T[], config: VirtualScrollConfig): () => void;
//# sourceMappingURL=virtual-scroll.d.ts.map