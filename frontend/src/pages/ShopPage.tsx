import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ProductGrid } from '../components/ProductGrid';
import { FilterPanel, FilterState } from '../components/FilterPanel';
import { Breadcrumb } from '../components/Breadcrumb';
import { Pagination } from '../components/Pagination';
import { productService } from '../services/productService';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { Product } from '../types';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [useLoadMoreMode, setUseLoadMoreMode] = useState(false);
  const [loadedCount, setLoadedCount] = useState(8);
  const itemsPerPage = 8;

  const initialCat = searchParams.get('category') || undefined;
  const initialQuery = searchParams.get('q') || '';

  const [filters, setFilters] = useState<FilterState>({
    categorySlug: initialCat,
    inStockOnly: false,
    sortBy: 'newest',
  });

  // Keep filters in sync when URL category changes
  useEffect(() => {
    const cat = searchParams.get('category') || undefined;
    if (cat !== filters.categorySlug) {
      setFilters((prev) => ({ ...prev, categorySlug: cat }));
      setCurrentPage(1);
      setLoadedCount(itemsPerPage);
    }
  }, [searchParams]);

  const categories = productService.getCategories();
  const [allProducts, setAllProducts] = useState<Product[]>(() => productService.getProducts());

  useEffect(() => {
    const handleSync = () => setAllProducts(productService.getProducts());
    window.addEventListener('quantum_products_updated', handleSync);
    return () => window.removeEventListener('quantum_products_updated', handleSync);
  }, []);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search query from URL or state
    if (initialQuery.trim()) {
      result = productService.searchProducts(initialQuery, language);
    }

    // Category filter
    if (filters.categorySlug) {
      const category = categories.find((c) => c.slug === filters.categorySlug || c.id === filters.categorySlug);
      if (category) {
        result = result.filter((p) => p.categoryId === category.id);
      }
    }

    // In stock filter
    if (filters.inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // Price range
    if (filters.minPrice !== undefined) {
      result = result.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter((p) => p.price <= filters.maxPrice!);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
      default:
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }

    return result;
  }, [allProducts, initialQuery, filters, categories, language]);

  // Reset filters handler
  const handleResetFilters = () => {
    setFilters({
      categorySlug: undefined,
      inStockOnly: false,
      sortBy: 'newest',
    });
    setSearchParams({});
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
  };

  const handleCategorySelect = (slug?: string) => {
    setFilters((prev) => ({ ...prev, categorySlug: slug }));
    setCurrentPage(1);
    setLoadedCount(itemsPerPage);
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  const currentCategoryObj = categories.find(
    (c) => c.slug === filters.categorySlug || c.id === filters.categorySlug
  );
  const currentCategoryName = currentCategoryObj
    ? language === 'bn'
      ? currentCategoryObj.nameBn
      : currentCategoryObj.nameEn
    : t.catalog.allProducts;

  // Pagination & Load More calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayProducts = useMemo(() => {
    if (useLoadMoreMode) {
      return filteredProducts.slice(0, loadedCount);
    } else {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredProducts.slice(start, start + itemsPerPage);
    }
  }, [filteredProducts, useLoadMoreMode, loadedCount, currentPage, itemsPerPage]);

  const handleLoadMore = () => {
    setLoadedCount((prev) => Math.min(prev + itemsPerPage, filteredProducts.length));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: t.nav.home, href: '/' },
          { label: t.nav.shop, href: '/shop' },
          ...(currentCategoryObj ? [{ label: currentCategoryName }] : []),
        ]}
      />

      {/* Header Banner & Title */}
      <div className="my-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="heading-4 sm:heading-3 font-bold text-ink">{currentCategoryName}</h1>
          <p className="body-4 text-muted mt-1">
            {t.catalog.showing} <span className="font-semibold text-ink">{displayProducts.length}</span>{' '}
            {t.catalog.of} <span className="font-semibold text-ink">{filteredProducts.length}</span>{' '}
            {t.catalog.resultsCount}
            {initialQuery && ` for "${initialQuery}"`}
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="btn-base flex-1 bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
          >
            <FontAwesomeIcon icon={Icons.sliders} className="h-3.5 w-3.5 text-quantum" />
            <span>
              {t.catalog.filter} &amp; {t.catalog.sort}
            </span>
          </button>
        </div>
      </div>

      {/* Category Navigation Pills (Horizontal Bar for Fast Switching) */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto max-w-full pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => handleCategorySelect(undefined)}
          className={`btn-base px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            !filters.categorySlug
              ? 'bg-quantum text-white shadow-sm'
              : 'bg-surface border border-border text-ink hover:bg-surface-muted'
          }`}
        >
          {t.catalog.allProducts}
        </button>

        {categories.map((cat) => {
          const isSelected = filters.categorySlug === cat.slug || filters.categorySlug === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              data-testid={`category-pill-${cat.slug}`}
              onClick={() => handleCategorySelect(isSelected ? undefined : cat.slug)}
              className={`btn-base px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-quantum text-white shadow-sm'
                  : 'bg-surface border border-border text-ink hover:bg-surface-muted'
              }`}
            >
              {language === 'bn' ? cat.nameBn : cat.nameEn}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-24 min-w-0">
          <FilterPanel
            categories={categories}
            filters={filters}
            onChange={(newFilters) => {
              setFilters(newFilters);
              setCurrentPage(1);
              setLoadedCount(itemsPerPage);
            }}
            onReset={handleResetFilters}
          />
        </aside>

        {/* Product Grid Area (2 columns mobile, 4 columns desktop) */}
        <section className="md:col-span-8 lg:col-span-9 min-w-0">
          <ProductGrid products={displayProducts} onClearFilters={handleResetFilters} />

          {/* Pagination Controls */}
          {filteredProducts.length > itemsPerPage && (
            <div className="mt-10 flex flex-col items-center gap-4 pt-6 border-t border-border">
              {useLoadMoreMode ? (
                loadedCount < filteredProducts.length && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="btn-base bg-surface border border-border hover:border-quantum text-ink hover:text-quantum button-md font-semibold px-6 shadow-sm"
                  >
                    <FontAwesomeIcon icon={Icons.refresh} className="h-3.5 w-3.5" />
                    <span>{t.catalog.loadMore}</span>
                  </button>
                )
              ) : (
                totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                  />
                )
              )}

              {/* View Toggle mode (Pagination vs Load More) */}
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>View mode:</span>
                <button
                  type="button"
                  onClick={() => setUseLoadMoreMode(false)}
                  className={`hover:underline ${!useLoadMoreMode ? 'font-bold text-quantum' : ''}`}
                >
                  Pages
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setUseLoadMoreMode(true)}
                  className={`hover:underline ${useLoadMoreMode ? 'font-bold text-quantum' : ''}`}
                >
                  Load More
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Filter Bottom Sheet / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm md:hidden">
          <div className="w-full max-h-[85vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl p-4 shadow-float animate-slideUp">
            <FilterPanel
              categories={categories}
              filters={filters}
              onChange={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(1);
                setLoadedCount(itemsPerPage);
              }}
              onReset={handleResetFilters}
              isMobileModal
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
