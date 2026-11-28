import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useToast } from '../context/ToastContext';
import { Icons } from '../utilities/icons';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none"
    >
      {toasts.map(toast => {
        const typeStyles = {
          success: {
            bg: 'bg-surface border-success',
            icon: Icons.circleCheck,
            iconColor: 'text-success',
          },
          error: {
            bg: 'bg-surface border-error',
            icon: Icons.error,
            iconColor: 'text-error',
          },
          warning: {
            bg: 'bg-surface border-warning',
            icon: Icons.warning,
            iconColor: 'text-warning',
          },
          info: {
            bg: 'bg-surface border-quantum',
            icon: Icons.circleCheck,
            iconColor: 'text-quantum',
          },
        }[toast.type];

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-float transition-all duration-300 ${typeStyles.bg}`}
          >
            <FontAwesomeIcon
              icon={typeStyles.icon}
              className={`h-5 w-5 mt-0.5 flex-shrink-0 ${typeStyles.iconColor}`}
            />

            <div className="flex-1">
              {toast.title && (
                <h4 className="title-4 text-ink font-semibold mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="body-6 text-muted">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-ink min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md hover:bg-surface-muted transition-colors"
              aria-label="Dismiss notification"
            >
              <FontAwesomeIcon icon={Icons.close} className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
