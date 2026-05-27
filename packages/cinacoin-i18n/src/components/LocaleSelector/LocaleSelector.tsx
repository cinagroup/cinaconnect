import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { localeLabels } from '../../i18n';
import type { Locale } from '../../i18n';

/**
 * LocaleSelector — dropdown for switching the active locale.
 *
 * Renders a button that opens a dropdown list of all supported languages.
 * Uses framer-motion for smooth open/close animations if available,
 * otherwise falls back to plain CSS transitions.
 */
export const LocaleSelector: React.FC<{
  /** Additional CSS class for the container */
  className?: string;
  /** Additional CSS class for the button */
  buttonClassName?: string;
  /** Additional CSS class for the dropdown menu */
  dropdownClassName?: string;
  /** Show native language labels (e.g. "中文" instead of "Chinese") */
  showNative?: boolean;
  /** Icon size in pixels (default: 16) */
  iconSize?: number;
}> = ({
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  showNative = true,
  iconSize = 16,
}) => {
  const { locale, setLocale, locales } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleSelect = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      setOpen(false);
    },
    [setLocale]
  );

  const currentLabel = showNative ? localeLabels[locale] : locale;

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${buttonClassName}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        {/* Globe icon */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>{currentLabel}</span>
        {/* Chevron */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 ${dropdownClassName}`}
          role="listbox"
          aria-label="Languages"
        >
          {locales.map((l) => {
            const isActive = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleSelect(l)}
              >
                {/* Checkmark for active locale */}
                <span className="mr-2 flex h-4 w-4 items-center justify-center">
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {showNative ? localeLabels[l] : l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
