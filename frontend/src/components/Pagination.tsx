import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';
import { useLanguage } from '../context/LanguageContext';
import { formatNumber } from '../utilities/currency';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  const { language } = useLanguage();

  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex items-center justify-center gap-1.5 py-4 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:text-muted-light disabled:hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
        aria-label="Previous page"
      >
        <FontAwesomeIcon icon={Icons.chevronLeft} className="h-3.5 w-3.5" />
      </button>

      {getPages().map((page, idx) => {
        if (typeof page === 'string') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-11 w-8 items-center justify-center caption-1 text-muted"
            >
              ...
            </span>
          );
        }

        const isCurrent = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={isCurrent ? 'page' : undefined}
            className={`flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg title-4 font-semibold transition-all ${
              isCurrent
                ? 'bg-quantum text-white shadow-sm'
                : 'border border-border bg-surface text-ink hover:bg-surface-muted active:scale-95'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum`}
          >
            {formatNumber(page, language)}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors hover:bg-surface-muted active:scale-95 disabled:cursor-not-allowed disabled:text-muted-light disabled:hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
        aria-label="Next page"
      >
        <FontAwesomeIcon icon={Icons.chevronRight} className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
};
