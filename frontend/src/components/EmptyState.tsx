import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Icons } from '../utilities/icons';

interface EmptyStateProps {
  icon?: IconDefinition;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Icons.search,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
  children,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-surface border border-border my-6 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-quantum-soft text-quantum mb-4">
        <FontAwesomeIcon icon={icon} className="h-7 w-7" />
      </div>

      <h3 className="heading-6 text-ink mb-2">
        {title}
      </h3>

      <p className="body-5 text-muted max-w-md mb-6">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="btn-base bg-quantum text-white hover:bg-quantum-hover button-sm shadow-sm"
            >
              {actionText}
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="btn-base bg-surface text-ink border border-border hover:bg-surface-muted button-sm"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}

      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
};
