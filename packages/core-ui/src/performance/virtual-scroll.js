/**
 * Virtual Scroll for Cinacoin Wallet Lists
 *
 * Renders only visible items in large wallet lists to maintain
 * 60fps scrolling performance even with hundreds of items.
 */
/**
 * Calculate which items should be rendered for a given scroll position.
 *
 * @param scrollTop - Current scroll position in pixels.
 * @param config - Virtual scroll configuration.
 * @returns Rendering instructions.
 */
export function calculateVisibleRange(scrollTop, config) {
    const overscan = config.overscan ?? 3;
    const { itemCount, itemHeight, viewportHeight } = config;
    // Clamp scrollTop
    const maxScroll = Math.max(0, itemCount * itemHeight - viewportHeight);
    const clampedScroll = Math.min(scrollTop, maxScroll);
    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(clampedScroll / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2);
    return {
        startIndex,
        endIndex,
        totalHeight: itemCount * itemHeight,
        offset: startIndex * itemHeight,
    };
}
/**
 * Calculate scroll position to bring a specific item into view.
 *
 * @param itemIndex - Index of the item to scroll to.
 * @param config - Virtual scroll configuration.
 * @returns Scroll position to set.
 */
export function scrollToItem(itemIndex, config) {
    const { itemHeight, viewportHeight } = config;
    const itemTop = itemIndex * itemHeight;
    const itemBottom = itemTop + itemHeight;
    const viewportBottom = config.viewportHeight;
    // If item is above viewport, scroll to it
    if (itemTop < 0) {
        return itemTop;
    }
    // If item is below viewport, scroll so it's visible
    return itemTop;
}
/**
 * Create a virtual scroll handler for use with DOM scroll events.
 *
 * Returns a function to call on scroll and helpers for DOM manipulation.
 */
export function createVirtualScroller(config, onRangeChange) {
    let currentRange = null;
    const handler = (scrollTop) => {
        const range = calculateVisibleRange(scrollTop, config);
        if (!currentRange ||
            range.startIndex !== currentRange.startIndex ||
            range.endIndex !== currentRange.endIndex) {
            currentRange = range;
            onRangeChange?.(range);
        }
        return range;
    };
    return {
        /** Call this on scroll events. */
        onScroll: handler,
        /** Get the current visible range without triggering a change event. */
        getCurrentRange: () => currentRange,
    };
}
/**
 * Apply virtual scroll to a wallet list element.
 *
 * @param container - The scrollable container element.
 * @param content - The content wrapper element (receives offset/height).
 * @param renderItem - Function to render a single wallet item.
 * @param config - Virtual scroll configuration.
 */
export function applyVirtualScroll(container, content, renderItem, items, config) {
    const scroller = createVirtualScroller(config, (range) => {
        // Update content height
        content.style.height = `${range.totalHeight}px`;
        content.style.transform = `translateY(${range.offset}px)`;
        // Clear and re-render visible items
        content.innerHTML = '';
        for (let i = range.startIndex; i <= range.endIndex; i++) {
            if (i < items.length) {
                content.appendChild(renderItem(items[i], i));
            }
        }
    });
    const scrollHandler = () => {
        scroller.onScroll(container.scrollTop);
    };
    container.addEventListener('scroll', scrollHandler, { passive: true });
    // Initial render
    scroller.onScroll(0);
    return () => {
        container.removeEventListener('scroll', scrollHandler);
    };
}
//# sourceMappingURL=virtual-scroll.js.map