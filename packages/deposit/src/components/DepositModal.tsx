import React, { useState, useMemo, useCallback } from "react";
import {
  DepositRequest,
  DepositStatus,
  DepositResult,
  ExchangeInfo,
  AssetInfo,
  NetworkInfo,
} from "../types";
import { depositService } from "../provider";
import { useDeposit } from "../hooks/useDeposit";
import { useAvailableExchanges } from "../hooks/useAvailableExchanges";

// ── Styles (inline for portability; replace with your design system) ────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
    color: "#e0e0e0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 24,
    cursor: "pointer",
    padding: "4px 8px",
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#aaa",
    marginBottom: 6,
    marginTop: 16,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#16213e",
    color: "#e0e0e0",
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#16213e",
    color: "#e0e0e0",
    fontSize: 14,
    boxSizing: "border-box" as const,
  },
  exchangeOption: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    objectFit: "contain" as const,
  },
  primaryBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0f3460",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 24,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },
  errorText: { color: "#ff6b6b", fontSize: 13, marginTop: 8 },
  redirectNote: {
    background: "#16213e",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    fontSize: 13,
    color: "#aaa",
    textAlign: "center" as const,
  },
};

const statusColors: Record<DepositStatus, string> = {
  pending: "#f0ad4e",
  processing: "#5bc0de",
  completed: "#5cb85c",
  failed: "#d9534f",
};

// ── Props ────────────────────────────────────────────────────────────────

export interface DepositModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Called when the user closes the modal. */
  onClose: () => void;
  /** User's receiving address (optional). */
  receivingAddress?: string;
  /** Target network filter (optional). */
  networkFilter?: string;
  /** Callback when deposit is successfully initiated. */
  onDepositInitiated?: (result: DepositResult) => void;
}

/**
 * DepositModal — full deposit flow UI.
 *
 * Steps:
 * 1. Select exchange
 * 2. Select asset & network
 * 3. Enter amount
 * 4. Redirect to exchange
 * 5. Track status
 */
export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  receivingAddress,
  networkFilter,
  onDepositInitiated,
}) => {
  const {
    isLoading,
    deposit,
    error,
    initiateDeposit,
    reset,
  } = useDeposit();

  const { exchanges } = useAvailableExchanges({
    network: networkFilter,
    address: receivingAddress,
  });

  // Step state
  const [selectedExchangeId, setSelectedExchangeId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [redirected, setRedirected] = useState(false);

  const selectedExchange = useMemo(
    () => exchanges.find((e) => e.id === selectedExchangeId),
    [exchanges, selectedExchangeId]
  );

  const availableAssets = useMemo(
    () => selectedExchange?.supportedAssets ?? [],
    [selectedExchange]
  );

  const selectedAssetInfo = useMemo(
    () => availableAssets.find((a) => a.symbol === selectedAsset),
    [availableAssets, selectedAsset]
  );

  const availableNetworks = useMemo(
    () => selectedAssetInfo?.networks.filter((n) => n.available) ?? [],
    [selectedAssetInfo]
  );

  // Reset sub-selections when exchange changes
  const handleExchangeChange = useCallback(
    (id: string) => {
      setSelectedExchangeId(id);
      setSelectedAsset("");
      setSelectedNetwork("");
      setRedirected(false);
    },
    []
  );

  const handleAssetChange = useCallback((symbol: string) => {
    setSelectedAsset(symbol);
    setSelectedNetwork("");
    setRedirected(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedExchangeId || !selectedAsset || !selectedNetwork || !amount) return;

    try {
      const request: DepositRequest = {
        exchangeId: selectedExchangeId,
        asset: selectedAsset,
        network: selectedNetwork,
        amount: parseFloat(amount),
        receivingAddress,
      };

      const result = await initiateDeposit(request);
      onDepositInitiated?.(result);
      setRedirected(true);

      // Open exchange deposit page
      if (result.depositUrl) {
        window.open(result.depositUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Error is captured in hook state
    }
  }, [
    selectedExchangeId,
    selectedAsset,
    selectedNetwork,
    amount,
    receivingAddress,
    initiateDeposit,
    onDepositInitiated,
  ]);

  const handleBack = useCallback(() => {
    reset();
    setRedirected(false);
    setSelectedExchangeId("");
    setSelectedAsset("");
    setSelectedNetwork("");
    setAmount("");
  }, [reset]);

  // ── Render ───────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Status tracking view ──
  if (redirected && deposit) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Deposit Status</h2>
            <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <span
              style={{
                ...styles.statusBadge,
                background: statusColors[deposit.status] + "33",
                color: statusColors[deposit.status],
              }}
            >
              {deposit.status}
            </span>
          </div>

          <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.8 }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Exchange:</strong> {deposit.exchangeId}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Asset:</strong> {deposit.asset}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Network:</strong> {deposit.network}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Amount:</strong> {deposit.amount}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Deposit ID:</strong> {deposit.depositId}
            </p>
          </div>

          {deposit.status === DepositStatus.FAILED && deposit.error && (
            <p style={styles.errorText}>{deposit.error}</p>
          )}

          {deposit.status === DepositStatus.COMPLETED && (
            <p style={{ color: "#5cb85c", textAlign: "center", marginTop: 16 }}>
              ✅ Deposit confirmed!
            </p>
          )}

          {deposit.status === DepositStatus.PROCESSING && (
            <div style={styles.redirectNote}>
              ⏳ Waiting for exchange confirmation...
              <br />
              <span style={{ fontSize: 11 }}>
                This may take a few minutes depending on network congestion.
              </span>
            </div>
          )}

          {error && <p style={styles.errorText}>{error.message}</p>}

          <button
            style={styles.primaryBtn}
            onClick={handleBack}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : deposit.status === DepositStatus.COMPLETED ? "Done" : "New Deposit"}
          </button>
        </div>
      </div>
    );
  }

  // ── Deposit form view ──
  const isFormValid =
    selectedExchangeId && selectedAsset && selectedNetwork && parseFloat(amount) > 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Deposit</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Exchange selector */}
        <label style={styles.label}>Exchange</label>
        <select
          style={styles.select}
          value={selectedExchangeId}
          onChange={(e) => handleExchangeChange(e.target.value)}
        >
          <option value="">Select exchange…</option>
          {exchanges.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>

        {/* Asset selector */}
        {selectedExchange && (
          <>
            <label style={styles.label}>Asset</label>
            <select
              style={styles.select}
              value={selectedAsset}
              onChange={(e) => handleAssetChange(e.target.value)}
              disabled={!selectedExchangeId}
            >
              <option value="">Select asset…</option>
              {availableAssets.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} — {asset.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Network selector */}
        {selectedAssetInfo && (
          <>
            <label style={styles.label}>Network</label>
            <select
              style={styles.select}
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
            >
              <option value="">Select network…</option>
              {availableNetworks.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.name}
                  {net.chainId ? ` (Chain ID: ${net.chainId})` : ""}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Amount input */}
        {selectedNetwork && (
          <>
            <label style={styles.label}>Amount</label>
            <input
              type="number"
              style={styles.input}
              placeholder={`Min ${selectedExchange?.minAmount ?? 0}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={selectedExchange?.minAmount ?? 0}
              step="any"
            />
          </>
        )}

        {/* Error display */}
        {error && <p style={styles.errorText}>{error.message}</p>}

        {/* Confirm button */}
        <button
          style={{
            ...styles.primaryBtn,
            ...(!isFormValid ? styles.primaryBtnDisabled : {}),
          }}
          onClick={handleConfirm}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? "Processing…" : "Continue to Exchange"}
        </button>
      </div>
    </div>
  );
};
