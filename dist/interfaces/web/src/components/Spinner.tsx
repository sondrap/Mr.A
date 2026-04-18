import { IconLoader2 } from '@tabler/icons-react';
import type { CSSProperties } from 'react';

// Thin spinner used in loading button states. Uses Tabler's loader-2 icon + CSS spin animation.
export function Spinner({ size = 16, color }: { size?: number; color?: string }) {
  const style: CSSProperties = color ? { color } : {};
  return <IconLoader2 className="spin" size={size} style={style} />;
}
