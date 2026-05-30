'use client';

export interface ChainOption {
  id: string;
  name: string;
  icon: string;
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
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-gray-700/60 text-white text-sm rounded-xl border border-gray-600/40 outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-blue-500/40"
      >
        {chains.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
        ▾
      </span>
    </div>
  );
}
