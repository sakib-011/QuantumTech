import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center overflow-x-auto py-2 text-sm text-muted whitespace-nowrap ${className}`}
    >
      <ol className="flex items-center gap-1.5 list-none p-0 m-0">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 text-muted hover:text-quantum transition-colors caption-1"
          >
            <FontAwesomeIcon icon={Icons.store} className="h-3 w-3" />
            <span>Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={Icons.chevronRight}
                className="h-2.5 w-2.5 text-muted-light"
                aria-hidden="true"
              />
              {isLast || !item.href ? (
                <span
                  className="caption-1 font-semibold text-ink"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="caption-1 text-muted hover:text-quantum transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
