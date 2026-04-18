import { motion, AnimatePresence } from 'motion/react';
import { IconX } from '@tabler/icons-react';
import { useSession } from '../store';

// Simple bottom-right toast for transient feedback (errors, info). One slot.
export function Toast() {
  const toast = useSession((s) => s.toast);
  const dismiss = useSession((s) => s.dismissToast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            bottom: 'var(--space-6)',
            right: 'var(--space-6)',
            zIndex: 100,
            maxWidth: 420,
            background: 'var(--color-gunmetal)',
            border: `1px solid ${
              toast.kind === 'error' ? 'var(--color-rust)' : toast.kind === 'success' ? 'var(--color-brass)' : 'var(--color-graphite)'
            }`,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            alignItems: 'flex-start',
            padding: 'var(--space-4)',
            gap: 'var(--space-3)',
          }}
        >
          <div
            className="type-ui-body-small"
            style={{ flex: 1, color: 'var(--color-bone-white)' }}
          >
            {toast.message}
          </div>
          <button onClick={dismiss} style={{ color: 'var(--color-dust)' }} aria-label="Dismiss">
            <IconX size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
