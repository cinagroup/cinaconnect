/**
 * Tests for @cinacoin/design-tokens theme translation.
 * Tests theme token translation and CSS variable generation.
 */
import { describe, it, expect } from 'vitest';
import { themes, cssVariables, cssVariablesLight, cssVariablesMinimal, } from '../../src/index.js';
describe('Design Tokens - Theme Translation', () => {
    describe('themes export', () => {
        it('should export dark theme with correct mode', () => {
            expect(themes.dark).toBeDefined();
            expect(themes.dark.mode).toBe('dark');
        });
        it('should export light theme with correct mode', () => {
            expect(themes.light).toBeDefined();
            expect(themes.light.mode).toBe('light');
        });
        it('should export minimal theme', () => {
            expect(themes.minimal).toBeDefined();
            expect(themes.minimal.mode).toBeDefined();
        });
        it('dark theme colors should contain expected tokens', () => {
            const colors = themes.dark.colors;
            expect(colors).toBeDefined();
            expect(Object.keys(colors).length).toBeGreaterThan(0);
            expect(colors['--ocx-color-accent-500']).toBeDefined();
        });
        it('light theme should have different colors than dark', () => {
            const darkColors = themes.dark.colors;
            const lightColors = themes.light.colors;
            // At least some colors should differ
            let differentCount = 0;
            for (const key of Object.keys(darkColors)) {
                if (darkColors[key] !== lightColors[key]) {
                    differentCount++;
                }
            }
            expect(differentCount).toBeGreaterThan(0);
        });
    });
    describe('CSS variable generation', () => {
        it('cssVariables should contain :root selector', () => {
            expect(cssVariables).toContain(':root');
        });
        it('cssVariables should contain CSS variable declarations', () => {
            expect(cssVariables).toContain('--ocx-');
            expect(cssVariables).toContain(':');
            expect(cssVariables).toContain(';');
        });
        it('cssVariablesLight should target light theme class', () => {
            expect(cssVariablesLight).toContain('.ocx-theme-light');
        });
        it('cssVariablesMinimal should target minimal theme class', () => {
            expect(cssVariablesMinimal).toContain('.ocx-theme-minimal');
        });
    });
});
//# sourceMappingURL=translator.test.js.map