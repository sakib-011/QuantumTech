import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { formatCurrency } from '../utilities/currency';

export interface FilterState {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sortBy: 'newest' | 'price-asc' | 'price-desc' | 'rating';
}

interface FilterPanelProps {
  categories: Category[];
  filters: FilterState;
  onChange: (updatedFilters: FilterState) => void;
  onReset: () => void;
  isMobileModal?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  filters,
  onChange,
  onReset,
  isMobileModal = false,
  onCloseMobile,
  className = '',
}) => {
  const { language, t } = useLanguage();

  const handleCategorySelect = (slug?: string) => {
    onChange({ ...filters, categorySlug: slug === filters.categorySlug ? undefined : slug });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    onChange({ ...filters, sortBy });
  };

  const handleInStockToggle = () => {
    onChange({ ...filters, inStockOnly: !filters.inStockOnly });
  };

  return (
    <div className={`flex flex-col gap-6 bg-surface p-5 rounded-xl border border-border ${className}`}>
      {/* Header if mobile */}
      {isMobileModal && (
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={Icons.sliders} className="text-quantum h-4 w-4" />
            <h3 className="title-2 text-ink font-semibold">{t.catalog.filters}</h3>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-2 text-muted hover:text-ink rounded-lg"
              aria-label="Close filters"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Sort By Section */}
      <div>
        <label className="caption-3 uppercase tracking-wider text-muted font-semibold block mb-2.5">
          {t.catalog.sortBy}
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'newest', label: t.catalog.sortNewest },
            { id: 'price-asc', label: t.catalog.sortPriceAsc },
            { id: 'price-desc', label: t.catalog.sortPriceDesc },
            { id: 'rating', label: t.catalog.sortRating },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSortChange(item.id as FilterState['sortBy'])}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                filters.sortBy === item.id
                  ? 'bg-quantum-soft text-quantum font-semibold'
                  : 'text-ink hover:bg-surface-alt'
              }`}
            >
              <span>{item.label}</span>
              {filters.sortBy === item.id && (
                <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-quantum" />
              )}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="caption-3 uppercase tracking-wider text-muted font-semibold">
            {t.catalog.categories}
          </label>
          {filters.categorySlug && (
            <button
              type="button"
              onClick={() => handleCategorySelect(undefined)}
              className="caption-4 text-quantum hover:underline"
            >
              All
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => handleCategorySelect(undefined)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
              !filters.categorySlug
                ? 'bg-quantum-soft text-quantum font-semibold'
                : 'text-ink hover:bg-surface-alt'
            }`}
          >
            <span>{t.catalog.allProducts}</span>
            {!filters.categorySlug && (
              <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-quantum" />
            )}
          </button>

          {categories.map((cat) => {
            const isSelected = filters.categorySlug === cat.slug;
            const name = language === 'bn' ? cat.nameBn : cat.nameEn;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.slug)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-quantum-soft text-quantum font-semibold'
                    : 'text-ink hover:bg-surface-alt'
                }`}
              >
                <span>{name}</span>
                {isSelected && (
                  <FontAwesomeIcon icon={Icons.check} className="h-3 w-3 text-quantum" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-border" />

      {/* Stock Filter */}
      <div>
        <label className="caption-3 uppercase tracking-wider text-muted font-semibold block mb-2.5">
          Stock Availability
        </label>
        <button
          type="button"
          onClick={handleInStockToggle}
          className="flex items-center gap-3 w-full py-2 px-1 text-sm text-ink hover:text-quantum transition-colors text-left"
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
              filters.inStockOnly
                ? 'bg-quantum border-quantum text-white'
                : 'border-border bg-surface'
            }`}
          >
            {filters.inStockOnly && <FontAwesomeIcon icon={Icons.check} className="h-3 w-3" />}
          </div>
          <span className="body-5">{t.catalog.inStockOnly}</span>
        </button>
      </div>

      <hr className="border-border" />

      {/* Price Range Filter */}
      <div>
        <label className="caption-3 uppercase tracking-wider text-muted font-semibold block mb-2.5">
          {t.catalog.priceRange}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="caption-5 text-muted block mb-1">Min (BDT)</span>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0"
              value={filters.minPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                handlePriceChange(val, filters.maxPrice);
              }}
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-quantum"
            />
          </div>
          <div>
            <span className="caption-5 text-muted block mb-1">Max (BDT)</span>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="5000"
              value={filters.maxPrice ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                handlePriceChange(filters.minPrice, val);
              }}
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-quantum"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="btn-base flex-1 bg-surface border border-border text-ink hover:bg-surface-muted button-sm"
        >
          {t.catalog.clearFilters}
        </button>

        {isMobileModal && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="btn-base flex-1 bg-quantum text-white hover:bg-quantum-hover button-sm"
          >
            {t.catalog.applyFilters}
          </button>
        )}
      </div>
    </div>
  );
};
