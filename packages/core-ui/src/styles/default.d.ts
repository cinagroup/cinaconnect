/**
 * Default CSS styles for Cinacoin components.
 *
 * Provides CSS custom property defaults and global resets that are applied
 * when the @cinacoin/design-tokens package is loaded.
 */
/** Global CSS that should be injected at the application root. */
export declare const defaultStyles: import("lit").CSSResult;
/** Utility: truncate an Ethereum address. */
export declare function truncateAddress(address: string, prefix?: number, suffix?: number): string;
/** Utility: format a number with locale-aware separators. */
export declare function formatNumber(value: number | string, decimals?: number): string;
/**
 * Generate a deterministic avatar gradient from an address.
 * Returns a CSS linear-gradient string.
 */
export declare function addressAvatarGradient(address: string): string;
//# sourceMappingURL=default.d.ts.map