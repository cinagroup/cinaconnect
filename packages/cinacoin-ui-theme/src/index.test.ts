import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  themes,
  minimal,
  rounded,
  retro,
  nouns,
  midnight,
  defaultTheme,
  ThemeProvider,
  useTheme,
  useThemeStore,
  ThemeConfig,
  fadeInOut,
  slideUp,
  slideDown,
  scaleIn,
  slideFromLeft,
  slideFromRight,
  pageTransition,
  modalBackdrop,
  modalContent,
  staggerContainer,
  staggerItem,
  fastTransition,
  standardTransition,
  smoothTransition,
  hoverSpring,
  FadeIn,
  SlideUp,
  ScaleIn,
  Hoverable,
  StaggerList,
  StaggerItem,
  AnimatePresence,
  motion,
  PasswordStrengthIndicator,
  calculatePasswordStrength,
  PageTransition,
  Modal,
} from './index';

// ─── Theme Data ──────────────────────────────────────────────────────────

describe('themes data', () => {
  it('exports 6 themes', () => {
    expect(Object.keys(themes).length).toBe(6);
  });

  it('each theme has required fields', () => {
    const required: (keyof ThemeConfig)[] = [
      'id', 'name', 'primary', 'secondary', 'background', 'surface',
      'text', 'textInverse', 'textMuted', 'border', 'focusRing',
      'borderRadius', 'fontFamily', 'roundedCards', 'shadow', 'buttonCasing',
    ];
    for (const [id, theme] of Object.entries(themes)) {
      for (const field of required) {
        expect(theme).toHaveProperty(field);
        expect((theme as any)[field]).toBeDefined();
      }
    }
  });

  it('minimal has zero border radius', () => {
    expect(minimal.borderRadius).toBe(0);
  });

  it('rounded has positive border radius', () => {
    expect(rounded.borderRadius).toBeGreaterThan(0);
  });

  it('midnight is a dark theme', () => {
    expect(midnight.background).toMatch(/^#[0-9a-fA-F]{6}$/);
    // Background starts with 0 (dark)
    expect(parseInt(midnight.background.slice(1, 3), 16)).toBeLessThan(50);
  });

  it('defaultTheme has reasonable defaults', () => {
    expect(defaultTheme.id).toBe('default');
    expect(defaultTheme.primary).toBe('#2563eb');
    expect(defaultTheme.borderRadius).toBe(8);
  });

  it('theme ids match exported themes', () => {
    const store = useThemeStore.getState();
    expect(store.themeIds.length).toBe(6);
  });
});

// ─── Animation Variants ──────────────────────────────────────────────────

describe('animation variants', () => {
  it('fadeInOut has initial/animate/exit states', () => {
    expect(fadeInOut).toHaveProperty('initial');
    expect(fadeInOut).toHaveProperty('animate');
    expect(fadeInOut).toHaveProperty('exit');
    expect(fadeInOut.initial.opacity).toBe(0);
    expect(fadeInOut.animate.opacity).toBe(1);
    expect(fadeInOut.exit.opacity).toBe(0);
  });

  it('slideUp has correct y values', () => {
    expect(slideUp.initial.y).toBe(20);
    expect(slideUp.animate.y).toBe(0);
    expect(slideUp.exit.y).toBe(20);
  });

  it('slideDown has correct y values', () => {
    expect(slideDown.initial.y).toBe(-20);
    expect(slideDown.animate.y).toBe(0);
    expect(slideDown.exit.y).toBe(-20);
  });

  it('scaleIn has correct scale values', () => {
    expect(scaleIn.initial.scale).toBe(0.9);
    expect(scaleIn.animate.scale).toBe(1);
    expect(scaleIn.exit.scale).toBe(0.9);
  });

  it('slideFromLeft has negative x', () => {
    expect(slideFromLeft.initial.x).toBe(-30);
    expect(slideFromLeft.animate.x).toBe(0);
  });

  it('slideFromRight has positive x', () => {
    expect(slideFromRight.initial.x).toBe(30);
    expect(slideFromRight.animate.x).toBe(0);
  });

  it('pageTransition has cross-fade and shift', () => {
    expect(pageTransition.initial.opacity).toBe(0);
    expect(pageTransition.initial.y).toBe(10);
    expect(pageTransition.animate.opacity).toBe(1);
    expect(pageTransition.animate.y).toBe(0);
  });

  it('modalBackdrop fades in/out', () => {
    expect(modalBackdrop.initial.opacity).toBe(0);
    expect(modalBackdrop.animate.opacity).toBe(1);
  });

  it('modalContent scales and shifts', () => {
    expect(modalContent.initial.scale).toBe(0.95);
    expect(modalContent.animate.scale).toBe(1);
    expect(modalContent.initial.y).toBe(10);
    expect(modalContent.animate.y).toBe(0);
  });

  it('staggerContainer has staggered transition config', () => {
    expect(staggerContainer.animate).toBeDefined();
    expect((staggerContainer.animate as any).transition.staggerChildren).toBe(0.07);
  });

  it('staggerItem has initial/animate/exit states', () => {
    expect(staggerItem.initial.opacity).toBe(0);
    expect(staggerItem.animate.opacity).toBe(1);
    expect(staggerItem.exit.opacity).toBe(0);
  });
});

// ─── Transition Presets ──────────────────────────────────────────────────

describe('transition presets', () => {
  it('fastTransition is a tween', () => {
    expect(fastTransition.type).toBe('tween');
    expect(fastTransition.duration).toBe(0.15);
  });

  it('standardTransition is a spring', () => {
    expect(standardTransition.type).toBe('spring');
    expect(standardTransition.stiffness).toBe(400);
  });

  it('smoothTransition has custom easing', () => {
    expect(smoothTransition.type).toBe('tween');
    expect(smoothTransition.duration).toBe(0.4);
  });

  it('hoverSpring is a gentle spring', () => {
    expect(hoverSpring.type).toBe('spring');
    expect(hoverSpring.stiffness).toBe(300);
  });
});

// ─── Motion Components ───────────────────────────────────────────────────

describe('motion components', () => {
  it('FadeIn renders children', () => {
    render(
      React.createElement(FadeIn, null,
        React.createElement('span', null, 'Hello')
      )
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('SlideUp renders children', () => {
    render(
      React.createElement(SlideUp, null,
        React.createElement('span', null, 'Slide Me')
      )
    );
    expect(screen.getByText('Slide Me')).toBeDefined();
  });

  it('ScaleIn renders children', () => {
    render(
      React.createElement(ScaleIn, null,
        React.createElement('span', null, 'Scale Me')
      )
    );
    expect(screen.getByText('Scale Me')).toBeDefined();
  });

  it('Hoverable renders children and accepts onClick', () => {
    const onClick = vi.fn();
    render(
      React.createElement(Hoverable, { onClick },
        React.createElement('span', null, 'Hover Me')
      )
    );
    expect(screen.getByText('Hover Me')).toBeDefined();
    fireEvent.click(screen.getByText('Hover Me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('StaggerList renders children', () => {
    render(
      React.createElement(StaggerList, null,
        React.createElement('div', null, 'Item 1'),
        React.createElement('div', null, 'Item 2')
      )
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });

  it('StaggerItem renders children', () => {
    render(
      React.createElement(StaggerItem, null,
        React.createElement('span', null, 'Staggered')
      )
    );
    expect(screen.getByText('Staggered')).toBeDefined();
  });

  it('AnimatePresence is exported', () => {
    expect(AnimatePresence).toBeDefined();
  });

  it('motion is exported', () => {
    expect(motion).toBeDefined();
    expect(motion.div).toBeDefined();
  });
});

// ─── PasswordStrength ────────────────────────────────────────────────────

describe('calculatePasswordStrength', () => {
  it('returns score 0 for empty password', () => {
    const result = calculatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('Weak');
  });

  it('returns score 1 for short lowercase', () => {
    const result = calculatePasswordStrength('abc');
    expect(result.score).toBe(1);
  });

  it('returns score 2 for medium length mixed case', () => {
    const result = calculatePasswordStrength('Abcdef');
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it('returns score 3 for longer password with digits', () => {
    const result = calculatePasswordStrength('Abcdefg1234');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('returns score 4 for very strong password', () => {
    const result = calculatePasswordStrength('Abcdefgh1234!@#');
    expect(result.score).toBe(4);
    expect(result.label).toBe('Very Strong');
  });

  it('has correct color classes', () => {
    expect(calculatePasswordStrength('').color).toBe('bg-gray-200');
    expect(calculatePasswordStrength('weak').color).toBe('bg-red-500');
    expect(calculatePasswordStrength('Abcdefg1!@').color).toBe('bg-green-500');
  });

  it('has correct label for score 3', () => {
    const result = calculatePasswordStrength('Abcdefg1!@');
    expect(result.label).toBe('Strong');
  });
});

describe('PasswordStrengthIndicator', () => {
  it('renders without crashing', () => {
    render(
      React.createElement(PasswordStrengthIndicator, {
        password: 'test123',
      })
    );
    expect(screen.getByRole('meter')).toBeDefined();
  });

  it('shows "Weak" for weak password', () => {
    render(
      React.createElement(PasswordStrengthIndicator, {
        password: 'ab',
      })
    );
    expect(screen.getByText('Weak')).toBeDefined();
  });

  it('shows "Very Strong" for strong password', () => {
    render(
      React.createElement(PasswordStrengthIndicator, {
        password: 'Abcdefgh1234!@#',
      })
    );
    expect(screen.getByText('Very Strong')).toBeDefined();
  });

  it('hides label when showLabel is false', () => {
    render(
      React.createElement(PasswordStrengthIndicator, {
        password: 'test123',
        showLabel: false,
      })
    );
    expect(screen.queryByText('Fair')).toBeNull();
    expect(screen.queryByText('Good')).toBeNull();
    expect(screen.queryByText('Weak')).toBeNull();
  });

  it('renders correct number of segments', () => {
    render(
      React.createElement(PasswordStrengthIndicator, {
        password: 'Abcdefgh1234!@#',
        segments: 4,
      })
    );
    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuemax')).toBe('4');
  });
});

// ─── PageTransition ──────────────────────────────────────────────────────

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      React.createElement(PageTransition, { pageKey: 'home' },
        React.createElement('div', null, 'Home Page')
      )
    );
    expect(screen.getByText('Home Page')).toBeDefined();
  });

  it('accepts custom className', () => {
    render(
      React.createElement(PageTransition, {
        pageKey: 'about',
        className: 'custom-class',
      },
        React.createElement('span', null, 'About')
      )
    );
    expect(screen.getByText('About')).toBeDefined();
  });

  it('uses default pageKey', () => {
    render(
      React.createElement(PageTransition, null,
        React.createElement('span', null, 'Default')
      )
    );
    expect(screen.getByText('Default')).toBeDefined();
  });
});

// ─── Modal ───────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      React.createElement(Modal, {
        isOpen: false,
        onClose: vi.fn(),
      },
        React.createElement('p', null, 'Modal Content')
      )
    );
    expect(screen.queryByText('Modal Content')).toBeNull();
  });

  it('renders when isOpen is true', () => {
    render(
      React.createElement(Modal, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Modal',
      },
        React.createElement('p', null, 'Modal Content')
      )
    );
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText('Modal Content')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      React.createElement(Modal, {
        isOpen: true,
        onClose,
        title: 'Test Modal',
      },
        React.createElement('p', null, 'Content')
      )
    );
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders without title', () => {
    render(
      React.createElement(Modal, {
        isOpen: true,
        onClose: vi.fn(),
      },
        React.createElement('p', null, 'No Title')
      )
    );
    expect(screen.getByText('No Title')).toBeDefined();
    expect(screen.queryByLabelText('Close modal')).toBeNull();
  });

  it('renders close button when title is provided', () => {
    render(
      React.createElement(Modal, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Has Title',
      },
        React.createElement('p', null, 'Content')
      )
    );
    expect(screen.getByLabelText('Close modal')).toBeDefined();
  });
});

