import React from 'react';
import { formatCurrency, formatNumber } from '../utilities/currency';
import { useLanguage } from '../context/LanguageContext';

interface PriceDisplayProps {
  price: number;
  oldPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountBadge?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  oldPrice,
  size = 'md',
  showDiscountBadge = false,
  className = '',
}) => {
  const { language } = useLanguage();

  const discountPercent = oldPrice && oldPrice > price 
    ? Math.round(((oldPrice - price) / oldPrice) * 100) 
    : 0;

  const sizeClasses = {
    sm: {
      current: 'title-4 text-ink font-semibold',
      old: 'caption-4 text-muted line-through',
      badge: 'caption-5 px-1.5 py-0.5',
    },
    md: {
      current: 'title-2 text-ink font-semibold',
      old: 'caption-2 text-muted line-through',
      badge: 'caption-4 px-2 py-0.5',
    },
    lg: {
      current: 'heading-6 text-quantum font-semibold',
      old: 'body-5 text-muted line-through',
      badge: 'caption-3 px-2 py-0.5',
    },
    xl: {
      current: 'heading-4 text-ink font-semibold',
      old: 'title-3 text-muted line-through',
      badge: 'caption-3 px-2.5 py-1',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={currentSize.current}>
        {formatCurrency(price, language)}
      </span>

      {oldPrice && oldPrice > price && (
        <span className={currentSize.old}>
          {formatCurrency(oldPrice, language)}
        </span>
      )}

      {showDiscountBadge && discountPercent > 0 && (
        <span className={`${currentSize.badge} rounded bg-error-soft text-error font-medium`}>
          -{formatNumber(discountPercent, language)}%
        </span>
      )}
    </div>
  );
};
