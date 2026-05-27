import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PasswordStrength {
  /** Score from 0 (weakest) to 4 (strongest) */
  score: number;
  /** Human-readable label */
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  /** Tailwind-compatible color class for the bar */
  color: string;
  /** Background color for unfilled segments */
  bgColor: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate password strength based on length and character variety.
 * Returns a score from 0–4.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Weak', color: 'bg-gray-200', bgColor: 'bg-gray-100' };
  }

  let score = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const length = password.length;

  if (length >= 6) score++;
  if (length >= 10) score++;
  if ((hasLower && hasUpper) || (hasDigit && hasSpecial)) score++;
  if (hasLower && hasUpper && hasDigit && hasSpecial && length >= 12) score++;

  const strengths: Record<number, Omit<PasswordStrength, 'bgColor'>> = {
    0: { score: 0, label: 'Weak', color: 'bg-red-500' },
    1: { score: 1, label: 'Fair', color: 'bg-orange-500' },
    2: { score: 2, label: 'Good', color: 'bg-yellow-500' },
    3: { score: 3, label: 'Strong', color: 'bg-green-500' },
    4: { score: 4, label: 'Very Strong', color: 'bg-emerald-500' },
  };

  const strength = strengths[score];
  return {
    ...strength,
    bgColor: score === 0 ? 'bg-gray-100' : 'bg-gray-200 dark:bg-gray-700',
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface PasswordStrengthIndicatorProps {
  /** Password value to evaluate */
  password: string;
  /** Optional CSS class for the container */
  className?: string;
  /** Show text label (default: true) */
  showLabel?: boolean;
  /** Number of segments (default: 4) */
  segments?: number;
  /** Animate changes (default: true) */
  animate?: boolean;
}

/**
 * PasswordStrengthIndicator — visual meter showing password strength.
 * Renders segmented bars with color-coded feedback and an optional text label.
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = '',
  showLabel = true,
  segments = 4,
  animate = true,
}) => {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  const activeSegments = Math.min(strength.score, segments);

  const MotionDiv = motion.div;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Segmented bar */}
      <div className="flex gap-1" role="meter" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={segments} aria-label="Password strength">
        {Array.from({ length: segments }, (_, i) => {
          const isActive = i < activeSegments;
          const colorClass = isActive ? strength.color : strength.bgColor;

          return (
            <MotionDiv
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${colorClass}`}
              initial={animate ? { scaleX: 0 } : false}
              animate={animate ? { scaleX: 1 } : false}
              transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.05 }}
              style={{ transformOrigin: 'left center' }}
            />
          );
        })}
      </div>

      {/* Text label */}
      {showLabel && password && (
        <MotionDiv
          className="text-xs font-medium"
          initial={animate ? { opacity: 0, y: 4 } : false}
          animate={animate ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.2 }}
        >
          <span
            className={
              strength.score <= 1
                ? 'text-red-500'
                : strength.score === 2
                ? 'text-yellow-600'
                : 'text-green-600'
            }
          >
            {strength.label}
          </span>
        </MotionDiv>
      )}
    </div>
  );
};
