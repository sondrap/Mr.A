// Renders the "Mr. A" wordmark using the Tanker display font with our color tokens.
// Brand convention: capital M, lowercase r, period, space, capital A.
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
        letterSpacing: '0.01em',
        color: 'var(--color-bone-white)',
        lineHeight: 1,
        // Do NOT uppercase — the lowercase "r" is intentional per brand.
        userSelect: 'none',
        display: 'flex',
        alignItems: 'baseline',
      }}
    >
      <span style={{ color: 'var(--color-mojo-red)' }}>M</span>
      <span style={{ textTransform: 'lowercase' }}>r</span>
      <span>.&nbsp;A</span>
    </div>
  );
}
