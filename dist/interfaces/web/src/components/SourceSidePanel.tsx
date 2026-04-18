import { useEffect, useState } from 'react';
import { IconX, IconExternalLink } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '../store';
import { api } from '../api';
import type { SourceSidePanelResponse } from '../api';
import { Button } from './Button';

// Side panel that opens when the user clicks a citation chip anywhere in the app.
// Shows: context + content name, description, full body, related concepts, and an OPEN AT 14:22
// deep-link action that takes the student directly to the moment in the source.
//
// Slides in from the right on desktop (480px). Full-screen overlay on mobile.
export function SourceSidePanel() {
  const openSourceId = useSession((s) => s.openSourceId);
  const close = useSession((s) => s.closeSource);
  const [data, setData] = useState<SourceSidePanelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openSourceId) return;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .getSource({ id: openSourceId })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err?.message ?? 'Failed to load source');
        setLoading(false);
      });
  }, [openSourceId]);

  useEffect(() => {
    if (!openSourceId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSourceId, close]);

  return (
    <AnimatePresence>
      {openSourceId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 50,
            }}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(480px, 100vw)',
              background: 'var(--color-ironwood)',
              borderLeft: '1px solid var(--color-graphite)',
              zIndex: 51,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <header
              style={{
                padding: 'var(--space-6)',
                borderBottom: '1px solid var(--color-graphite)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-4)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {data ? (
                  <>
                    <div className="type-label text-dust" style={{ marginBottom: 4 }}>
                      {data.source.contextName}
                    </div>
                    <div className="type-editorial-subhead">{data.source.contentName}</div>
                    <div className="type-mono-detail text-dust" style={{ marginTop: 8 }}>
                      {data.source.locator ?? 'Source'}
                    </div>
                  </>
                ) : loading ? (
                  <>
                    <div className="skeleton-block" style={{ width: 80, height: 12, marginBottom: 8 }} />
                    <div className="skeleton-block" style={{ width: 240, height: 26 }} />
                  </>
                ) : null}
              </div>
              <button
                onClick={close}
                aria-label="Close"
                style={{
                  color: 'var(--color-dust)',
                  padding: 8,
                  marginRight: -8,
                  marginTop: -8,
                }}
              >
                <IconX size={20} />
              </button>
            </header>

            <div className="scroll-y" style={{ flex: 1, padding: 'var(--space-6)' }}>
              {error && <div className="type-ui-body" style={{ color: 'var(--color-rust)' }}>{error}</div>}
              {data && (
                <>
                  {data.source.description && (
                    <div
                      className="type-prose text-dust"
                      style={{ fontStyle: 'italic', marginBottom: 'var(--space-6)', lineHeight: 1.45 }}
                    >
                      {data.source.description}
                    </div>
                  )}
                  {data.source.chunkHeading && (
                    <div className="type-editorial-subhead" style={{ marginBottom: 'var(--space-4)' }}>
                      {data.source.chunkHeading}
                    </div>
                  )}
                  <div
                    className="type-prose"
                    style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                  >
                    {data.source.body}
                  </div>

                  {data.relatedConcepts.length > 0 && (
                    <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-graphite)' }}>
                      <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>
                        Teaches
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {data.relatedConcepts.map((c) => (
                          <span
                            key={c.slug}
                            className="type-ui-body-small"
                            style={{
                              padding: '4px 10px',
                              background: 'var(--color-gunmetal)',
                              border: '1px solid var(--color-graphite)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-bone-white)',
                            }}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {data && data.source.linkUrl && (
              <footer
                style={{
                  padding: 'var(--space-4) var(--space-6)',
                  borderTop: '1px solid var(--color-graphite)',
                  background: 'var(--color-ironwood)',
                }}
              >
                <a
                  href={data.source.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block' }}
                >
                  <Button variant="outlined" tone="primary" size="large" style={{ width: '100%' }}>
                    <IconExternalLink size={16} />
                    OPEN AT {data.source.timestampStartFormatted ??
                      (data.source.pageStart ? `PAGE ${data.source.pageStart}` : 'SOURCE')}
                  </Button>
                </a>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
