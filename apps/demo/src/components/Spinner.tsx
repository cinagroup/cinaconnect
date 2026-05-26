'use client';

/** Shared spinner components with multiple variants. */

export function SpinnerRing({ size = 'md', color = 'text-blue-400' }: { size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  return (
    <svg className={`animate-spin ${sizeClasses[size]} ${color}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function SpinnerDots({ color = 'text-blue-400' }: { color?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <span className="w-2 h-2 rounded-full bg-current animate-[dot-bounce_1.2s_ease-in-out_infinite]" />
      <span className="w-2 h-2 rounded-full bg-current animate-[dot-bounce_1.2s_ease-in-out_infinite_0.15s]" />
      <span className="w-2 h-2 rounded-full bg-current animate-[dot-bounce_1.2s_ease-in-out_infinite_0.3s]" />
    </span>
  );
}

export function SpinnerPulse({ size = 'md', color = 'text-blue-400' }: { size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className={`absolute inset-0 rounded-full border-2 border-t-current ${color} animate-spin`} />
      <div className={`absolute inset-1 rounded-full border-2 border-b-current opacity-40 ${color} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      <div className={`absolute inset-2 rounded-full border-2 border-r-current opacity-20 ${color} animate-spin`} style={{ animationDuration: '2s' }} />
    </div>
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <SpinnerPulse size="lg" />
      <p className="text-sm text-gray-400 animate-pulse">{message}</p>
    </div>
  );
}
