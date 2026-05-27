/**
 * Cinacoin Paymaster Deployment Script
 *
 * Deploys CinacoinPaymaster, VerifyingPaymaster, and TokenPaymaster
 * to the configured network using viem.
 *
 * Usage:
 *   bun run deploy.ts --network sepolia --entry-point 0x... --signer 0x...
 *   npx tsx deploy.ts --network sepolia
 */
import { createPublicClient, createWalletClient, http, } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, mainnet, base, arbitrum, optimism } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
const CHAINS = {
    mainnet,
    sepolia,
    base,
    arbitrum,
    optimism,
};
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--network":
                config.chain = CHAINS[args[++i] || "sepolia"];
                break;
            case "--rpc":
                config.rpcUrl = args[++i];
                break;
            case "--private-key":
                config.privateKey = args[++i];
                break;
            case "--entry-point":
                config.entryPoint = args[++i];
                break;
            case "--trusted-signer":
                config.trustedSigner = args[++i];
                break;
        }
    }
    return config;
}
// Default EntryPoint v0.7 addresses
const ENTRY_POINTS = {
    1: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Mainnet
    11155111: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Sepolia
    8453: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Base
    42161: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Arbitrum
    10: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Optimism
};
// ============================================================
// Deployment
// ============================================================
async function deploy(config) {
    console.log("=".repeat(60));
    console.log("Cinacoin Paymaster Deployment");
    console.log("=".repeat(60));
    const chain = config.chain || sepolia;
    const rpcUrl = config.rpcUrl || chain.rpcUrls.default.http[0];
    const entryPoint = config.entryPoint || ENTRY_POINTS[chain.id];
    if (!entryPoint) {
        throw new Error(`No default EntryPoint for chain ID ${chain.id}`);
    }
    const account = privateKeyToAccount(config.privateKey);
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
    });
    console.log(`\nNetwork: ${chain.name} (ID: ${chain.id})`);
    console.log(`Deployer: ${account.address}`);
    console.log(`EntryPoint: ${entryPoint}`);
    // Check deployer balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${balance} wei\n`);
    // Read compiled bytecode
    const bytecode = readBytecode("CinacoinPaymaster");
    // Deploy CinacoinPaymaster
    console.log("Deploying CinacoinPaymaster...");
    const paymasterHash = await walletClient.deployContract({
        abi: paymasterAbi,
        bytecode: bytecode,
        args: [entryPoint],
    });
    const paymasterReceipt = await publicClient.waitForTransactionReceipt({
        hash: paymasterHash,
    });
    const paymasterAddress = paymasterReceipt.contractAddress;
    console.log(`✅ CinacoinPaymaster deployed at: ${paymasterAddress}`);
    // Deploy VerifyingPaymaster
    console.log("\nDeploying VerifyingPaymaster...");
    const verifyingBytecode = readBytecode("VerifyingPaymaster");
    const trustedSigner = config.trustedSigner || account.address;
    const verifyingHash = await walletClient.deployContract({
        abi: verifyingPaymasterAbi,
        bytecode: verifyingBytecode,
        args: [entryPoint, trustedSigner],
    });
    const verifyingReceipt = await publicClient.waitForTransactionReceipt({
        hash: verifyingHash,
    });
    const verifyingAddress = verifyingReceipt.contractAddress;
    console.log(`✅ VerifyingPaymaster deployed at: ${verifyingAddress}`);
    // Deploy TokenPaymaster
    console.log("\nDeploying TokenPaymaster...");
    const tokenBytecode = readBytecode("TokenPaymaster");
    const tokenHash = await walletClient.deployContract({
        abi: tokenPaymasterAbi,
        bytecode: tokenBytecode,
        args: [entryPoint],
    });
    const tokenReceipt = await publicClient.waitForTransactionReceipt({
        hash: tokenHash,
    });
    const tokenAddress = tokenReceipt.contractAddress;
    console.log(`✅ TokenPaymaster deployed at: ${tokenAddress}`);
    // Write deployment addresses
    const deploymentInfo = {
        chain: chain.name,
        chainId: chain.id,
        entryPoint,
        contracts: {
            cinacoinPaymaster: paymasterAddress,
            verifyingPaymaster: verifyingAddress,
            tokenPaymaster: tokenAddress,
        },
        deployedAt: new Date().toISOString(),
        deployer: account.address,
        trustedSigner,
    };
    const outputPath = path.join(__dirname, `../deployments/${chain.name.toLowerCase()}.json`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${outputPath}`);
    console.log("\n" + "=".repeat(60));
    console.log("Deployment complete!");
    console.log("=".repeat(60));
    return deploymentInfo;
}
// ============================================================
// Helpers
// ============================================================
function readBytecode(contractName) {
    const artifactPath = path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`);
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        return artifact.bytecode.object;
    }
    catch {
        // Fallback: try foundry default output
        const fallbackPath = path.join(__dirname, `../out/${contractName}.json`);
        const artifact = JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
        return artifact.bytecode;
    }
}
// ============================================================
// ABI stubs (minimal for deployment)
// ============================================================
const paymasterAbi = [
    {
        inputs: [{ internalType: "address", name: "_entryPoint", type: "address" }],
        stateMutability: "nonpayable",
        type: "constructor",
    },
];
const verifyingPaymasterAbi = [
    {
        inputs: [
            { internalType: "address", name: "_entryPoint", type: "address" },
            { internalType: "address", name: "_trustedSigner", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
];
const tokenPaymasterAbi = [
    {
        inputs: [{ internalType: "address", name: "_entryPoint", type: "address" }],
        stateMutability: "nonpayable",
        type: "constructor",
    },
];
// ============================================================
// Main
// ============================================================
const args = parseArgs();
const config = {
    chain: args.chain || sepolia,
    rpcUrl: args.rpcUrl || process.env.RPC_URL || "",
    privateKey: args.privateKey || process.env.PRIVATE_KEY || "",
    entryPoint: args.entryPoint || ENTRY_POINTS[args.chain?.id ?? 11155111],
    trustedSigner: args.trustedSigner,
};
if (!config.privateKey) {
    console.error("Error: PRIVATE_KEY or --private-key is required");
    process.exit(1);
}
deploy(config).catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
});
//# sourceMappingURL=deploy.js.map