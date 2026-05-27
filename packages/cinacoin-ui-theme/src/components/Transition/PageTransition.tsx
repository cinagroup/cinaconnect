import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PageTransitionProps {
  /** Children to animate */
  children: React.ReactNode;
  /** Unique key for the current page (triggers AnimatePresence) */
  pageKey?: string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * PageTransition — wraps page content with framer-motion enter/exit animations.
 * Use `pageKey` to trigger transitions when navigating between routes.
 *
 * @example
 * ```tsx
 * <PageTransition pageKey={route.path}>{children}</PageTransition>
 * ```
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey = 'default',
  className = '',
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        className={className}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
