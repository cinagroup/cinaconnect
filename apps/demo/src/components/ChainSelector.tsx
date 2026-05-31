'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface ChainOption {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

interface ChainSelectorProps {
  value: string;
  onChange: (v: string) => void;
  chains: ChainOption[];
  className?: string;
}

export default function ChainSelector({
  value,
  onChange,
  chains,
  className = '',
}: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const selected = chains.find((c) => c.id === value) ?? chains[0];

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
    },
    [onChange],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter' || e.key === ' ') setOpen((o) => !o);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = chains.findIndex((c) => c.id === hovered);
        const next = chains[(idx + 1) % chains.length];
        setHovered(next.id);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = chains.findIndex((c) => c.id === hovered);
        const prev = chains[(idx - 1 + chains.length) % chains.length];
        setHovered(prev.id);
      }
    },
    [chains, hovered],
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-700/60 text-white text-sm rounded-xl border border-gray-600/40 outline-none cursor-pointer appearance-none transition-all duration-200 ${
          open
            ? 'ring-2 ring-blue-500/40 border-blue-500/50'
            : 'hover:border-gray-500/60 hover:bg-gray-700/80'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {/* Active chain dot indicator */}
        {selected.color && (
          <span
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor: selected.color,
              boxShadow: open ? `0 0 8px 2px ${selected.color}60` : 'none',
            }}
          />
        )}
        <span className="text-base leading-none">{selected.icon}</span>
        <span className="flex-1 text-left font-medium truncate">{selected.name}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-full mt-2 left-0 w-full min-w-[240px] bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-dropdown-in"
          role="listbox"
        >
          {/* Dropdown header */}
          <div className="px-4 py-2.5 border-b border-gray-700/50">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
              Select Chain
            </p>
          </div>

          {/* Chain options */}
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {chains.map((chain, i) => {
              const isSelected = chain.id === value;
              const isHovered = chain.id === hovered;

              return (
                <button
                  key={chain.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(chain.id)}
                  onMouseEnter={() => setHovered(chain.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-500/15 border border-blue-500/30'
                      : isHovered
                      ? 'bg-gray-700/60'
                      : 'hover:bg-gray-700/40'
                  }`}
                  style={mounted ? { animationDelay: `${i * 30}ms` } : undefined}
                >
                  {/* Chain icon with glow */}
                  <div className="relative">
                    <span className="text-lg leading-none">{chain.icon}</span>
                    {chain.color && (
                      <span
                        className="absolute -inset-0.5 rounded-full opacity-0 transition-opacity duration-300"
                        style={{
                          opacity: isSelected || isHovered ? 0.4 : 0,
                          boxShadow: `0 0 6px 2px ${chain.color}60`,
                        }}
                      />
                    )}
                  </div>

                  <span className="flex-1 text-sm text-white font-medium">{chain.name}</span>

                  {/* Active checkmark */}
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-blue-400 animate-check-pop"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
