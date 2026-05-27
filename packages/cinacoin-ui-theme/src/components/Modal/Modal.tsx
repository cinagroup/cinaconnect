import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user requests to close */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Optional title shown in the header */
  title?: string;
  /** Close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Close on backdrop click (default: true) */
  closeOnBackdropClick?: boolean;
  /** Additional className for the card */
  cardClassName?: string;
  /** Additional className for the backdrop */
  backdropClassName?: string;
  /** Portal target (default: document.body) — unused if no portal, kept for API */
  portalTarget?: HTMLElement | null;
}

/**
 * Modal — animated modal with backdrop blur and keyboard dismissal.
 *
 * Renders with framer-motion scale+fade animation and backdrop blur.
 * Closes on Escape key and/or backdrop click.
 *
 * @example
 * ```tsx
 * <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm">
 *   <p>Are you sure?</p>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  cardClassName = '',
  backdropClassName = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeOnBackdropClick ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            ref={cardRef}
            className={`relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:text-white ${cardClassName}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Body */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
