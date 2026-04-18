import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../api';
import { Wordmark } from '../components/Wordmark';
import { Button } from '../components/Button';
import { useSession } from '../store';

// The login + signup page. Single route, two phases:
//   1. Email input
//   2. 6-digit code
//
// Critical details from the brand spec:
// - 6 individual 56px Gunmetal boxes for the code input
// - Auto-advance between digits, auto-submit on paste
// - Shake + Rust error on invalid code, boxes never resize
// - No layout shift between phases — use opacity transitions
// - Mojo Red inner border on active box
// - Resend code with 30s cooldown
// - Generous split layout desktop; mobile stacks
export function LoginPage() {
  const [, navigate] = useLocation();
  const user = useSession((s) => s.user);
  const [phase, setPhase] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect when authenticated
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-focus first digit on phase change
  useEffect(() => {
    if (phase === 'code') {
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } else {
      emailInputRef.current?.focus();
    }
  }, [phase]);

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setSendingCode(true);
    setError(null);
    try {
      const res = await auth.sendEmailCode(trimmed);
      setVerificationId(res.verificationId);
      setPhase('code');
      setCooldown(30);
      setCodeDigits(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'rate_limited') {
        setError('Too many attempts. Try again in a few minutes.');
      } else {
        setError(e.message ?? 'Could not send code. Try again.');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async (code: string) => {
    if (!verificationId || code.length !== 6) return;
    setVerifying(true);
    setCodeError(false);
    try {
      await auth.verifyEmailCode(verificationId, code);
      // onAuthStateChanged will fire and the useEffect above handles redirect
    } catch (err: unknown) {
      const e = err as { code?: string };
      setCodeError(true);
      if (e.code === 'invalid_code') {
        setError('Wrong code. Try again.');
      } else if (e.code === 'verification_expired') {
        setError('Code expired. Send a new one.');
      } else if (e.code === 'max_attempts_exceeded') {
        setError('Too many attempts. Send a new code.');
      } else {
        setError('Verification failed. Try again.');
      }
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        setCodeError(false);
        inputRefs.current[0]?.focus();
      }, 300);
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (idx: number, value: string) => {
    const sanitized = value.replace(/\D/g, '');
    if (sanitized.length > 1) {
      // Paste handler — fill all boxes + auto-submit
      const pasted = sanitized.slice(0, 6).split('');
      const filled = [...pasted, ...Array(6 - pasted.length).fill('')];
      setCodeDigits(filled);
      if (pasted.length === 6) {
        verifyCode(pasted.join(''));
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
      return;
    }
    const newDigits = [...codeDigits];
    newDigits[idx] = sanitized;
    setCodeDigits(newDigits);
    if (sanitized && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (newDigits.every((d) => d)) {
      verifyCode(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left column — content */}
      <div
        style={{
          flex: '1 1 60%',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(24px, 5vw, 64px)',
          minWidth: 0,
          position: 'relative',
        }}
      >
        <div style={{ marginBottom: 'auto' }}>
          <Wordmark size="medium" />
        </div>

        <div style={{ maxWidth: 560 }}>
          <h1
            className="type-hero-display"
            style={{
              color: 'var(--color-bone-white)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Get to work.
          </h1>
          <p
            className="type-prose text-dust"
            style={{
              marginBottom: 'var(--space-8)',
              maxWidth: '48ch',
            }}
          >
            Mr. A is your AI coaching partner for Travis Sago's world. Walk through the plays, draft the artifacts, and land the partners — with every answer cited back to Travis's actual teaching.
          </p>

          <div
            style={{
              background: 'var(--color-gunmetal)',
              border: '1px solid var(--color-graphite)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              maxWidth: 420,
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AnimatePresence mode="wait">
              {phase === 'email' ? (
                <motion.div
                  key="email-phase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
                >
                  <div className="type-label text-dust">EMAIL</div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                    placeholder="you@example.com"
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-asphalt)',
                      border: '1px solid var(--color-graphite)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 15,
                      color: 'var(--color-bone-white)',
                      outline: 'none',
                    }}
                  />
                  <Button
                    variant="filled"
                    tone="primary"
                    size="large"
                    loading={sendingCode}
                    onClick={sendCode}
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    SEND CODE
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="code-phase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
                >
                  <div>
                    <div className="type-label text-dust">CHECK YOUR EMAIL</div>
                    <div className="type-ui-body" style={{ marginTop: 6 }}>
                      We sent a 6-digit code to{' '}
                      <span style={{ color: 'var(--color-bone-white)', fontWeight: 600 }}>{email}</span>
                    </div>
                  </div>
                  <div
                    className={codeError ? 'shake' : ''}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 'var(--space-2)',
                      maxWidth: 360,
                    }}
                  >
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={(e) => e.currentTarget.select()}
                        disabled={verifying}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          maxHeight: 56,
                          background: 'var(--color-asphalt)',
                          border: codeError
                            ? '1px solid var(--color-rust)'
                            : '1px solid var(--color-graphite)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 24,
                          fontWeight: 600,
                          fontFamily: 'var(--font-ui)',
                          color: 'var(--color-bone-white)',
                          textAlign: 'center',
                          outline: 'none',
                          boxShadow: 'inset 0 0 0 2px transparent',
                          transition: 'box-shadow var(--transition-fast)',
                        }}
                        onFocusCapture={(e) => {
                          e.currentTarget.style.boxShadow = 'inset 0 0 0 2px var(--color-mojo-red)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = 'inset 0 0 0 2px transparent';
                        }}
                      />
                    ))}
                  </div>

                  {/* Reserved height for error message to prevent layout shift */}
                  <div style={{ minHeight: 18 }}>
                    {error && (
                      <div className="type-caption" style={{ color: 'var(--color-rust)' }}>
                        {error}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-4)',
                    }}
                  >
                    <button
                      onClick={() => {
                        setPhase('email');
                        setError(null);
                        setCodeDigits(['', '', '', '', '', '']);
                      }}
                      className="type-label text-dust"
                      style={{ padding: '4px 0' }}
                    >
                      ← Change email
                    </button>
                    <button
                      onClick={sendCode}
                      disabled={cooldown > 0 || sendingCode}
                      className="type-mono-detail"
                      style={{
                        color: cooldown > 0 ? 'var(--color-smoke)' : 'var(--color-mojo-red)',
                      }}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {phase === 'email' && error && (
            <div className="type-caption" style={{ color: 'var(--color-rust)', marginTop: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          {phase === 'email' && (
            <div className="type-caption text-smoke" style={{ marginTop: 'var(--space-4)', maxWidth: 420 }}>
              Don't have access yet? Check with Travis's team.
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="type-mono-detail text-smoke">MR. A · v1.0</div>
        </div>
      </div>

      {/* Right column — photograph */}
      <div
        className="photo-column"
        style={{
          flex: '0 0 40%',
          background: 'var(--color-asphalt)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          src="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png?w=1200&fm=jpg&q=85"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'grayscale(10%) contrast(1.05)',
          }}
        />
        <div
          className="type-mono-detail"
          style={{
            position: 'absolute',
            top: 'var(--space-6)',
            right: 'var(--space-6)',
            color: 'var(--color-dust)',
            opacity: 0.7,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          MR. A · v1.0
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .photo-column { display: none; }
        }
      `}</style>
    </div>
  );
}
