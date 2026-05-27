/**
 * Animation engine for Cinacoin Web Components.
 *
 * Provides a lightweight, CSS-variable-driven animation system with
 * support for transitions, keyframe animations, and spring physics.
 */

import type { OCXTheme } from './base-element.js';

/** Animation preset identifiers. */
export type AnimationPreset = 'fadeIn' | 'fadeOut' | 'slideUp' | 'slideDown' | 'scaleIn' | 'scaleOut' | 'shake';

/** Configuration for a single animation. */
export interface AnimationConfig {
  /** Duration in ms (overrides CSS variable). */
  duration?: number;
  /** Easing function (overrides CSS variable). */
  easing?: string;
  /** Delay in ms before animation starts. */
  delay?: number;
  /** Whether to keep final state after animation ends. */
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  /** Number of iterations. */
  iterations?: number;
}

/** Read animation timing values from CSS variables on an element. */
export function getAnimationTiming(
  el: HTMLElement | null,
  theme: OCXTheme = 'dark'
): { duration: Record<string, string>; easing: Record<string, string> } {
  const style = el ? getComputedStyle(el) : null;
  return {
    duration: {
      fast: style?.getPropertyValue('--ocx-duration-fast') || '150ms',
      normal: style?.getPropertyValue('--ocx-duration-normal') || '250ms',
      slow: style?.getPropertyValue('--ocx-duration-slow') || '400ms',
    },
    easing: {
      default: style?.getPropertyValue('--ocx-easing-default') || 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: style?.getPropertyValue('--ocx-easing-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  };
}

/** Built-in keyframe definitions. */
const KEYFRAMES: Record<AnimationPreset, Keyframe[]> = {
  fadeIn: [
    { opacity: 0 },
    { opacity: 1 },
  ],
  fadeOut: [
    { opacity: 1 },
    { opacity: 0 },
  ],
  slideUp: [
    { opacity: 0, transform: 'translateY(16px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  slideDown: [
    { opacity: 0, transform: 'translateY(-16px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  scaleIn: [
    { opacity: 0, transform: 'scale(0.95)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  scaleOut: [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.95)' },
  ],
  shake: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ],
};

/**
 * Animate an element using the Web Animations API.
 *
 * @param element   The element to animate.
 * @param preset    Built-in animation preset.
 * @param config    Optional timing overrides.
 * @returns         A promise that resolves when the animation completes.
 */
export async function animate(
  element: HTMLElement,
  preset: AnimationPreset,
  config: AnimationConfig = {}
): Promise<void> {
  const timing = getAnimationTiming(element);
  const durationMs = config.duration ?? parseInt(timing.duration.normal, 10);
  const easing = config.easing ?? timing.easing.default;

  return new Promise((resolve) => {
    const animation = element.animate(KEYFRAMES[preset], {
      duration: durationMs,
      easing,
      delay: config.delay ?? 0,
      fill: config.fillMode ?? 'both',
      iterations: config.iterations ?? 1,
    });
    animation.onfinish = () => resolve();
    animation.oncancel = () => resolve();
  });
}

/**
 * Animate an element out, then remove it from the DOM.
 */
export async function animateOutAndRemove(
  element: HTMLElement,
  preset: AnimationPreset = 'fadeOut',
  config?: AnimationConfig
): Promise<void> {
  await animate(element, preset, config);
  element.remove();
}

/**
 * Transition a CSS property on an element.
 *
 * @param element    The element to transition.
 * @param property   CSS property name (e.g., 'opacity', 'transform').
 * @param toValue    Target value.
 * @param durationMs Duration in ms.
 * @returns          Promise resolving when transition ends.
 */
export function transition(
  element: HTMLElement,
  property: string,
  toValue: string,
  durationMs = 250
): Promise<void> {
  return new Promise((resolve) => {
    element.style.transition = `${property} ${durationMs}ms var(--ocx-easing-default, ease)`;
    element.style.setProperty(property.startsWith('--') ? property : property, toValue);

    const onEnd = () => {
      element.removeEventListener('transitionend', onEnd);
      resolve();
    };
    element.addEventListener('transitionend', onEnd, { once: true });

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(resolve, durationMs + 50);
  });
}
