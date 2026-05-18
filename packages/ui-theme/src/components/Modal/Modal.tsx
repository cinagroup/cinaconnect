import React, { useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback fired when the modal should close */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Modal title (optional) */
  title?: string;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** CSS max-width for the modal panel */
  maxWidth?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 12,
    transition: { duration: 0.2 },
  },
};

/**
 * Animated modal with backdrop blur.
 *
 * - Closes on Escape key press
 * - Closes on backdrop click (configurable)
 * - Uses framer-motion for enter/exit animations
 *
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)}>
 *   <p>Modal content here</p>
 * </Modal>
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  maxWidth = '480px',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Focus the panel for accessibility
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '16px',
          }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            key="modal-panel"
            ref={panelRef}
            variants={panelVariants}
            tabIndex={-1}
            style={{
              width: '100%',
              maxWidth,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              outline: 'none',
            }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                {title && (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    aria-label="Close modal"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#6b7280',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '20px' }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
