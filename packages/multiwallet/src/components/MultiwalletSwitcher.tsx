import React, { useState, useCallback } from "react";
import { useMultiwallet } from "../hooks/useMultiwallet.js";
import type { Namespace } from "../types.js";

/** Props for the MultiwalletSwitcher component. */
export interface MultiwalletSwitcherProps {
  /** Optional CSS class name for the root element. */
  className?: string;
  /** Filter to show only connections from specific namespaces. */
  namespaces?: Namespace[];
  /** Custom render function for each wallet item. */
  renderWallet?: (wallet: {
    walletId: string;
    walletName: string;
    address: string;
    namespace: string;
    isActive: boolean;
    icon?: string;
  }) => React.ReactNode;
}

/**
 * React component that displays connected wallets grouped by namespace
 * and allows switching between them or adding/removing connections.
 *
 * @example
 * ```tsx
 * <MultiwalletSwitcher
 *   namespaces={["eip155", "solana"]}
 *   className="my-switcher"
 * />
 * ```
 */
export function MultiwalletSwitcher({
  className,
  namespaces,
  renderWallet,
}: MultiwalletSwitcherProps) {
  const {
    connections,
    activeConnection,
    setActiveConnection,
    removeConnection,
  } = useMultiwallet();

  const [expandedNs, setExpandedNs] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredNamespaces = namespaces ?? ["eip155", "solana", "bip122"];

  const handleToggle = useCallback((ns: string) => {
    setExpandedNs((prev) => (prev === ns ? null : ns));
  }, []);

  const handleActivate = useCallback(
    (walletId: string, namespace: string) => {
      setActiveConnection(walletId, namespace as Namespace);
    },
    [setActiveConnection]
  );

  const handleRemove = useCallback(
    (walletId: string, namespace: string) => {
      removeConnection(walletId, namespace as Namespace);
    },
    [removeConnection]
  );

  const totalActive = Object.values(connections).flat().filter(
    (c) => c.isActive
  ).length;

  return (
    <div className={`multiwallet-switcher ${className ?? ""}`.trim()}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          Wallets
          {totalActive > 0 && (
            <span style={styles.badge}>{totalActive} active</span>
          )}
        </h3>
        <button
          style={styles.addButton}
          onClick={() => setShowAddModal(true)}
          aria-label="Add wallet connection"
        >
          + Add
        </button>
      </div>

      {/* Namespace groups */}
      {filteredNamespaces.map((ns) => {
        const conns = connections[ns] ?? [];
        if (conns.length === 0) return null;

        const isExpanded = expandedNs === ns;

        return (
          <div key={ns} style={styles.namespaceGroup}>
            <button
              style={styles.namespaceHeader}
              onClick={() => handleToggle(ns)}
              aria-expanded={isExpanded}
            >
              <span style={styles.namespaceLabel}>
                {getNamespaceLabel(ns)}
              </span>
              <span style={styles.namespaceCount}>
                {conns.length} {conns.length === 1 ? "wallet" : "wallets"}
              </span>
              <span style={styles.chevron}>{isExpanded ? "▾" : "▸"}</span>
            </button>

            {isExpanded && (
              <div style={styles.walletList}>
                {conns.map((wallet) => (
                  <div
                    key={wallet.walletId}
                    style={{
                      ...styles.walletItem,
                      ...(wallet.isActive ? styles.walletItemActive : {}),
                    }}
                  >
                    {renderWallet ? (
                      renderWallet({
                        walletId: wallet.walletId,
                        walletName: wallet.walletName,
                        address: wallet.address,
                        namespace: wallet.namespace,
                        isActive: wallet.isActive,
                        icon: wallet.icon,
                      })
                    ) : (
                      <DefaultWalletRow
                        wallet={wallet}
                        onActivate={() =>
                          handleActivate(wallet.walletId, wallet.namespace)
                        }
                        onRemove={() =>
                          handleRemove(wallet.walletId, wallet.namespace)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {filteredNamespaces.every(
        (ns) => (connections[ns] ?? []).length === 0
      ) && (
        <div style={styles.emptyState}>
          <p>No wallets connected</p>
          <button
            style={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            Connect a wallet
          </button>
        </div>
      )}

      {/* Add connection modal (placeholder) */}
      {showAddModal && (
        <AddConnectionModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

interface DefaultWalletRowProps {
  wallet: {
    walletId: string;
    walletName: string;
    address: string;
    namespace: string;
    isActive: boolean;
    icon?: string;
  };
  onActivate: () => void;
  onRemove: () => void;
}

function DefaultWalletRow({
  wallet,
  onActivate,
  onRemove,
}: DefaultWalletRowProps) {
  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : "";

  return (
    <>
      <div style={styles.walletInfo}>
        {wallet.icon && <img src={wallet.icon} alt="" style={styles.walletIcon} />}
        <div>
          <div style={styles.walletName}>{wallet.walletName}</div>
          {shortAddress && (
            <div style={styles.walletAddress}>{shortAddress}</div>
          )}
        </div>
      </div>
      <div style={styles.walletActions}>
        {wallet.isActive ? (
          <span style={styles.activeIndicator}>● Active</span>
        ) : (
          <button style={styles.switchButton} onClick={onActivate}>
            Switch
          </button>
        )}
        <button
          style={styles.removeButton}
          onClick={onRemove}
          aria-label={`Remove ${wallet.walletName}`}
        >
          ✕
        </button>
      </div>
    </>
  );
}

/** Simple modal for adding a new connection (placeholder for integration). */
function AddConnectionModal({ onClose }: { onClose: () => void }) {
  const { addConnection } = useMultiwallet();
  const [walletId, setWalletId] = useState("");
  const [namespace, setNamespace] = useState<Namespace>("eip155");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) return;
    addConnection(walletId, walletId, namespace, address);
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px" }}>Add Wallet Connection</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Wallet ID
            <input
              style={styles.input}
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="e.g. metamask"
              required
            />
          </label>
          <label style={styles.label}>
            Namespace
            <select
              style={styles.input}
              value={namespace}
              onChange={(e) => setNamespace(e.target.value as Namespace)}
            >
              <option value="eip155">EVM (eip155)</option>
              <option value="solana">Solana</option>
              <option value="bip122">Bitcoin (bip122)</option>
            </select>
          </label>
          <label style={styles.label}>
            Address (optional)
            <input
              style={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
            />
          </label>
          <div style={styles.formActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton}>
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function getNamespaceLabel(ns: string): string {
  const labels: Record<string, string> = {
    eip155: "EVM",
    solana: "Solana",
    bip122: "Bitcoin",
  };
  return labels[ns] ?? ns;
}

// ─── Inline Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  headerTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    fontSize: "11px",
    fontWeight: 500,
    background: "#dcfce7",
    color: "#166534",
    padding: "2px 8px",
    borderRadius: "9999px",
  },
  addButton: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: 500,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  namespaceGroup: {
    borderBottom: "1px solid #f3f4f6",
  },
  namespaceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
  namespaceLabel: {
    fontWeight: 600,
    color: "#374151",
  },
  namespaceCount: {
    fontSize: "12px",
    color: "#6b7280",
  },
  chevron: {
    fontSize: "12px",
    color: "#9ca3af",
    marginLeft: "8px",
  },
  walletList: {
    padding: "0 16px 8px",
  },
  walletItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: "8px",
    marginBottom: "4px",
    background: "#f9fafb",
  },
  walletItemActive: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  walletInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  walletIcon: {
    width: "24px",
    height: "24px",
    borderRadius: "6px",
  },
  walletName: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
  },
  walletAddress: {
    fontSize: "12px",
    color: "#6b7280",
    fontFamily: "monospace",
  },
  walletActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  activeIndicator: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#16a34a",
  },
  switchButton: {
    padding: "4px 10px",
    fontSize: "12px",
    background: "#e0e7ff",
    color: "#3730a3",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  removeButton: {
    padding: "4px 8px",
    fontSize: "12px",
    background: "transparent",
    color: "#9ca3af",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  emptyState: {
    padding: "32px 16px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "8px",
  },
  cancelButton: {
    padding: "8px 16px",
    fontSize: "14px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  submitButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 500,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
