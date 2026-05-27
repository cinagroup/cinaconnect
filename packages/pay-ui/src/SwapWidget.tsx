/**
 * SwapWidget — React component for token swapping.
 *
 * Features:
 * - Token pair selection with swap button
 * - Amount input with real-time quote fetching
 * - Slippage settings modal
 * - Route display showing DEX path
 * - Execute swap with transaction status
 * - Success/error states
 *
 * @example
 * ```tsx
 * <SwapWidget
 *   chainId={1}
 *   walletAddress={address}
 *   supportedTokens={tokens}
 *   defaultFromToken={USDC}
 *   defaultToToken={ETH}
 *   theme="dark"
 *   onSwapComplete={(receipt) => console.log(receipt.txHash)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { SwapWidgetProps } from "./types.js";
import { SwapWidgetCore } from "./SwapWidgetCore.js";
import { getWidgetStyles, cardStyles, buttonStyles, inputStyles } from "./styles.js";
import type { SwapQuote, SwapReceipt, TokenInfo, SwapRoute } from "@cinacoin/swap-sdk";

// Re-export core for consumers
export { SwapWidgetCore } from "./SwapWidgetCore.js";

/**
 * SwapWidget React component.
 *
 * Built with React + Web Components architecture.
 * The core logic is in SwapWidgetCore (framework-agnostic).
 */
