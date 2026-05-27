/**
 * Sui-specific types for the Cinacoin Sui adapter.
 *
 * Mirrors the shape of Sui RPC responses and wallet provider interfaces
 * without requiring `@mysten/sui.js` as a direct dependency.
 * Consumers who install the Sui SDK get full types; everyone else gets
 * enough to build, sign, and execute transactions.
 *
 * @packageDocumentation
 */
/* ------------------------------------------------------------------ */
/*  Sui address validation                                             */
/* ------------------------------------------------------------------ */
/**
 * Validate a Sui address.
 *
 * Sui addresses are hex strings prefixed with `0x`, typically 64 or 66
 * characters long (including `0x`), derived from the public key.
 */
export function isValidSuiAddress(address) {
    if (typeof address !== 'string')
        return false;
    // Sui addresses start with 0x and are hex
    if (!address.startsWith('0x'))
        return false;
    const hex = address.slice(2);
    // Must be at least 32 bytes (64 hex chars)
    if (hex.length < 64)
        return false;
    // Check valid hex
    return /^[0-9a-fA-F]+$/.test(hex);
}
//# sourceMappingURL=types.js.map