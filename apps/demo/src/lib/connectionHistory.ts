/** Connection history stored in localStorage. */

const STORAGE_KEY = 'cinacoin_connection_history';

export interface ConnectionRecord {
  address: string;
  chainId: number;
  chainName: string;
  connectorId: string;
  connectorName: string;
  connectedAt: number; // timestamp
}

/** Get recent connections (newest first). */
export function getConnectionHistory(): ConnectionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConnectionRecord[];
    return parsed.sort((a, b) => b.connectedAt - a.connectedAt);
  } catch {
    return [];
  }
}

/** Add a connection record. */
export function addConnectionRecord(record: ConnectionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getConnectionHistory();
    // Remove duplicate of same address + connector
    const filtered = history.filter(
      (r) => !(r.address === record.address && r.connectorId === record.connectorId)
    );
    // Keep max 10 records
    const updated = [record, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage full or unavailable
  }
}

/** Clear all connection history. */
export function clearConnectionHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Get the most recent connection for quick reconnect. */
export function getLastConnection(): ConnectionRecord | null {
  const history = getConnectionHistory();
  return history.length > 0 ? history[0] : null;
}
