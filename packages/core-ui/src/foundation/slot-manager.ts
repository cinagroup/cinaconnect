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
export function getAssignedNodes(host: HTMLElement, slotName = ''): Node[] {
  const slot = host.shadowRoot?.querySelector<HTMLSlotElement>(
    slotName ? `slot[name="${slotName}"]` : 'slot:not([name])'
  );
  return slot?.assignedNodes({ flatten: true }) ?? [];
}

/**
 * Returns the first assigned element matching a selector, or null.
 */
export function getAssignedElement<T extends Element = Element>(
  host: HTMLElement,
  selector: string,
  slotName = ''
): T | null {
  const nodes = getAssignedNodes(host, slotName);
  for (const node of nodes) {
    if (node instanceof Element && node.matches(selector)) {
      return node as T;
    }
  }
  return null;
}

/**
 * Checks whether a named slot has any assigned content.
 */
export function hasSlotContent(host: HTMLElement, slotName = ''): boolean {
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
  #host: HTMLElement;
  #slots: Map<string, SlotDescriptor> = new Map();
  #observer: MutationObserver | null = null;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** Register a named slot to observe. */
  observe(name: string, descriptor: Pick<SlotDescriptor, 'selector'> = {}): void {
    this.#slots.set(name, { name, ...descriptor });
    this.#ensureObserver();
  }

  /** Get assigned nodes for a registered slot. */
  getNodes(name: string): Node[] {
    return getAssignedNodes(this.#host, name);
  }

  /** Check if a registered slot has content. */
  hasContent(name: string): boolean {
    return hasSlotContent(this.#host, name);
  }

  /** Dispose of the mutation observer. */
  dispose(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #ensureObserver(): void {
    if (this.#observer) return;
    this.#observer = new MutationObserver(() => {
      // Trigger re-render if host is a LitElement
      if ('requestUpdate' in this.#host) {
        (this.#host as { requestUpdate: () => void }).requestUpdate();
      }
    });
    this.#observer.observe(this.#host, { childList: true, subtree: true });
  }
}
