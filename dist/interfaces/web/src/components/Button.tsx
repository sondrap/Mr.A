import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

// Core button component. Three variants (filled, outlined, ghost) × three tones (primary=red,
// neutral=bone-white, destructive=red).
// Loading state swaps the label for a spinner while preserving button width — no layout shift.
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'filled' | 'outlined' | 'ghost';
  tone?: 'primary' | 'neutral' | 'paper';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'outlined',
  tone = 'neutral',
  size = 'medium',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const padding =
    size === 'small' ? '6px 12px' : size === 'large' ? '14px 24px' : '10px 18px';
  const fontSize = size === 'small' ? 11 : size === 'large' ? 13 : 12;

  const isRed = tone === 'primary';

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding,
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    flexWrap: 'nowrap' as const,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled && !loading ? 0.5 : 1,
    minHeight: size === 'small' ? 28 : size === 'large' ? 48 : 36,
    userSelect: 'none',
  };

  let variantStyle: React.CSSProperties = {};

  if (variant === 'filled') {
    variantStyle = {
      background: isRed ? 'var(--color-mojo-red)' : tone === 'paper' ? 'var(--color-coal)' : 'var(--color-bone-white)',
      color: isRed || tone === 'paper' ? 'var(--color-bone-white)' : 'var(--color-asphalt)',
      border: '1px solid transparent',
    };
  } else if (variant === 'outlined') {
    const borderColor = isRed ? 'var(--color-mojo-red)' : tone === 'paper' ? 'var(--color-coal)' : 'var(--color-graphite)';
    const textColor = isRed ? 'var(--color-mojo-red)' : tone === 'paper' ? 'var(--color-coal)' : 'var(--color-bone-white)';
    variantStyle = {
      background: 'transparent',
      color: textColor,
      border: `1px solid ${borderColor}`,
    };
  } else {
    variantStyle = {
      background: 'transparent',
      color: isRed ? 'var(--color-mojo-red)' : tone === 'paper' ? 'var(--color-coal)' : 'var(--color-dust)',
      border: '1px solid transparent',
    };
  }

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ ...baseStyle, ...variantStyle, ...style }}
      onMouseOver={(e) => {
        if (disabled || loading) return;
        if (variant === 'filled') {
          (e.currentTarget as HTMLButtonElement).style.background = isRed
            ? 'var(--color-ember)'
            : tone === 'paper'
              ? 'var(--color-asphalt)'
              : 'var(--color-dust)';
        } else if (variant === 'outlined') {
          (e.currentTarget as HTMLButtonElement).style.background = isRed
            ? 'rgba(212, 38, 44, 0.1)'
            : tone === 'paper'
              ? 'rgba(26, 24, 21, 0.06)'
              : 'var(--color-gunmetal)';
        } else {
          (e.currentTarget as HTMLButtonElement).style.color = isRed
            ? 'var(--color-clay)'
            : tone === 'paper'
              ? 'var(--color-asphalt)'
              : 'var(--color-bone-white)';
        }
      }}
      onMouseOut={(e) => {
        if (variant === 'filled') {
          (e.currentTarget as HTMLButtonElement).style.background = variantStyle.background as string;
        } else if (variant === 'outlined') {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        } else {
          (e.currentTarget as HTMLButtonElement).style.color = variantStyle.color as string;
        }
      }}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  );
}
