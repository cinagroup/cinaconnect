import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Themes (data-only modules) ─────────────────────────────────── */

import { defaultTheme } from './themes/default';
import { minimalTheme } from './themes/minimal';
import { roundedTheme } from './themes/rounded';
import { retroTheme } from './themes/retro';
import { nounsTheme } from './themes/nouns';
import { midnightTheme } from './themes/midnight';
import type { ThemeConfig } from './themes/types';

describe('defaultTheme', () => {
  it('has the correct theme name', () => {
    expect(defaultTheme.name).toBe('default');
  });

  it('has a complete color palette', () => {
    const colors = defaultTheme.colors;
    expect(colors).toHaveProperty('primary');
    expect(colors).toHaveProperty('primaryHover');
    expect(colors).toHaveProperty('secondary');
    expect(colors).toHaveProperty('background');
    expect(colors).toHaveProperty('surface');
    expect(colors).toHaveProperty('text');
    expect(colors).toHaveProperty('textSecondary');
    expect(colors).toHaveProperty('border');
    expect(colors).toHaveProperty('error');
    expect(colors).toHaveProperty('success');
    expect(colors).toHaveProperty('warning');
  });

  it('has spacing tokens in ascending order', () => {
    const { xs, sm, md, lg, xl, xxl } = defaultTheme.spacing;
    const values = [xs, sm, md, lg, xl, xxl].map(s => parseInt(s));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('has shadow tokens for sm, md, lg', () => {
    const shadows = defaultTheme.shadows;
    expect(shadows).toHaveProperty('sm');
    expect(shadows).toHaveProperty('md');
    expect(shadows).toHaveProperty('lg');
  });

  it('has radii with sm, md, lg, xl, full', () => {
    const { sm, md, lg, xl, full } = defaultTheme.radii;
    expect(sm).toBe('4px');
    expect(md).toBe('8px');
    expect(full).toBe('9999px');
  });

  it('has a fontFamily defined', () => {
    expect(defaultTheme.fontFamily.length).toBeGreaterThan(0);
  });
});

describe('alternative themes', () => {
  const themes: { name: string; theme: ThemeConfig }[] = [
    { name: 'minimal', theme: minimalTheme },
    { name: 'rounded', theme: roundedTheme },
    { name: 'retro', theme: retroTheme },
    { name: 'nouns', theme: nounsTheme },
    { name: 'midnight', theme: midnightTheme },
  ];

  themes.forEach(({ name, theme }) => {
    it(`${name}Theme has all required fields`, () => {
      expect(theme.name).toBeTruthy();
      expect(theme.colors).toBeDefined();
      expect(theme.radii).toBeDefined();
      expect(theme.shadows).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.fontFamily).toBeDefined();
    });

    it(`${name}Theme has correct name property`, () => {
      expect(theme.name).toBe(name);
    });
  });
});

/* ── Animations (variants) ──────────────────────────────────────── */

import { fadeInVariants, slideUpVariants, scaleInVariants } from './animations/motion';

describe('motion variants', () => {

  it('fadeInVariants has hidden, visible, exit states', () => {
    expect(fadeInVariants).toHaveProperty('hidden');
    expect(fadeInVariants).toHaveProperty('visible');
    expect(fadeInVariants).toHaveProperty('exit');
  });

  it('fadeIn hidden has opacity 0', () => {
    expect(fadeInVariants.hidden.opacity).toBe(0);
  });

  it('fadeIn visible has opacity 1', () => {
    expect(fadeInVariants.visible.opacity).toBe(1);
  });

  it('slideUpVariants has hidden with y offset', () => {
    expect(slideUpVariants.hidden.y).toBe(24);
    expect(slideUpVariants.hidden.opacity).toBe(0);
  });

  it('slideUpVariants visible resets y to 0', () => {
    expect(slideUpVariants.visible.y).toBe(0);
  });

  it('scaleInVariants has hidden with scale < 1', () => {
    expect(scaleInVariants.hidden.scale).toBe(0.92);
    expect(scaleInVariants.hidden.opacity).toBe(0);
  });

  it('scaleInVariants visible has scale 1', () => {
    expect(scaleInVariants.visible.scale).toBe(1);
  });
});
