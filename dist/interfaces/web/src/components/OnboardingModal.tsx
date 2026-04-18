import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconArrowRight, IconX } from '@tabler/icons-react';
import { useSession } from '../store';
import { api } from '../api';
import { Button } from './Button';
import { Monogram } from './Monogram';

// First-signup onboarding. Three slides, skippable. Shown once (flag is onboardedAt).
// Fades behind a dark overlay on top of the dashboard so the user can see what they're
// about to enter, not a bare empty screen.
export function OnboardingModal() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const [slide, setSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');

  if (!user || user.onboardedAt) return null;

  const isFree = !user.roles.includes('student') && !user.roles.includes('admin');
  const totalSlides = isFree ? 3 : 2;

  const finish = async () => {
    setSaving(true);
    try {
      const res = await api.completeOnboarding({ displayName: displayName.trim() || undefined });
      setUser({ ...user, ...(res.user as typeof user), onboardedAt: Date.now() } as typeof user);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 26 }}
          style={{
            background: 'var(--color-ironwood)',
            border: '1px solid var(--color-graphite)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            maxWidth: 520,
            width: '100%',
            position: 'relative',
          }}
        >
          <button
            onClick={finish}
            aria-label="Skip"
            style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', color: 'var(--color-dust)' }}
          >
            <IconX size={18} />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {slide === 0 && (
                <>
                  <div style={{ marginBottom: 'var(--space-6)' }}>
                    <Monogram size={56} />
                  </div>
                  <h2 className="type-editorial-headline" style={{ marginBottom: 'var(--space-3)' }}>
                    You're in. Here's what you have.
                  </h2>
                  <p className="type-prose text-dust" style={{ marginBottom: 'var(--space-4)' }}>
                    MRA is your AI coaching partner — <span style={{ color: 'var(--color-bone-white)' }}>chat</span> grounded in 20+ years of Travis's teaching,{' '}
                    <span style={{ color: 'var(--color-bone-white)' }}>workflows</span> that walk you through the tactical plays end-to-end, and{' '}
                    <span style={{ color: 'var(--color-bone-white)' }}>projects</span> that keep your campaigns organized.
                  </p>
                  <div>
                    <label className="type-label text-dust" style={{ display: 'block', marginBottom: 8 }}>
                      WHAT SHOULD WE CALL YOU?
                    </label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="First name"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'var(--color-asphalt)',
                        border: '1px solid var(--color-graphite)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 15,
                        color: 'var(--color-bone-white)',
                        outline: 'none',
                        marginBottom: 'var(--space-4)',
                      }}
                    />
                  </div>
                </>
              )}
              {slide === 1 && (
                <>
                  <h2 className="type-editorial-headline" style={{ marginBottom: 'var(--space-3)' }}>
                    Start with Validate Your Niche.
                  </h2>
                  <p className="type-prose text-dust">
                    The first thing to nail is who you're going after. Open a project, start the Validate Your Niche workflow, and Mr. A will push you until you've got a niche specific enough to actually find prospects for.
                  </p>
                </>
              )}
              {slide === 2 && isFree && (
                <>
                  <h2 className="type-editorial-headline" style={{ marginBottom: 'var(--space-3)' }}>
                    Expected full access?
                  </h2>
                  <p className="type-prose text-dust">
                    If you've paid and still see "FREE" on your account, your admin can grant access from their side. Reach out to Travis's team with the email you used to pay and they'll get you upgraded.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--space-8)',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalSlides }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === slide ? 16 : 6,
                    height: 6,
                    background: i === slide ? 'var(--color-mojo-red)' : 'var(--color-graphite)',
                    borderRadius: 3,
                    transition: 'all var(--transition-base)',
                  }}
                />
              ))}
            </div>
            <Button
              variant="filled"
              tone="primary"
              loading={saving}
              onClick={() => {
                if (slide < totalSlides - 1) {
                  setSlide(slide + 1);
                } else {
                  finish();
                }
              }}
            >
              {slide < totalSlides - 1 ? 'NEXT' : "LET'S GO"} <IconArrowRight size={14} />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
