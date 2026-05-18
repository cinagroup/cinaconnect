import { describe, it, expect } from "vitest";
import { WalletRecommender, scoreWallet, getChainCompatibleWallets, DEFAULT_WEIGHTS, } from "../src/index.js.js";
const sampleWallets = [
    {
        id: "metamask",
        name: "MetaMask",
        chains: ["evm", "ethereum", "polygon", "arbitrum"],
        platforms: ["browser", "mobile", "desktop"],
        popularity: 1,
        mobile: true,
        desktop: true,
        extension: true,
    },
    {
        id: "walletconnect",
        name: "WalletConnect",
        chains: ["evm", "solana", "ethereum", "polygon"],
        platforms: ["mobile", "browser"],
        popularity: 2,
        mobile: true,
        desktop: false,
        extension: false,
    },
    {
        id: "phantom",
        name: "Phantom",
        chains: ["solana"],
        platforms: ["browser", "mobile"],
        popularity: 3,
        mobile: true,
        desktop: true,
        extension: true,
    },
    {
        id: "coinbase",
        name: "Coinbase Wallet",
        chains: ["evm", "ethereum"],
        platforms: ["mobile", "browser"],
        popularity: 4,
        mobile: true,
        desktop: false,
        extension: true,
    },
];
describe("WalletRecommender", () => {
    it("registers wallets and recommends", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        const recs = recommender.recommend();
        expect(recs.length).toBeGreaterThan(0);
    });
    it("returns EVM wallets for EVM chain", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        const recs = recommender.recommend();
        const allEvm = recs.every((r) => r.wallet.chains.includes("evm"));
        expect(allEvm).toBe(true);
    });
    it("returns Solana wallets for Solana chain", () => {
        const recommender = new WalletRecommender({
            targetChain: "solana",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        const recs = recommender.recommend();
        expect(recs.length).toBeGreaterThan(0);
        expect(recs[0].wallet.id).toBe("phantom");
    });
    it("limits results", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        const recs = recommender.recommend(2);
        expect(recs.length).toBe(2);
    });
    it("gets best wallet", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        const best = recommender.getBestWallet();
        expect(best).not.toBeNull();
        expect(best.score).toBeGreaterThan(0);
    });
    it("boosts EIP-6963 installed wallets", () => {
        const wallets = [
            {
                id: "wallet-a",
                name: "Wallet A",
                chains: ["evm"],
                platforms: ["browser"],
                popularity: 1,
                isEIP6963Installed: false,
                extension: true,
            },
            {
                id: "wallet-b",
                name: "Wallet B",
                chains: ["evm"],
                platforms: ["browser"],
                popularity: 2,
                isEIP6963Installed: true,
                extension: true,
            },
        ];
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(wallets);
        const recs = recommender.recommend();
        // Wallet B should rank higher due to EIP-6963 boost
        expect(recs[0].wallet.id).toBe("wallet-b");
    });
    it("learns from user behavior", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
            behavior: {
                history: ["coinbase", "metamask"],
                successRates: { coinbase: 0.9 },
            },
        });
        recommender.registerWallets(sampleWallets);
        const recs = recommender.recommend();
        // Coinbase should be boosted due to high success rate and history
        const coinbase = recs.find((r) => r.wallet.id === "coinbase");
        expect(coinbase).toBeDefined();
        expect(coinbase.score).toBeGreaterThan(0);
    });
    it("records usage and updates behavior", () => {
        const recommender = new WalletRecommender({
            targetChain: "evm",
            platform: "browser",
        });
        recommender.registerWallets(sampleWallets);
        recommender.recordUsage("metamask", true);
        recommender.recordUsage("metamask", true);
        const recs = recommender.recommend();
        const mm = recs.find((r) => r.wallet.id === "metamask");
        expect(mm).toBeDefined();
        // Should have a behavior boost
        expect(mm.reasons).toContain("Previously used");
    });
});
describe("Scoring functions", () => {
    it("getChainCompatibleWallets filters correctly", () => {
        const evm = getChainCompatibleWallets(sampleWallets, "evm");
        expect(evm.length).toBe(3); // metamask, walletconnect, coinbase
        const solana = getChainCompatibleWallets(sampleWallets, "solana");
        expect(solana.length).toBe(2); // walletconnect, phantom
    });
    it("scoreWallet returns valid score and reasons", () => {
        const rec = scoreWallet(sampleWallets[0], // MetaMask
        { targetChain: "evm", platform: "browser", isMobile: false }, { history: [], successRates: {} }, DEFAULT_WEIGHTS);
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.reasons.length).toBeGreaterThan(0);
        expect(rec.reasons).toContain("Supports evm");
    });
    it("scoreWallet gives zero for incompatible chain", () => {
        const rec = scoreWallet(sampleWallets[2], // Phantom (solana only)
        { targetChain: "bitcoin", platform: "browser", isMobile: false }, { history: [], successRates: {} }, DEFAULT_WEIGHTS);
        expect(rec.score).toBe(0);
    });
});
