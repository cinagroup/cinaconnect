import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface PageTransitionProps {
  /** Route key / location pathname — changing this triggers the transition */
  locationKey: string;
  /** Page content to render */
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/**
 * Page transition wrapper using framer-motion AnimatePresence.
 *
 * Provide a unique `locationKey` (e.g. `useLocation().pathname`) to
 * trigger enter/exit animations when the route changes.
 *
 * @example
 * <PageTransition locationKey={location.pathname}>
 *   <Outlet />
 * </PageTransition>
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  locationKey,
  children,
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={locationKey}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
