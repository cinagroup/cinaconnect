'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++nextId}`;
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts((prev) => [...prev, newToast]);
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast({ type: 'error', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast({ type: 'info', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: 'warning', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const typeStyles: Record<ToastType, { bg: string; border: string; icon: string; progress: string }> = {
    success: {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-500/30',
      icon: '✓',
      progress: 'bg-emerald-500',
    },
    error: {
      bg: 'bg-red-950/90',
      border: 'border-red-500/30',
      icon: '✕',
      progress: 'bg-red-500',
    },
    info: {
      bg: 'bg-blue-950/90',
      border: 'border-blue-500/30',
      icon: 'ℹ',
      progress: 'bg-blue-500',
    },
    warning: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-500/30',
      icon: '⚠',
      progress: 'bg-amber-500',
    },
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const s = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto ${s.bg} ${s.border} border rounded-xl p-4 shadow-2xl backdrop-blur-sm animate-slide-in`}
          >
            <div className="flex items-start gap-3">
              <span className={`text-lg font-bold flex-shrink-0 ${
                toast.type === 'success' ? 'text-emerald-400' :
                toast.type === 'error' ? 'text-red-400' :
                toast.type === 'warning' ? 'text-amber-400' :
                'text-blue-400'
              }`}>
                {s.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.message && <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            {/* Progress bar */}
            {toast.duration && toast.duration > 0 && (
              <div className="mt-2 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${s.progress} rounded-full animate-shrink`}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
