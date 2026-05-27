/**
 * framer-motion animation primitives for @cinacoin/ui-theme.
 *
 * Provides ready-to-use animated wrappers and standalone motion components.
 */
import React from 'react';
import { motion, AnimatePresence, Variants, HTMLMotionProps } from 'framer-motion';

// ─── Shared Variants ────────────────────────────────────────────────────────

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

// ─── MotionDiv ──────────────────────────────────────────────────────────────

export interface MotionDivProps extends HTMLMotionProps<'div'> {
  /** Animation variant preset: "fade" | "slideUp" | "scale" */
  variant?: 'fade' | 'slideUp' | 'scale';
  /** Delay before animation starts (ms) */
  delay?: number;
}

/**
 * Animated div wrapper with optional variant preset and delay.
 *
 * @example
 * <MotionDiv variant="slideUp" delay={100}>Content</MotionDiv>
 */
export const MotionDiv: React.FC<MotionDivProps> = ({
  variant = 'fade',
  delay = 0,
  initial = 'hidden',
  animate = 'visible',
  ...props
}) => {
  const variantMap: Record<string, Variants> = {
    fade: fadeInVariants,
    slideUp: slideUpVariants,
    scale: scaleInVariants,
  };

  const chosenVariants = props.variants ?? variantMap[variant];
  const withDelay = { ...chosenVariants, visible: { ...(chosenVariants.visible || {}), transition: { ...((chosenVariants.visible as any)?.transition || {}), delay: delay / 1000 } } };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      variants={withDelay}
      {...props}
    />
  );
};

// ─── AnimatePresence Wrapper ────────────────────────────────────────────────

export interface AnimatePresenceWrapperProps {
  children: React.ReactNode;
  /** Whether the child is mounted; toggling triggers exit animation */
  visible: boolean;
  /** Exit mode: "sync" | "wait" | "popLayout" */
  mode?: 'sync' | 'wait' | 'popLayout';
}

/**
 * Convenience wrapper around framer-motion's AnimatePresence.
 *
 * @example
 * <AnimatePresenceWrapper visible={showModal}>{children}</AnimatePresenceWrapper>
 */
export const AnimatePresenceWrapper: React.FC<AnimatePresenceWrapperProps> = ({
  children,
  visible,
  mode = 'sync',
}) => (
  <AnimatePresence mode={mode}>{visible ? children : null}</AnimatePresence>
);

// ─── Standalone Components ──────────────────────────────────────────────────

export interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

/** Fade-in animation wrapper. */
export const FadeIn: React.FC<FadeInProps> = ({ delay = 0, ...props }) => (
  <MotionDiv variant="fade" delay={delay} {...props} />
);

export interface SlideUpProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

/** Slide-up animation wrapper. */
export const SlideUp: React.FC<SlideUpProps> = ({ delay = 0, ...props }) => (
  <MotionDiv variant="slideUp" delay={delay} {...props} />
);

export interface ScaleInProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

/** Scale-in animation wrapper (good for modals / cards). */
export const ScaleIn: React.FC<ScaleInProps> = ({ delay = 0, ...props }) => (
  <MotionDiv variant="scale" delay={delay} {...props} />
);
