/**
 * OnRampWidget — React component for fiat-to-crypto on-ramping.
 *
 * Features:
 * - Fiat amount input
 * - Currency selection (USD, EUR, GBP, CNY, etc.)
 * - Provider comparison table
 * - Provider selection
 * - Provider redirect to complete purchase
 * - Transaction status display
 *
 * @example
 * ```tsx
 * <OnRampWidget
 *   destinationAddress={address}
 *   defaultFiatAmount={100}
 *   defaultFiatCurrency="USD"
 *   userRegion="US"
 *   theme="dark"
 *   onComplete={(result) => console.log(result.orderId)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { OnRampWidgetProps } from "./types.js";
import { OnRampWidgetCore } from "./OnRampWidgetCore.js";
import { getWidgetStyles, cardStyles, buttonStyles, inputStyles } from "./styles.js";
import type { OnRampQuote, OnRampProviderId, OnRampResult } from "@cinacoin/onramp-sdk";

export { OnRampWidgetCore } from "./OnRampWidgetCore.js";

const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY", "AUD", "CAD", "CHF", "HKD", "SGD"];

/**
 * OnRampWidget React component.
 *
 * Built with React + Web Components architecture.
 * The core logic is in OnRampWidgetCore (framework-agnostic).
 */
export function OnRampWidget(props: OnRampWidgetProps): React.ReactElement {
  const {
    defaultFiatAmount,
    defaultFiatCurrency = "USD",
    defaultCryptoToken = "ETH",
    destinationAddress,
    userRegion = "US",
    enabledProviders,
    theme = "light",
    primaryColor,
    onComplete,
    onError,
    className = "",
  } = props;

  // ── Core Controller ────────────────────────────────────
  const coreRef = useRef<OnRampWidgetCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new OnRampWidgetCore({
      params: {
        destinationAddress,
        defaultFiatAmount,
        defaultFiatCurrency,
        defaultCryptoToken,
        userRegion,
        enabledProviders,
        theme,
      },
      fetchQuotes: async (params) => {
        // Stub: integrate with OnRampAggregator in real usage
        throw new Error("No on-ramp aggregator configured");
      },
      redirectToProvider: async (quote) => {
        // Stub: open provider widget URL in real usage
        throw new Error("No provider redirect handler configured");
      },
    });
  }

  const [fiatAmount, setFiatAmount] = useState(defaultFiatAmount ?? 100);
  const [fiatCurrency, setFiatCurrency] = useState(defaultFiatCurrency);
  const [cryptoToken, setCryptoToken] = useState(defaultCryptoToken);
  const [quotes, setQuotes] = useState<OnRampQuote[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<OnRampProviderId | null>(null);
  const [state, setState] = useState(coreRef.current.state.state);
  const [error, setError] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [lastResult, setLastResult] = useState<OnRampResult | null>(null);
  const [showProviders, setShowProviders] = useState(false);

  // Sync core with React state
  useEffect(() => {
    coreRef.current?.setFiatAmount(fiatAmount);
  }, [fiatAmount]);

  useEffect(() => {
    coreRef.current?.setFiatCurrency(fiatCurrency);
  }, [fiatCurrency]);

  useEffect(() => {
    coreRef.current?.setCryptoToken(cryptoToken);
  }, [cryptoToken]);

  // Subscribe to core state changes
  useEffect(() => {
    const core = coreRef.current;
    if (!core) return;

    const unsubscribe = core.onChange(() => {
      const s = core.state;
      setState(s.state);
      setError(s.error);
      setQuotes(s.quotes);
      setSelectedProvider(s.selectedProvider);
      setLastResult(s.lastResult);
    });

    return unsubscribe;
  }, []);

  // ── Callbacks ──────────────────────────────────────────
  const handleFetchQuotes = useCallback(async () => {
    await coreRef.current?.fetchQuotes();
    setShowProviders(true);
  }, []);

  const handleSelectProvider = useCallback((provider: OnRampProviderId) => {
    coreRef.current?.selectProvider(provider);
    setSelectedProvider(provider);
  }, []);

  const handleRedirect = useCallback(async () => {
    const result = await coreRef.current?.redirectToProvider();
    if (result) {
      onComplete?.(result);
    } else if (coreRef.current?.state.error) {
      onError?.(new Error(coreRef.current.state.error));
    }
  }, [onComplete, onError]);

  const handleReset = useCallback(() => {
    coreRef.current?.reset();
    setFiatAmount(defaultFiatAmount ?? 100);
    setFiatCurrency(defaultFiatCurrency);
    setCryptoToken(defaultCryptoToken);
    setQuotes([]);
    setSelectedProvider(null);
    setError(null);
    setLastResult(null);
    setShowProviders(false);
  }, [defaultFiatAmount, defaultFiatCurrency, defaultCryptoToken]);

  const handleCurrencySelect = useCallback((currency: string) => {
    setFiatCurrency(currency);
    setShowCurrencyModal(false);
  }, []);

  // ── Styles ─────────────────────────────────────────────
  const widgetCssVars = getWidgetStyles(theme, primaryColor);
  const cardCss = cardStyles();

  const selectedQuote = quotes.find((q) => q.provider === selectedProvider);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={`ocx-onramp-widget ${className}`} style={{ ...widgetCssVars, ...cardCss, maxWidth: "480px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--ocx-text-primary)" }}>
          Buy Crypto
        </h2>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "var(--ocx-text-muted)" }}
          onClick={handleReset}
          title="Reset"
        >
          ↻
        </button>
      </div>

      {/* Fiat Amount Input */}
      <div style={{ background: "var(--ocx-bg-surface)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px", color: "var(--ocx-text-secondary)" }}>You pay</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setShowCurrencyModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "var(--ocx-bg-elevated)", border: "none", borderRadius: "20px",
              padding: "6px 12px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
              color: "var(--ocx-text-primary)",
            }}
          >
            {getCurrencySymbol(fiatCurrency)} {fiatCurrency}
            <span style={{ fontSize: "10px" }}>▼</span>
          </button>
          <input
            type="number"
            value={fiatAmount}
            onChange={(e) => setFiatAmount(Number(e.target.value))}
            min="0"
            step="0.01"
            style={{
              ...inputStyles(), border: "none", background: "transparent",
              fontSize: "24px", fontWeight: 600, padding: "4px 0", textAlign: "right", width: "100%",
            }}
          />
        </div>
      </div>

      {/* Crypto Token Selection */}
      <div style={{ background: "var(--ocx-bg-surface)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px", color: "var(--ocx-text-secondary)" }}>You receive</span>
        </div>
        <select
          value={cryptoToken}
          onChange={(e) => setCryptoToken(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px", fontSize: "16px",
            border: `1px solid var(--ocx-border)`, borderRadius: "8px",
            background: "var(--ocx-bg-base)", color: "var(--ocx-text-primary)",
            cursor: "pointer",
          }}
        >
          <option value="ETH">ETH</option>
          <option value="USDC">USDC</option>
          <option value="USDT">USDT</option>
          <option value="BTC">BTC</option>
          <option value="MATIC">MATIC</option>
        </select>
      </div>

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setShowCurrencyModal(false)}>
          <div style={{ background: "var(--ocx-bg-base)", borderRadius: "16px", padding: "24px", minWidth: "280px" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Select Currency</h3>
            {FIAT_CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => handleCurrencySelect(c)}
                style={{
                  display: "block", width: "100%", padding: "10px 12px", textAlign: "left",
                  background: c === fiatCurrency ? "var(--ocx-bg-elevated)" : "transparent",
                  border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "4px",
                  fontSize: "14px", color: "var(--ocx-text-primary)",
                }}
              >
                {getCurrencySymbol(c)} {c}
              </button>
            ))}
            <button
              onClick={() => setShowCurrencyModal(false)}
              style={{ ...buttonStyles("secondary", "md"), width: "100%", marginTop: "12px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Get Quotes Button */}
      {!showProviders && (
        <button
          style={{ ...buttonStyles("primary", "lg"), width: "100%" }}
          onClick={handleFetchQuotes}
          disabled={state === "fetching-quotes"}
        >
          {state === "fetching-quotes" ? "Fetching quotes..." : "Get Quotes"}
        </button>
      )}

      {/* Provider Comparison */}
      {showProviders && quotes.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ocx-text-primary)", marginBottom: "8px" }}>
            Compare Providers
          </h3>
          {quotes.map((quote) => (
            <div
              key={quote.provider}
              onClick={() => handleSelectProvider(quote.provider)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "8px",
                border: `2px solid ${selectedProvider === quote.provider ? "var(--ocx-primary)" : "var(--ocx-border)"}`,
                background: selectedProvider === quote.provider ? "var(--ocx-bg-elevated)" : "var(--ocx-bg-surface)",
                cursor: "pointer",
                transition: "border-color 150ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--ocx-text-primary)" }}>
                    {quote.providerName}
                  </span>
                  {quote.requiresKyc && (
                    <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--ocx-warning)", background: "var(--ocx-warning-bg)", padding: "2px 6px", borderRadius: "4px" }}>
                      KYC
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ocx-text-primary)" }}>
                    {quote.cryptoAmount.toFixed(6)} {quote.cryptoToken}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ocx-text-muted)" }}>
                    Fee: {quote.fees.totalFeePercent}% · {quote.estimatedTime}min
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Selected Quote Summary */}
          {selectedQuote && (
            <div style={{ padding: "12px", background: "var(--ocx-bg-surface)", borderRadius: "8px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                <span style={{ color: "var(--ocx-text-secondary)" }}>Rate</span>
                <span style={{ color: "var(--ocx-text-primary)" }}>
                  1 {fiatCurrency} = {(selectedQuote.cryptoAmount / selectedQuote.fiatAmount).toFixed(8)} {cryptoToken}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--ocx-text-secondary)" }}>Total cost</span>
                <span style={{ color: "var(--ocx-text-primary)" }}>
                  {selectedQuote.totalCost.toFixed(2)} {fiatCurrency}
                </span>
              </div>
            </div>
          )}

          {/* Buy Button */}
          <button
            style={{
              ...buttonStyles("primary", "lg"),
              width: "100%",
              ...(state === "redirecting" ? { opacity: 0.7 } : {}),
            }}
            onClick={handleRedirect}
            disabled={state === "redirecting" || !selectedProvider}
          >
            {state === "redirecting" ? "Redirecting..." :
             state === "completed" ? "Purchase Complete ✓" :
             "Continue to Buy"}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: "12px", padding: "12px", background: "var(--ocx-error-bg)", borderRadius: "8px", color: "var(--ocx-error)", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Completed Status */}
      {state === "completed" && lastResult && (
        <div style={{ marginTop: "12px", padding: "16px", background: "var(--ocx-success-bg)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "20px" }}>✅</span>
            <span style={{ fontWeight: 600, color: "var(--ocx-success)" }}>Purchase Successful</span>
          </div>
          {lastResult.orderId && (
            <div style={{ fontSize: "12px", color: "var(--ocx-text-secondary)" }}>
              Order: {lastResult.orderId}
            </div>
          )}
          {lastResult.cryptoAmount && (
            <div style={{ fontSize: "12px", color: "var(--ocx-text-secondary)" }}>
              Received: {lastResult.cryptoAmount} {cryptoToken}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", CNY: "¥", JPY: "¥",
    AUD: "A$", CAD: "C$", CHF: "Fr", HKD: "HK$", SGD: "S$",
  };
  return symbols[currency] || currency;
}
