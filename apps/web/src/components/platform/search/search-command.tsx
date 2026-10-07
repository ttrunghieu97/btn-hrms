'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSearchEngine } from './search-engine';
import { employeeSearchProvider, navigationSearchProvider } from './providers';
import type { SearchGroup, SearchResult } from './types';

interface SearchCommandProps {
  /** Called when a result is selected */
  onSelect?: (result: SearchResult) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Min query length to trigger search */
  minQueryLength?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
}

const typeIcon: Record<string, string> = {
  employee: '👤',
  document: '📄',
  approval: '✓',
  contract: '📋',
  leave: '🏖',
  payroll: '💰',
  task: '📌',
  notification: '🔔',
};

/**
 * Search command — standalone search interface.
 * Integrates with kbar via useRegisterActions or used inline.
 */
export function SearchCommand({
  onSelect,
  placeholder = 'Search employees, documents, approvals...',
  minQueryLength = 2,
  debounceMs = 200,
}: SearchCommandProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const engine = useMemo(() => {
    const e = getSearchEngine();
    e.register(employeeSearchProvider);
    e.register(navigationSearchProvider);
    return e;
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < minQueryLength) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const groups = await engine.search(q);
      setResults(groups);
    } finally {
      setIsSearching(false);
    }
  }, [engine, minQueryLength]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => performSearch(query), debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, performSearch, debounceMs]);

  const handleSelect = useCallback((result: SearchResult) => {
    setQuery('');
    setResults([]);
    onSelect?.(result);
  }, [onSelect]);

  const totalCount = useMemo(
    () => results.reduce((sum, g) => sum + g.results.length, 0),
    [results],
  );

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          autoComplete="off"
          autoFocus
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        )}
      </div>

      {/* Results */}
      {query.length >= minQueryLength && !isSearching && totalCount === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {results.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1 py-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.results.slice(0, 5).map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="text-base shrink-0">{typeIcon[result.type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{result.title}</p>
                      {result.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 uppercase shrink-0">{result.type}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
