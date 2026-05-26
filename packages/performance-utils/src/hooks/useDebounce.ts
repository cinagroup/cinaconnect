/**
 * useDebounce — Hook that delays updating a value until after a pause
 * in rapid changes. Useful for search inputs, resize handlers, etc.
 *
 * Usage:
 *   function SearchBox() {
 *     const [query, setQuery] = useState('');
 *     const debouncedQuery = useDebounce(query, 300);
 *
 *     useEffect(() => {
 *       if (debouncedQuery) searchTokens(debouncedQuery);
 *     }, [debouncedQuery]);
 *
 *     return <input value={query} onChange={e => setQuery(e.target.value)} />;
 *   }
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
