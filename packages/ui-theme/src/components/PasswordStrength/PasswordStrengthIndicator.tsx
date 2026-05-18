import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../themes/ThemeProvider';

export type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordStrengthIndicatorProps {
  /** Password value to evaluate */
  password: string;
}

interface StrengthInfo {
  level: StrengthLevel;
  score: number; // 0-4
  label: string;
  color: string;
  width: string; // bar fill percentage
}

/**
 * Evaluate password strength and return a strength info object.
 */
function evaluatePassword(password: string): StrengthInfo {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Clamp to 0-4
  score = Math.min(score, 4);

  if (score <= 1) {
    return { level: 'weak', score, label: 'Weak', color: '#ef4444', width: '25%' };
  }
  if (score === 2) {
    return { level: 'fair', score, label: 'Fair', color: '#f59e0b', width: '50%' };
  }
  if (score === 3) {
    return { level: 'strong', score, label: 'Strong', color: '#22c55e', width: '75%' };
  }
  return { level: 'very-strong', score, label: 'Very Strong', color: '#10b981', width: '100%' };
}

/**
 * Password strength meter component.
 *
 * Displays a color-coded progress bar with a label indicating
 * password strength: weak / fair / strong / very-strong.
 *
 * @example
 * <PasswordStrengthIndicator password={value} />
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const { theme } = useTheme();
  const strength = useMemo(() => evaluatePassword(password), [password]);

  if (!password) return null;

  return (
    <div
      style={{
        marginTop: theme.spacing.xs,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Segmented bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '4px',
        }}
      >
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: theme.radii.full,
              backgroundColor:
                segment <= strength.score ? strength.color : theme.colors.border,
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Label */}
      <motion.span
        key={strength.label}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: strength.color,
        }}
      >
        {strength.label}
      </motion.span>
    </div>
  );
};