export function SwapWidget(props: SwapWidgetProps): React.ReactElement {
  const {
    supportedTokens = [],
    defaultFromToken,
    defaultToToken,
    defaultAmount,
    chainId,
    walletAddress,
    theme = "light",
    primaryColor,
    onSwapComplete,
    onError,
    className = "",
  } = props;

  // ── Core Controller ────────────────────────────────────
  const coreRef = useRef<SwapWidgetCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new SwapWidgetCore({
      chainId,
      walletAddress,
      fetchQuote: async (params) => {
        // Stub: integrate with SwapRouter in real usage
        throw new Error("No swap router configured");
      },
      executeTransaction: async (tx) => {
        // Stub: integrate with wallet in real usage
        throw new Error("No wallet executor configured");
      },
    });
  }

  const [fromToken, setFromToken] = useState<TokenInfo | null>(defaultFromToken ?? null);
  const [toToken, setToToken] = useState<TokenInfo | null>(defaultToToken ?? null);
  const [inputAmount, setInputAmount] = useState(defaultAmount ?? "");
  const [quotes, setQuotes] = useState<SwapQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SwapQuote | null>(null);
  const [state, setState] = useState(coreRef.current.state.state);
  const [error, setError] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(coreRef.current.state.slippage);
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectingFor, setSelectingFor] = useState<"from" | "to">("from");
  const [lastReceipt, setLastReceipt] = useState<SwapReceipt | null>(null);

  // Sync core with React state
  useEffect(() => {
    coreRef.current?.setFromToken(fromToken);
  }, [fromToken]);

  useEffect(() => {
    coreRef.current?.setToToken(toToken);
  }, [toToken]);

  useEffect(() => {
    coreRef.current?.setInputAmount(inputAmount);
  }, [inputAmount]);

  // Subscribe to core state changes
  useEffect(() => {
    const core = coreRef.current;
    if (!core) return;

    const unsubscribe = core.onChange(() => {
      const s = core.state;
      setState(s.state);
      setError(s.error);
      setQuotes(s.quotes);
      setSelectedQuote(s.selectedQuote);
      setSlippage(s.slippage);
      setLastReceipt(s.lastReceipt);
    });

    return unsubscribe;
  }, []);

  // ── Callbacks ──────────────────────────────────────────
  const handleSwapTokens = useCallback(() => {
    coreRef.current?.swapTokens();
    setFromToken(toToken);
    setToToken(fromToken);
  }, [fromToken, toToken]);

  const handleAmountChange = useCallback((value: string) => {
    coreRef.current?.setInputAmount(value);
    setInputAmount(value);
  }, []);

  const handleFetchQuote = useCallback(async () => {
    await coreRef.current?.fetchQuote();
  }, []);

  const handleExecuteSwap = useCallback(async () => {
    const receipt = await coreRef.current?.executeSwap();
    if (receipt) {
      onSwapComplete?.(receipt);
    } else if (coreRef.current?.state.error) {
      onError?.(new Error(coreRef.current.state.error));
    }
  }, [onSwapComplete, onError]);

  const handleSlippageSelect = useCallback((bps: number) => {
    coreRef.current?.setSlippage({ slippageBps: bps, autoSlippage: false });
    setSlippage((prev) => ({ ...prev, slippageBps: bps, autoSlippage: false }));
  }, []);

  const handleTokenSelect = useCallback((token: TokenInfo) => {
    if (selectingFor === "from") {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setShowTokenModal(false);
  }, [selectingFor]);

  const handleReset = useCallback(() => {
    coreRef.current?.reset();
    setFromToken(defaultFromToken ?? null);
    setToToken(defaultToToken ?? null);
    setInputAmount(defaultAmount ?? "");
    setQuotes([]);
    setSelectedQuote(null);
    setError(null);
    setLastReceipt(null);
  }, [defaultFromToken, defaultToToken, defaultAmount]);

  // ── Styles ─────────────────────────────────────────────
  const widgetCssVars = getWidgetStyles(theme, primaryColor);
  const cardCss = cardStyles();

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={`ocx-swap-widget ${className}`} style={{ ...widgetCssVars, ...cardCss, maxWidth: "480px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--ocx-text-primary)" }}>
          Swap
        </h2>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "var(--ocx-text-muted)" }}
          onClick={handleReset}
          title="Reset"
        >
          ↻
        </button>
      </div>

      {/* Token Input — From */}
      <TokenInput
        label="From"
        token={fromToken}
        amount={inputAmount}
        onAmountChange={handleAmountChange}
        onTokenClick={() => { setSelectingFor("from"); setShowTokenModal(true); }}
      />

      {/* Swap Direction Button */}
      <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0" }}>
        <button
          onClick={handleSwapTokens}
          style={{
            ...buttonStyles("secondary", "sm"),
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            padding: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          ↓
        </button>
      </div>

      {/* Token Input — To */}
      <TokenInput
        label="To"
        token={toToken}
        amount={selectedQuote ? formatAmount(selectedQuote.toAmount, toToken?.decimals ?? 18) : ""}
        onAmountChange={() => {}}
        onTokenClick={() => { setSelectingFor("to"); setShowTokenModal(true); }}
        readOnly
      />

      {/* Price & Route Info */}
      {selectedQuote && (
        <div style={{ marginTop: "12px", padding: "12px", background: "var(--ocx-bg-surface)", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
            <span style={{ color: "var(--ocx-text-secondary)" }}>Rate</span>
            <span style={{ color: "var(--ocx-text-primary)" }}>
              {formatExchangeRate(selectedQuote)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
            <span style={{ color: "var(--ocx-text-secondary)" }}>Slippage</span>
            <span
              style={{ color: getSlippageColor(slippage.slippageBps), cursor: "pointer" }}
              onClick={() => setShowSlippageModal(true)}
            >
              {(slippage.slippageBps / 100).toFixed(2)}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ color: "var(--ocx-text-secondary)" }}>Min. received</span>
            <span style={{ color: "var(--ocx-text-primary)" }}>
              {formatAmount(selectedQuote.minimumReceived, toToken?.decimals ?? 18)} {toToken?.symbol ?? ""}
            </span>
          </div>
          {selectedQuote.route.length > 0 && (
            <RouteDisplay route={selectedQuote.route} />
          )}
        </div>
      )}

      {/* Slippage Modal */}
      {showSlippageModal && (
        <SlippageModal
          slippage={slippage}
          onSelect={handleSlippageSelect}
          onClose={() => setShowSlippageModal(false)}
        />
      )}

      {/* Token Selection Modal */}
      {showTokenModal && (
        <TokenSelectionModal
          tokens={supportedTokens}
          onSelect={handleTokenSelect}
          onClose={() => setShowTokenModal(false)}
          selected={selectingFor === "from" ? fromToken : toToken}
        />
      )}

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: "12px", padding: "12px", background: "var(--ocx-error-bg)", borderRadius: "8px", color: "var(--ocx-error)", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Success Display */}
      {state === "success" && lastReceipt && (
        <TransactionStatus receipt={lastReceipt} />
      )}

      {/* Execute Button */}
      <button
        style={{
          ...buttonStyles("primary", "lg"),
          width: "100%",
          marginTop: "16px",
          ...(state === "executing" ? { opacity: 0.7 } : {}),
        }}
        onClick={state === "quote-ready" ? handleExecuteSwap : handleFetchQuote}
        disabled={state === "executing" || state === "fetching-quote"}
      >
        {state === "fetching-quote" ? "Fetching quote..." :
         state === "executing" ? "Executing swap..." :
         state === "quote-ready" ? "Swap" :
         state === "success" ? "Swap Complete ✓" :
         state === "error" ? "Try Again" :
         "Enter amount"}
      </button>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface TokenInputProps {
  label: string;
  token: TokenInfo | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onTokenClick: () => void;
  readOnly?: boolean;
}

function TokenInput({ label, token, amount, onAmountChange, onTokenClick, readOnly }: TokenInputProps) {
  return (
    <div style={{ background: "var(--ocx-bg-surface)", borderRadius: "12px", padding: "16px", marginBottom: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "14px", color: "var(--ocx-text-secondary)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onTokenClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--ocx-bg-elevated)",
            border: "none",
            borderRadius: "20px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--ocx-text-primary)",
          }}
        >
          {token ? (
            <>
              {token.logoURI && <img src={token.logoURI} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />}
              {token.symbol}
            </>
          ) : "Select token"}
          <span style={{ fontSize: "10px" }}>▼</span>
        </button>
        <input
          type="text"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          readOnly={readOnly}
          style={{
            ...inputStyles(),
            border: "none",
            background: "transparent",
            fontSize: "24px",
            fontWeight: 600,
            padding: "4px 0",
            textAlign: "right",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

interface RouteDisplayProps {
  route: SwapRoute[];
}

function RouteDisplay({ route }: RouteDisplayProps) {
  return (
    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--ocx-text-muted)" }}>
      <span style={{ marginRight: "4px" }}>Route:</span>
      {route.map((hop, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: "0 4px" }}>→</span>}
          <span style={{ color: "var(--ocx-primary)" }}>{hop.protocol}</span>
        </span>
      ))}
    </div>
  );
}

interface SlippageModalProps {
  slippage: { slippageBps: number; autoSlippage: boolean; presets: number[] };
  onSelect: (bps: number) => void;
  onClose: () => void;
}

function SlippageModal({ slippage, onSelect, onClose }: SlippageModalProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{ background: "var(--ocx-bg-base)", borderRadius: "16px", padding: "24px", minWidth: "300px" }}
        onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Slippage Tolerance</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {slippage.presets.map((bps) => (
            <button
              key={bps}
              onClick={() => onSelect(bps)}
              style={{
                ...buttonStyles(
                  slippage.slippageBps === bps && !slippage.autoSlippage ? "primary" : "secondary",
                  "sm"
                ),
                minWidth: "60px",
              }}
            >
              {(bps / 100).toFixed(2)}%
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ ...buttonStyles("secondary", "md"), width: "100%", marginTop: "16px" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface TokenSelectionModalProps {
  tokens: TokenInfo[];
  onSelect: (token: TokenInfo) => void;
  onClose: () => void;
  selected: TokenInfo | null;
}

function TokenSelectionModal({ tokens, onSelect, onClose, selected }: TokenSelectionModalProps) {
  const [search, setSearch] = useState("");
  const filtered = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{ background: "var(--ocx-bg-base)", borderRadius: "16px", padding: "24px", minWidth: "340px", maxHeight: "500px", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Select Token</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, symbol, or address"
          style={inputStyles()}
        />
        <div style={{ marginTop: "12px" }}>
          {filtered.length === 0 && (
            <p style={{ color: "var(--ocx-text-muted)", fontSize: "14px", textAlign: "center" }}>No tokens found</p>
          )}
          {filtered.map((token) => (
            <button
              key={token.address}
              onClick={() => onSelect(token)}
              style={{
                display: "flex", alignItems: "center", gap: "12px", width: "100%",
                padding: "10px 12px", background: token.address === selected?.address ? "var(--ocx-bg-elevated)" : "transparent",
                border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "4px",
              }}
            >
              {token.logoURI && <img src={token.logoURI} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ocx-text-primary)" }}>{token.symbol}</div>
                <div style={{ fontSize: "12px", color: "var(--ocx-text-muted)" }}>{token.name}</div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ ...buttonStyles("secondary", "md"), width: "100%", marginTop: "12px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface TransactionStatusProps {
  receipt: SwapReceipt;
}

function TransactionStatus({ receipt }: TransactionStatusProps) {
  return (
    <div style={{ marginTop: "12px", padding: "16px", background: "var(--ocx-success-bg)", borderRadius: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "20px" }}>✅</span>
        <span style={{ fontWeight: 600, color: "var(--ocx-success)" }}>Swap Successful</span>
      </div>
      <div style={{ fontSize: "12px", color: "var(--ocx-text-secondary)" }}>
        <div>TX: {receipt.txHash.slice(0, 10)}…{receipt.txHash.slice(-8)}</div>
        <div>Block: {receipt.blockNumber.toString()}</div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function formatAmount(wei: bigint, decimals: number): string {
  const str = wei.toString();
  if (str.length <= decimals) return "0." + str.padStart(decimals, "0");
  const whole = str.slice(0, str.length - decimals);
  const frac = str.slice(str.length - decimals);
  return `${whole}.${frac}`;
}

function formatExchangeRate(quote: SwapQuote): string {
  if (quote.fromAmount === 0n) return "0";
  return (Number(quote.toAmount) / Number(quote.fromAmount)).toFixed(6);
}

function getSlippageColor(bps: number): string {
  if (bps <= 25) return "#10B981";
  if (bps <= 100) return "#F59E0B";
  return "#EF4444";
}
