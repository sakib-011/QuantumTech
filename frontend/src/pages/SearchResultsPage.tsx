import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { productService } from '../services/productService';
import { useLanguage } from '../context/LanguageContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { ProductGrid } from '../components/ProductGrid';
import { CategoryCard } from '../components/CategoryCard';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { Icons } from '../utilities/icons';
import { Product, Category } from '../types';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const urlQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'price-asc' | 'price-desc' | 'rating'>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return getItem<string[]>(STORAGE_KEYS.RECENT_SEARCHES, ['charger', 'earbuds', 'cable', 'power bank', 'gan']);
  });

  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('quantum_products_updated', handleSync);
    return () => window.removeEventListener('quantum_products_updated', handleSync);
  }, []);

  const categories = productService.getCategories();

  // Sync state if URL query changes
  useEffect(() => {
    setSearchInput(urlQuery);
    setCurrentPage(1);

    if (urlQuery.trim()) {
      const trimmed = urlQuery.trim();
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      setItem(STORAGE_KEYS.RECENT_SEARCHES, updated);
    }
  }, [urlQuery]);

  // Execute new search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleSelectRecent = (term: string) => {
    setSearchInput(term);
    setSearchParams({ q: term });
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    setRecentSearches([]);
    setItem(STORAGE_KEYS.RECENT_SEARCHES, []);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // Perform search across mock products
  const searchResults = useMemo(() => {
    let results: Product[];

    if (!urlQuery.trim()) {
      results = productService.getProducts();
    } else {
      results = productService.searchProducts(urlQuery, language);
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      results = results.filter((p) => p.categoryId === selectedCategory);
    }

    // In Stock Filter
    if (inStockOnly) {
      results = results.filter((p) => p.stock > 0);
    }

    // Sort Logic
    switch (sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'relevance':
      default:
        // Already ranked by search engine or original order
        break;
    }

    return results;
  }, [urlQuery, selectedCategory, inStockOnly, sortBy, language, syncVersion]);

  // Pagination
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchResults.slice(start, start + itemsPerPage);
  }, [searchResults, currentPage, itemsPerPage]);

  const popularKeywords = [
    { en: 'Fast Charger', bn: 'ফাস্ট চার্জার', q: 'fast charger' },
    { en: 'Wireless Earbuds', bn: 'ওয়্যারলেস ইয়ারবাডস', q: 'earbuds' },
    { en: 'Type-C Cable', bn: 'টাইপ-সি ক্যাবল', q: 'type-c' },
    { en: 'GaN 65W', bn: 'জিএএন ৬৫ ওয়াট', q: 'gan 65w' },
    { en: 'Power Bank', bn: 'পাওয়ার ব্যাংক', q: 'power bank' },
    { en: 'Shockproof Case', bn: 'শকপ্রুফ কেস', q: 'case' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.nav.shop, href: '/shop' },
          { label: t.search?.title || 'Search Results' },
        ]}
      />

      {/* Main Search Bar Header Section */}
      <div className="my-6 rounded-2xl bg-surface border border-border p-5 sm:p-8 shadow-sm">
        <h1 className="heading-4 sm:heading-3 font-bold text-ink mb-2">
          {t.search?.title || 'Search Tech Accessories'}
        </h1>
        <p className="body-4 text-muted mb-6">
          {t.search?.subtitle || 'Search across chargers, cables, audio, cases, and computer essentials.'}
        </p>

        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-3xl">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <FontAwesomeIcon icon={Icons.search} className="h-4 w-4" />
            </div>

            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.search?.inputPlaceholder || 'Search chargers, earbuds, cables...'}
              className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-surface-alt text-sm text-ink placeholder:text-muted focus:outline-none focus:border-quantum focus:ring-2 focus:ring-quantum-soft transition-all"
            />

            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-border transition-colors"
                title="Clear search"
                aria-label="Clear search query"
              >
                <FontAwesomeIcon icon={Icons.xmark} className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="ml-2.5 h-12 px-6 rounded-xl bg-quantum text-white font-semibold text-sm hover:bg-quantum-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={Icons.search} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.search?.searchButton || 'Search'}</span>
          </button>
        </form>

        {/* Recent Searches Row */}
        {recentSearches.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted flex items-center gap-1.5 mr-1">
              <FontAwesomeIcon icon={Icons.clock} className="h-3 w-3 text-quantum" />
              <span>{t.search?.recentSearches || 'Recent Searches'}:</span>
            </span>

            {recentSearches.map((term, idx) => (
              <button
                key={`${term}-${idx}`}
                type="button"
                onClick={() => handleSelectRecent(term)}
                className="btn-base px-2.5 py-1 rounded-lg bg-surface-alt border border-border text-ink hover:border-quantum hover:text-quantum transition-colors button-xsm"
              >
                {term}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-muted hover:text-error hover:underline ml-auto flex items-center gap-1"
            >
              <FontAwesomeIcon icon={Icons.trash} className="h-2.5 w-2.5" />
              <span>{t.search?.clearHistory || 'Clear history'}</span>
            </button>
          </div>
        )}

        {/* Popular Categories Chips */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted mr-1">
            {t.search?.popularCategories || 'Popular Categories'}:
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setCurrentPage(1);
            }}
            className={`btn-base px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-quantum text-white border-quantum shadow-sm'
                : 'bg-surface border-border text-ink hover:bg-surface-muted'
            }`}
          >
            {language === 'bn' ? 'সব বিভাগ' : 'All Categories'}
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id === selectedCategory ? 'all' : cat.id);
                setCurrentPage(1);
              }}
              className={`btn-base px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-quantum text-white border-quantum shadow-sm'
                  : 'bg-surface border-border text-ink hover:bg-surface-muted'
              }`}
            >
              {language === 'bn' ? cat.nameBn : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header & Control Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        {/* Results Counter */}
        <div className="flex items-center gap-2">
          <h2 className="title-2 sm:title-1 font-bold text-ink">
            {urlQuery ? (
              <span>
                {language === 'bn' ? `"${urlQuery}" এর জন্য ` : `Results for "${urlQuery}": `}
                <span className="text-quantum font-bold">{searchResults.length}</span>{' '}
                <span className="text-muted text-sm font-normal">
                  {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'products found'}
                </span>
              </span>
            ) : (
              <span>
                <span className="text-quantum font-bold">{searchResults.length}</span>{' '}
                <span className="text-muted text-sm font-normal">
                  {language === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'products available'}
                </span>
              </span>
            )}
          </h2>
        </div>

        {/* Filter and Sort Options */}
        <div className="flex flex-wrap items-center gap-3">
          {/* In Stock Only Toggle */}
          <button
            type="button"
            onClick={() => {
              setInStockOnly(!inStockOnly);
              setCurrentPage(1);
            }}
            className={`btn-base button-xsm text-xs rounded-lg px-3 py-1.5 border transition-all ${
              inStockOnly
                ? 'bg-quantum text-white border-quantum shadow-sm'
                : 'bg-surface border-border text-ink hover:bg-surface-muted'
            }`}
          >
            <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />
            <span>{t.catalog.inStockOnly}</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="search-sort" className="text-xs text-muted font-medium whitespace-nowrap">
              {t.catalog.sortBy}:
            </label>
            <div className="relative">
              <select
                id="search-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="h-8 pl-2.5 pr-8 rounded-lg border border-border bg-surface text-xs font-medium text-ink focus:outline-none focus:border-quantum appearance-none cursor-pointer"
              >
                <option value="relevance">
                  {language === 'bn' ? 'প্রাসঙ্গিকতা' : 'Relevance'}
                </option>
                <option value="newest">{t.catalog.sortNewest}</option>
                <option value="price-asc">{t.catalog.sortPriceAsc}</option>
                <option value="price-desc">{t.catalog.sortPriceDesc}</option>
                <option value="rating">{t.catalog.sortRating}</option>
              </select>
              <FontAwesomeIcon
                icon={Icons.chevronDown}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Results Display */}
      {searchResults.length === 0 ? (
        <div className="rounded-2xl bg-surface border border-border p-8 sm:p-12 text-center shadow-sm">
          <EmptyState
            icon={Icons.search}
            title={
              language === 'bn'
                ? `"${urlQuery}" এর জন্য কোনো পণ্য পাওয়া যায়নি`
                : `No products found for "${urlQuery}"`
            }
            description={
              language === 'bn'
                ? 'বানান পরীক্ষা করুন অথবা অন্য কোনো প্রাসঙ্গিক শব্দ যেমন চার্জার, ক্যাবল, ইয়ারবাডস লিখে অনুসন্ধান করুন।'
                : "We couldn't find any tech accessories matching your search. Try checking your spelling or search for popular accessories below."
            }
            actionText={language === 'bn' ? 'সকল পণ্য দেখুন' : 'Browse All Products'}
            onAction={() => {
              setSearchInput('');
              setSearchParams({});
              setSelectedCategory('all');
              setInStockOnly(false);
            }}
          />

          {/* Suggested keywords */}
          <div className="mt-8 pt-8 border-t border-border max-w-xl mx-auto">
            <p className="caption-1 font-semibold text-muted mb-3">
              {language === 'bn' ? 'জনপ্রিয় অনুসন্ধানের পরামর্শ:' : 'Try searching for:'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {popularKeywords.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectRecent(item.q)}
                  className="btn-base px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-xs font-medium text-ink hover:border-quantum hover:text-quantum transition-colors"
                >
                  {language === 'bn' ? item.bn : item.en}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Categories Grid */}
          <div className="mt-10 max-w-4xl mx-auto text-left">
            <h3 className="title-2 font-bold text-ink mb-4 text-center">
              {language === 'bn' ? 'বিভাগ অনুযায়ী খুঁজুন' : 'Browse by Category'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Product Grid (2 columns mobile, 4 columns desktop) */}
          <ProductGrid products={paginatedResults} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
