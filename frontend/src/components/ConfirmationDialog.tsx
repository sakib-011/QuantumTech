import React from 'react';
import { Modal } from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  children,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              isDestructive ? 'bg-error-soft text-error' : 'bg-quantum-soft text-quantum'
            }`}
          >
            <FontAwesomeIcon
              icon={isDestructive ? Icons.warning : Icons.circleCheck}
              className="h-5 w-5"
            />
          </div>
          <div>
            <p className="body-4 text-ink mb-1">{message}</p>
          </div>
        </div>

        {children}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-base bg-surface text-ink border border-border hover:bg-surface-muted button-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn-base button-sm text-white ${
              isDestructive
                ? 'bg-error hover:bg-error-dark'
                : 'bg-quantum hover:bg-quantum-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
