'use client';

interface TokenOption {
  symbol: string;
  icon: string;
}

interface TokenInputProps {
  value: string;
  onChange: (v: string) => void;
  token: string;
  onTokenChange: (t: string) => void;
  balance?: string;
  label: string;
  tokens?: TokenOption[];
  placeholder?: string;
  maxButton?: boolean;
  onMax?: () => void;
  className?: string;
}

const defaultTokens: TokenOption[] = [
  { symbol: 'ETH', icon: '⟠' },
  { symbol: 'USDC', icon: '◎' },
  { symbol: 'USDT', icon: '₮' },
  { symbol: 'WBTC', icon: '₿' },
  { symbol: 'DAI', icon: '◈' },
];

export default function TokenInput({
  value,
  onChange,
  token,
  onTokenChange,
  balance,
  label,
  tokens = defaultTokens,
  placeholder = '0.0',
  maxButton,
  onMax,
  className = '',
}: TokenInputProps) {
  const selectedToken = tokens.find((t) => t.symbol === token) ?? tokens[0];

  return (
    <div className={`bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          {balance !== undefined && (
            <span className="text-xs text-gray-500">
              Balance: <span className="text-gray-300">{balance}</span>
            </span>
          )}
          {maxButton && onMax && (
            <button
              onClick={onMax}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors px-2 py-0.5 rounded bg-blue-400/10 hover:bg-blue-400/20"
            >
              MAX
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Token selector */}
        <div className="relative">
          <select
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            className="appearance-none bg-gray-700/80 hover:bg-gray-600/80 rounded-xl px-3 py-2 transition-colors border border-gray-600/50 text-sm text-white font-bold cursor-pointer pr-8"
          >
            {tokens.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.icon} {t.symbol}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▾
          </span>
        </div>

        {/* Amount input */}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d*$/.test(v)) {
              onChange(v);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-right text-2xl font-bold text-white outline-none placeholder:text-gray-600"
        />
      </div>
    </div>
  );
}
