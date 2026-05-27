import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion';
import React from 'react';

// ─── Transition Presets ──────────────────────────────────────────────────────

/** Fast transition for micro-interactions (buttons, toggles) */
export const fastTransition: Transition = { type: 'tween', duration: 0.15, ease: 'easeOut' };

/** Standard transition for most UI elements */
export const standardTransition: Transition = { type: 'spring', stiffness: 400, damping: 30 };

/** Smooth transition for page-level changes */
export const smoothTransition: Transition = { type: 'tween', duration: 0.4, ease: [0.25, 0.1, 0.25, 1] };

/** Gentle spring for card hover effects */
export const hoverSpring: Transition = { type: 'spring', stiffness: 300, damping: 20 };

// ─── Variants Presets ────────────────────────────────────────────────────────

/** Fade-in/out variants */
export const fadeInOut: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Slide-up variants (enter from below) */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/** Slide-down variants (enter from above) */
export const slideDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/** Scale-in variants (pop effect) */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/** Slide from left */
export const slideFromLeft: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

/** Slide from right */
export const slideFromRight: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
};

/** Page transition with cross-fade and vertical shift */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: -10, transition: fastTransition },
};

/** Modal backdrop + content variants */
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

/** Stagger children animation config */
export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

// ─── Pre-wrapped Motion Components ───────────────────────────────────────────

/** Fade-in motion div */
export const FadeIn: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ ...standardTransition, delay: delay ?? 0 }}
  >
    {children}
  </motion.div>
);

/** Slide-up motion div */
export const SlideUp: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div className={className} variants={slideUp} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

/** Scale-in motion div (good for cards) */
export const ScaleIn: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div className={className} variants={scaleIn} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

/** Hover-interactive motion div */
export const Hoverable: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className, onClick }) => (
  <motion.div
    className={className}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={hoverSpring}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

/** Stagger container for lists */
export const StaggerList: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div className={className} variants={staggerContainer} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

/** Stagger list item */
export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div className={className} variants={staggerItem}>
    {children}
  </motion.div>
);

export { AnimatePresence, motion };
