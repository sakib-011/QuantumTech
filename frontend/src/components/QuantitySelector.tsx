import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../context/LanguageContext';
import { Icons } from '../utilities/icons';
import { formatNumber } from '../utilities/currency';

interface QuantitySelectorProps {
  quantity: number;
  min?: number;
  max?: number;
  onChange: (newQuantity: number) => void;
  disabled?: boolean;
  className?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
  className = '',
}) => {
  const { language } = useLanguage();

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > min && !disabled) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < max && !disabled) {
      onChange(quantity + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-border bg-surface shadow-sm ${className}`}
      role="group"
      aria-label="Quantity selector"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || quantity <= min}
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-l-lg text-ink transition-colors hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:text-muted-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
        aria-label="Decrease quantity"
      >
        <FontAwesomeIcon icon={Icons.minus} className="h-3 w-3" />
      </button>

      <span
        className="flex h-11 min-w-[36px] items-center justify-center px-2 title-4 text-ink font-medium select-none"
        aria-live="polite"
      >
        {formatNumber(quantity, language)}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || quantity >= max}
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-r-lg text-ink transition-colors hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:text-muted-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
        aria-label="Increase quantity"
      >
        <FontAwesomeIcon icon={Icons.plus} className="h-3 w-3" />
      </button>
    </div>
  );
};