// ─── ThemeProvider / useTheme ────────────────────────────────────────────

describe('ThemeProvider', () => {
  it('throws useTheme outside provider', () => {
    const Consumer = () => {
      useTheme();
      return null;
    };
    expect(() => render(React.createElement(Consumer))).toThrow('useTheme must be used within a ThemeProvider');
  });
});

describe('useThemeStore', () => {
  it('returns default theme initially', () => {
    const state = useThemeStore.getState();
    expect(state.theme.id).toBe('default');
  });

  it('can switch themes', () => {
    useThemeStore.getState().setTheme('midnight');
    expect(useThemeStore.getState().theme.id).toBe('midnight');
    // Reset
    useThemeStore.getState().setTheme('default');
  });

  it('can get theme by id', () => {
    const retroTheme = useThemeStore.getState().getTheme('retro');
    expect(retroTheme?.id).toBe('retro');
    expect(retroTheme?.primary).toBe('#e67e22');
  });

  it('returns undefined for unknown theme', () => {
    const result = useThemeStore.getState().getTheme('nonexistent');
    expect(result).toBeUndefined();
  });

  it('can cycle through themes', () => {
    const initial = useThemeStore.getState().theme.id;
    useThemeStore.getState().cycleTheme();
    const after = useThemeStore.getState().theme.id;
    expect(after).not.toBe(initial);
    // Reset
    useThemeStore.getState().setTheme('default');
  });

  it('lists all theme ids', () => {
    const ids = useThemeStore.getState().themeIds;
    expect(ids).toContain('minimal');
    expect(ids).toContain('rounded');
    expect(ids).toContain('retro');
    expect(ids).toContain('nouns');
    expect(ids).toContain('midnight');
    expect(ids).toContain('default');
  });
});
