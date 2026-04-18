import type { CitationChip as CitationChipData } from '../types';
import { useSession } from '../store';

// Single citation chip rendered below Mr. A's chat reply or inline where sources are referenced.
// Format: `01 · CDODU · FAST ACTION PLAN · 14:22`
// The number is Mojo Red; everything else is Dust on Ironwood. Clicking opens the source side panel.
interface CitationChipProps {
  chip: CitationChipData;
}

export function CitationChip({ chip }: CitationChipProps) {
  const openSource = useSession((s) => s.openSource);

  return (
    <button
      type="button"
      onClick={() => openSource(chip.sourceId)}
      className="type-mono-detail"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'var(--color-ironwood)',
        border: '1px solid var(--color-graphite)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-dust)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        fontSize: 11,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-mojo-red)';
        e.currentTarget.style.color = 'var(--color-bone-white)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-graphite)';
        e.currentTarget.style.color = 'var(--color-dust)';
      }}
    >
      <span style={{ color: 'var(--color-mojo-red)' }}>{String(chip.num).padStart(2, '0')}</span>
      <span style={{ width: 3, height: 3, background: 'var(--color-smoke)', borderRadius: '50%' }} />
      <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{chip.contextShortName}</span>
      {chip.contentName && (
        <>
          <span style={{ width: 3, height: 3, background: 'var(--color-smoke)', borderRadius: '50%' }} />
          <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{chip.contentName}</span>
        </>
      )}
      {chip.locator && (
        <>
          <span style={{ width: 3, height: 3, background: 'var(--color-smoke)', borderRadius: '50%' }} />
          <span>{chip.locator}</span>
        </>
      )}
    </button>
  );
}
