import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';
import { useLanguage } from '../context/LanguageContext';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  targetPath?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  onSearch,
  placeholder,
  className = '',
  autoFocus = false,
  targetPath = '/search',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return getItem<string[]>(STORAGE_KEYS.RECENT_SEARCHES, ['fast charger', 'power bank', 'earbuds', 'cables']);
  });

  const navigate = useNavigate();
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Add to recent searches
    const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    setItem(STORAGE_KEYS.RECENT_SEARCHES, updated);
    setIsFocused(false);

    const dest = targetPath || '/search';
    navigate(`${dest}?q=${encodeURIComponent(trimmed)}`);
    if (onSearch) {
      onSearch(trimmed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) onSearch('');
  };

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    setItem(STORAGE_KEYS.RECENT_SEARCHES, []);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center justify-center z-10">
          <FontAwesomeIcon icon={Icons.search} className="h-4 w-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder || t.header.searchPlaceholder}
          autoFocus={autoFocus}
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-ink placeholder:text-muted-light focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft transition-all shadow-2xs"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10"
            aria-label="Clear search query"
          >
            <FontAwesomeIcon icon={Icons.close} className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Recent Searches Dropdown */}
      {isFocused && recentSearches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-border bg-surface p-3 shadow-float animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
            <span className="caption-4 text-muted font-semibold uppercase tracking-wider">
              Recent Searches
            </span>
            <button
              type="button"
              onClick={handleClearRecent}
              className="caption-4 text-quantum hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setQuery(term);
                  handleExecuteSearch(term);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-xs text-ink hover:bg-quantum-soft hover:text-quantum hover:border-quantum/30 transition-colors"
              >
                <FontAwesomeIcon icon={Icons.clock} className="h-2.5 w-2.5 text-muted" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
