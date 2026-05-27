/**
 * Fixtures — Common test fixtures for Cinacoin testing.
 *
 * Pre-built addresses, signatures, ABIs, events, and configuration objects
 * that cover the most common testing scenarios.
 */
// ── Addresses ───────────────────────────────────────────────────────────────
export const ADDRESSES = {
    zero: "0x0000000000000000000000000000000000000000",
    deployer: "0x0000000000000000000000000000000000000001",
    user1: "0x0000000000000000000000000000000000000001",
    user2: "0x0000000000000000000000000000000000000002",
    user3: "0x0000000000000000000000000000000000000003",
    contract: "0xdead000000000000000000000000000000000001",
    ens: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
};
// ── Signatures ──────────────────────────────────────────────────────────────
export const SIGNATURES = {
    valid: "0x" + "aa".repeat(65),
    empty: "0x",
    malformed: "0xnotarealsignature",
    short: "0xaabb",
};
// ── Hashes ──────────────────────────────────────────────────────────────────
export const HASHES = {
    tx: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    block: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    data: "0xdeadbeef",
    emptyData: "0x",
};
// ── Typed Data (EIP-712) ────────────────────────────────────────────────────
export const TYPED_DATA = {
    domain: {
        name: "Cinacoin Test",
        version: "1",
        chainId: 1,
        verifyingContract: ADDRESSES.contract,
    },
    types: {
        Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
        ],
        Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
        ],
    },
    primaryType: "Mail",
    message: {
        from: { name: "Alice", wallet: ADDRESSES.user1 },
        to: { name: "Bob", wallet: ADDRESSES.user2 },
        contents: "Hello, Cinacoin!",
    },
};
// ── ABIs ────────────────────────────────────────────────────────────────────
export const ERC20_ABI = [
    {
        type: "function",
        name: "balanceOf",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "transfer",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "approve",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "Transfer",
        inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "Approval",
        inputs: [
            { name: "owner", type: "address", indexed: true },
            { name: "spender", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
        ],
    },
];
export const ERC721_ABI = [
    {
        type: "function",
        name: "balanceOf",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "transferFrom",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "Transfer",
        inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: true },
        ],
    },
];
// ── Chain fixtures ──────────────────────────────────────────────────────────
export const CHAIN_FIXTURES = {
    mainnet: {
        id: 1,
        chainId: "0x1",
        name: "Ethereum Mainnet",
        symbol: "ETH",
    },
    sepolia: {
        id: 11155111,
        chainId: "0xaa36a7",
        name: "Sepolia",
        symbol: "ETH",
    },
    polygon: {
        id: 137,
        chainId: "0x89",
        name: "Polygon",
        symbol: "MATIC",
    },
};
export const PROVIDER_STATES = {
    disconnected: {
        accounts: [],
        chainId: "0x1",
        isConnected: false,
    },
    connected: {
        accounts: [ADDRESSES.user1],
        chainId: "0x1",
        isConnected: true,
    },
    multiAccount: {
        accounts: [ADDRESSES.user1, ADDRESSES.user2, ADDRESSES.user3],
        chainId: "0x1",
        isConnected: true,
    },
    testnet: {
        accounts: [ADDRESSES.user1],
        chainId: "0xaa36a7",
        isConnected: true,
    },
};
// ── Error fixtures ──────────────────────────────────────────────────────────
export const ERRORS = {
    userRejected: {
        code: 4001,
        message: "User rejected the request.",
    },
    unauthorized: {
        code: 4100,
        message: "The requested method and/or account has not been authorized by the user.",
    },
    unsupportedMethod: {
        code: 4200,
        message: "The requested method is not supported by this provider.",
    },
    disconnected: {
        code: 4900,
        message: "The provider is disconnected from all chains.",
    },
    chainDisconnected: {
        code: 4901,
        message: "The provider is disconnected from the specified chain.",
    },
};
//# sourceMappingURL=fixtures.js.map