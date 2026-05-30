import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
}: CardProps) {
  return (
    <div
      className={`bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 overflow-hidden ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-gray-700/50">
          {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
