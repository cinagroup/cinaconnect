/**
 * Slot management utilities for Cinacoin Web Components.
 *
 * Provides helpers to detect assigned slots, manage fallback content,
 * and handle named-slot distribution.
 */
/** Named slot descriptor. */
export interface SlotDescriptor {
    name: string;
    /** CSS selector to find the assigned element. */
    selector?: string;
}
/**
 * Returns the list of nodes assigned to a slot.
 */
export declare function getAssignedNodes(host: HTMLElement, slotName?: string): Node[];
/**
 * Returns the first assigned element matching a selector, or null.
 */
export declare function getAssignedElement<T extends Element = Element>(host: HTMLElement, selector: string, slotName?: string): T | null;
/**
 * Checks whether a named slot has any assigned content.
 */
export declare function hasSlotContent(host: HTMLElement, slotName?: string): boolean;
/**
 * SlotManager — track and observe slot changes for a component.
 *
 * Usage:
 *   const manager = new SlotManager(this);
 *   manager.observe('header', { selector: '.header-content' });
 */
export declare class SlotManager {
    #private;
    constructor(host: HTMLElement);
    /** Register a named slot to observe. */
    observe(name: string, descriptor?: Pick<SlotDescriptor, 'selector'>): void;
    /** Get assigned nodes for a registered slot. */
    getNodes(name: string): Node[];
    /** Check if a registered slot has content. */
    hasContent(name: string): boolean;
    /** Dispose of the mutation observer. */
    dispose(): void;
}
//# sourceMappingURL=slot-manager.d.ts.map