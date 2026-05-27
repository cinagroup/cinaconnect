import { createClient, } from "@cinacoin/core-sdk";
/**
 * Create a headless SDK client with no UI.
 *
 * The returned `HeadlessClient` gives you the full `@cinacoin/core-sdk`
 * API so you can build your own UI on top.
 *
 * @param options - Project + wallet options.
 * @returns A `HeadlessClient` instance ready to use.
 *
 * @example
 * ```ts
 * const client = createHeadlessClient({ projectId, walletId });
 * await client.connect();
 * ```
 */
export function createHeadlessClient(options) {
    const client = createClient({
        ...options,
        // Force headless mode — no UI overlays, no modals.
        mode: "headless",
    });
    return client;
}
//# sourceMappingURL=headless.js.map