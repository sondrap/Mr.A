// Renders the MRA wordmark using the Tanker display font with our color tokens.
// Do NOT use the PNG wordmark in-app — it has atmospheric glow. Render as CSS for crispness.

interface WordmarkProps {
  size?: 'small' | 'medium' | 'large';
}

export function Wordmark({ size = 'medium' }: WordmarkProps) {
  const fontSize = size === 'small' ? 18 : size === 'large' ? 28 : 22;
  return (
    <div
      style={{
        fontFamily: 'var(--font-display)',
        fontSize,
        letterSpacing: '0.02em',
        color: 'var(--color-bone-white)',
        lineHeight: 1,
        textTransform: 'uppercase',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
      }}
    >
      <span style={{ color: 'var(--color-mojo-red)' }}>M</span>
      <span>R</span>
      <span>A</span>
    </div>
  );
}
