/**
 * @cinacoin/swap-sdk
 *
 * Cinacoin Swap Aggregator SDK — multi-DEX swap routing with slippage protection.
 *
 * @example
 * ```ts
 * import { SwapQuoter, SwapRouter, UniswapExecutor, OneInchExecutor, ZeroxExecutor } from '@cinacoin/swap-sdk';
 *
 * const executors = [
 *   new UniswapExecutor({ rpcUrl: 'https://eth-rpc.example.com' }),
 *   new OneInchExecutor(process.env.ONEINCH_API_KEY),
 *   new ZeroxExecutor(process.env.ZEROX_API_KEY),
 * ];
 *
 * const quoter = new SwapQuoter(executors);
 * const router = new SwapRouter(quoter);
 * router.setExecutionEnabled(true);
 *
 * const best = await router.getBestQuote({
 *   fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
 *   toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  // WETH
 *   fromAmount: 1_000n * 10n ** 6n,
 *   chainId: 1,
 *   slippageBps: 50,
 * });
 *
 * console.log(`Best: ${best.quote.provider} → ${best.quote.toAmount}`);
 * ```
 */

// Types
export type {
  SwapQuoteParams,
  SwapQuote,
  SwapReceipt,
  SwapRoute,
  SwapTransaction,
  TokenInfo,
  PriceImpact,
  BestQuote,
  SwapExecuteParams,
  PrivateRpcConfig,
} from "./types.js";

// Quoter
export { SwapQuoter } from "./quoter.js";
export type { QuoterConfig } from "./quoter.js";

// Router
export { SwapRouter } from "./router.js";
export type { SwapExecutor, RouterExecuteParams, GasEstimatorLike } from "./router.js";

// Executors
export { UniswapExecutor } from "./executors/uniswap.js";
export { OneInchExecutor } from "./executors/1inch.js";
export { ZeroxExecutor } from "./executors/0x.js";

// Slippage utilities
export {
  calculateMinimumReceived,
  calculatePriceImpact,
  classifyPriceImpact,
  getImpactWarning,
  isPriceImpactAcceptable,
  getExchangeRate,
  percentDiff,
  adjustSlippageForVolatility,
} from "./slippage.js";

// MEV Protection
export {
  FLASHBOTS_RPC_URL,
  FLASHBOTS_FAST_RPC_URL,
  EDEN_RPC_URL,
  resolvePrivateRpcUrl,
  sendViaPrivateRpc,
  waitForTxReceiptViaRpc,
  buildLegacyTxRequest,
} from "./mev.js";
export type { PrivateRpcProvider } from "./mev.js";

// ERC-20 Approval
export {
  checkAllowance,
  checkAllowanceFor,
  buildApproveTx,
  approve,
  ensureAllowance,
  getPermitDomain,
  getPermitNonce,
  buildPermitTypedData,
  signPermit,
  buildPermitCalldata,
  executePermit,
  buildBatchApproveAndSwap,
  buildInfiniteApproveTx,
  MAX_UINT256,
} from "./approve.js";
export type {
  PermitParams,
  PermitSignature,
  AllowanceResult,
} from "./approve.js";
