import type { CSSProperties } from 'react';

// Mr. A's M monogram — rendered at runtime in CSS/SVG, never as a PNG in-app.
// The designer's explicit direction: the app icon PNG has atmospheric glow that looks wrong
// at small sizes on Asphalt. Always render the in-app monogram this way.
interface MonogramProps {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export function Monogram({ size = 32, style, className }: MonogramProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: 'var(--color-mojo-red)',
        color: 'var(--color-bone-white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
        borderRadius: 'var(--radius-sm)',
        letterSpacing: '0.02em',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      M
    </div>
  );
}
