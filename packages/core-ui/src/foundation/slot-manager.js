/**
 * Slot management utilities for Cinacoin Web Components.
 *
 * Provides helpers to detect assigned slots, manage fallback content,
 * and handle named-slot distribution.
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SlotManager_instances, _SlotManager_host, _SlotManager_slots, _SlotManager_observer, _SlotManager_ensureObserver;
/**
 * Returns the list of nodes assigned to a slot.
 */
export function getAssignedNodes(host, slotName = '') {
    const slot = host.shadowRoot?.querySelector(slotName ? `slot[name="${slotName}"]` : 'slot:not([name])');
    return slot?.assignedNodes({ flatten: true }) ?? [];
}
/**
 * Returns the first assigned element matching a selector, or null.
 */
export function getAssignedElement(host, selector, slotName = '') {
    const nodes = getAssignedNodes(host, slotName);
    for (const node of nodes) {
        if (node instanceof Element && node.matches(selector)) {
            return node;
        }
    }
    return null;
}
/**
 * Checks whether a named slot has any assigned content.
 */
export function hasSlotContent(host, slotName = '') {
    return getAssignedNodes(host, slotName).length > 0;
}
/**
 * SlotManager — track and observe slot changes for a component.
 *
 * Usage:
 *   const manager = new SlotManager(this);
 *   manager.observe('header', { selector: '.header-content' });
 */
export class SlotManager {
    constructor(host) {
        _SlotManager_instances.add(this);
        _SlotManager_host.set(this, void 0);
        _SlotManager_slots.set(this, new Map());
        _SlotManager_observer.set(this, null);
        __classPrivateFieldSet(this, _SlotManager_host, host, "f");
    }
    /** Register a named slot to observe. */
    observe(name, descriptor = {}) {
        __classPrivateFieldGet(this, _SlotManager_slots, "f").set(name, { name, ...descriptor });
        __classPrivateFieldGet(this, _SlotManager_instances, "m", _SlotManager_ensureObserver).call(this);
    }
    /** Get assigned nodes for a registered slot. */
    getNodes(name) {
        return getAssignedNodes(__classPrivateFieldGet(this, _SlotManager_host, "f"), name);
    }
    /** Check if a registered slot has content. */
    hasContent(name) {
        return hasSlotContent(__classPrivateFieldGet(this, _SlotManager_host, "f"), name);
    }
    /** Dispose of the mutation observer. */
    dispose() {
        __classPrivateFieldGet(this, _SlotManager_observer, "f")?.disconnect();
        __classPrivateFieldSet(this, _SlotManager_observer, null, "f");
    }
}
_SlotManager_host = new WeakMap(), _SlotManager_slots = new WeakMap(), _SlotManager_observer = new WeakMap(), _SlotManager_instances = new WeakSet(), _SlotManager_ensureObserver = function _SlotManager_ensureObserver() {
    if (__classPrivateFieldGet(this, _SlotManager_observer, "f"))
        return;
    __classPrivateFieldSet(this, _SlotManager_observer, new MutationObserver(() => {
        // Trigger re-render if host is a LitElement
        if ('requestUpdate' in __classPrivateFieldGet(this, _SlotManager_host, "f")) {
            __classPrivateFieldGet(this, _SlotManager_host, "f").requestUpdate();
        }
    }), "f");
    __classPrivateFieldGet(this, _SlotManager_observer, "f").observe(__classPrivateFieldGet(this, _SlotManager_host, "f"), { childList: true, subtree: true });
};
//# sourceMappingURL=slot-manager.js.map