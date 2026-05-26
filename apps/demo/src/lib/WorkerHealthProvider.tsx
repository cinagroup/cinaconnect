'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { checkWorkerHealth, type WorkerHealthResult } from './workers';

interface WorkerHealthContextValue {
  health: WorkerHealthResult[];
  loading: boolean;
  lastChecked: number | null;
  refresh: () => Promise<void>;
}

const WorkerHealthContext = createContext<WorkerHealthContextValue>({
  health: [],
  loading: true,
  lastChecked: null,
  refresh: async () => {},
});

export function useWorkerHealth() {
  return useContext(WorkerHealthContext);
}

export function WorkerHealthProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<WorkerHealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const results = await checkWorkerHealth();
      setHealth(results);
      setLastChecked(Date.now());
    } catch {
      // health check failed silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Refresh every 60 seconds
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <WorkerHealthContext.Provider value={{ health, loading, lastChecked, refresh }}>
      {children}
    </WorkerHealthContext.Provider>
  );
}
