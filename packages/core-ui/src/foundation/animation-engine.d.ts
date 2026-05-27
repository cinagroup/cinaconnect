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
export declare function getAnimationTiming(el: HTMLElement | null, theme?: OCXTheme): {
    duration: Record<string, string>;
    easing: Record<string, string>;
};
/**
 * Animate an element using the Web Animations API.
 *
 * @param element   The element to animate.
 * @param preset    Built-in animation preset.
 * @param config    Optional timing overrides.
 * @returns         A promise that resolves when the animation completes.
 */
export declare function animate(element: HTMLElement, preset: AnimationPreset, config?: AnimationConfig): Promise<void>;
/**
 * Animate an element out, then remove it from the DOM.
 */
export declare function animateOutAndRemove(element: HTMLElement, preset?: AnimationPreset, config?: AnimationConfig): Promise<void>;
/**
 * Transition a CSS property on an element.
 *
 * @param element    The element to transition.
 * @param property   CSS property name (e.g., 'opacity', 'transform').
 * @param toValue    Target value.
 * @param durationMs Duration in ms.
 * @returns          Promise resolving when transition ends.
 */
export declare function transition(element: HTMLElement, property: string, toValue: string, durationMs?: number): Promise<void>;
//# sourceMappingURL=animation-engine.d.ts.map