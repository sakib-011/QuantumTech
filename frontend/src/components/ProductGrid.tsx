import React from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onClearFilters?: () => void;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onClearFilters,
  className = '',
}) => {
  const { t } = useLanguage();

  if (isLoading) {
    return <LoadingSkeleton type="card" count={8} />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Icons.search}
        title={emptyTitle || t.catalog.noResults}
        description={emptyDescription || t.catalog.noResultsSuggestion}
        actionText={onClearFilters ? t.catalog.clearFilters : undefined}
        onAction={onClearFilters}
      />
    );
  }

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ${className}`}
    >
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
