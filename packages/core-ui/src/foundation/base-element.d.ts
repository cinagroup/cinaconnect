/**
 * BaseLitElement — base class for all Cinacoin Web Components.
 *
 * Provides:
 * - Automatic CSS variable injection from design tokens
 * - Theme switching via `data-ocx-theme` attribute
 * - Scoped shadow DOM styling
 * - Accessibility defaults
 */
import { LitElement, CSSResultGroup } from 'lit';
/** Supported theme identifiers. */
export type OCXTheme = 'dark' | 'light' | 'minimal';
/** Base element class that all OCX components extend. */
export declare abstract class BaseLitElement extends LitElement {
    /** Current theme name. */
    protected theme: OCXTheme;
    /** Host-level CSS variables injected into the component. */
    static hostStyles: import("lit").CSSResult;
    /** Override in subclasses to provide component-specific styles. */
    static get styles(): CSSResultGroup;
    connectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
    /** Read the effective theme from the host or inherited attribute. */
    private _applyTheme;
    /** Utility: format an Ethereum address as 0x1234...5678. */
    protected formatAddress(address: string, prefix?: number, suffix?: number): string;
    /** Utility: format a balance with locale-aware separators. */
    protected formatBalance(value: number | string, decimals?: number): string;
}
//# sourceMappingURL=base-element.d.ts.map