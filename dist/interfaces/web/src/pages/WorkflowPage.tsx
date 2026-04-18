import { useEffect, useRef, useState } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import {
  IconArrowLeft,
  IconCircleCheck,
  IconPlayerPlay,
  IconRefresh,
  IconAlertTriangle,
  IconChevronRight,
  IconCopy,
} from '@tabler/icons-react';
import { api } from '../api';
import type { WorkflowRun, Artifact, Project } from '../api';
import { Button } from '../components/Button';
import { useSession } from '../store';

// 6 Coffee Dates steps + 1 Validate Niche step = canonical metadata for frontend rendering.
// Keep this in sync with dist/methods/src/common/workflowSteps.ts if you change step titles.
const STEP_META: Record<string, Array<{ title: string; subtitle: string; artifactTitle: string }>> = {
  'validate-niche': [
    { title: 'Validate your niche', subtitle: 'Sharpen who you serve', artifactTitle: 'Niche Doc' },
  ],
  'coffee-dates-giving-funnel': [
    { title: 'Validate your niche', subtitle: 'Sharpen who you serve', artifactTitle: 'Niche Doc' },
    { title: 'Research your partner list', subtitle: '7-8 figure training wheels partners', artifactTitle: 'Prospect List' },
    { title: 'Draft your attraction video', subtitle: 'Give first, one specific thing', artifactTitle: 'Attraction Video Outline' },
    { title: 'Set up your Skool group', subtitle: 'Where hand-raisers land', artifactTitle: 'Skool Setup Plan' },
    { title: 'Write your cold outreach', subtitle: 'T1 → T2 → T3', artifactTitle: 'Outreach Pack' },
    { title: 'Track conversations and iterate', subtitle: 'The running workspace', artifactTitle: 'Conversation Log' },
  ],
};

export function WorkflowPage() {
  const [, params] = useRoute<{ runId: string }>('/workflows/:runId');
  const [, navigate] = useLocation();
  const runId = params?.runId;

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepInput, setStepInput] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.getWorkflowRun({ runId });
        if (cancelled) return;
        setRun(data.run);
        setProject(data.project);
        setArtifacts(data.artifacts);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [runId]);

  // Poll while the step is actively generating / reviewing so the UI shows progress
  useEffect(() => {
    if (!run || !runId) return;
    const isProcessing = run.status === 'generating' || run.status === 'reviewing' || run.status === 'revising';
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (!isProcessing) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await api.getWorkflowRun({ runId });
        setRun(data.run);
        setArtifacts(data.artifacts);
      } catch (err) {
        console.error(err);
      }
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [run?.status, runId]);

  if (loading) {
    return (
      <div style={{ padding: 48 }}>
        <div className="skeleton-block" style={{ width: 300, height: 28, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ width: 200, height: 14 }} />
      </div>
    );
  }

  if (!run || !project) {
    return (
      <div style={{ padding: 48, maxWidth: 560 }}>
        <h1 className="type-editorial-headline" style={{ marginBottom: 12 }}>Workflow not found.</h1>
        <p className="type-prose text-dust" style={{ marginBottom: 24 }}>
          This workflow may have been archived, or you may not have access to it.
        </p>
        <Button variant="outlined" onClick={() => navigate('/')}>Back to projects</Button>
      </div>
    );
  }

  const steps = STEP_META[run.workflowSlug] ?? [];
  const currentStep = steps[run.currentStep - 1];
  const currentArtifact = artifacts.find((a) => a.stepIndex === run.currentStep);

  const canGenerate = run.status === 'draft' || run.status === 'ready' || run.status === 'flagged';
  const isProcessing = run.status === 'generating' || run.status === 'reviewing' || run.status === 'revising';

  const runStep = async (regenerate = false) => {
    if (!runId) return;
    setRunning(true);
    try {
      await api.runWorkflowStep({
        runId,
        stepIndex: run.currentStep,
        studentInput: { ...(run.state[`step${run.currentStep}`] ?? {}), ...stepInput, _isRegenerate: regenerate },
      });
      // Refetch once to pick up 'generating' status, then polling kicks in
      const data = await api.getWorkflowRun({ runId });
      setRun(data.run);
      setArtifacts(data.artifacts);
    } catch (err) {
      console.error(err);
      useSession.getState().showToast('error', err instanceof Error ? err.message : 'Could not start step');
    } finally {
      setRunning(false);
    }
  };

  const advance = async () => {
    if (!runId) return;
    try {
      const res = await api.advanceWorkflowStep({ runId });
      setRun(res.run);
      setStepInput({});
      if (res.complete) {
        useSession.getState().showToast('success', 'Workflow complete. Nice work.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const jumpTo = async (stepIdx: number) => {
    if (!runId || stepIdx === run.currentStep) return;
    // Only allow jumping back to reached steps
    if (stepIdx > run.currentStep && run.status !== 'complete') return;
    try {
      const res = await api.goToWorkflowStep({ runId, stepIndex: stepIdx });
      setRun(res.run);
      setStepInput({});
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 3-column layout: step rail + canvas + artifact panel */}
      <div className="workflow-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '200px 1fr 40%', overflow: 'hidden' }}>
        {/* Left: step rail */}
        <nav
          className="step-rail no-select"
          style={{
            background: 'var(--color-ironwood)',
            borderRight: '1px solid var(--color-graphite)',
            padding: 'var(--space-6) 0',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="type-editorial-subhead" style={{ fontSize: 18 }}>
              {run.workflowSlug === 'coffee-dates-giving-funnel' ? 'Coffee Dates + Giving Funnel' : 'Validate Your Niche'}
            </div>
            <div className="type-mono-detail text-dust" style={{ marginTop: 8 }}>
              {run.currentStep} OF {run.totalSteps} · {statusLabel(run.status)}
            </div>
          </div>

          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isCurrent = stepNum === run.currentStep;
            const isCompleted = stepNum < run.currentStep || run.status === 'complete';
            const isLocked = stepNum > run.currentStep && run.status !== 'complete';

            return (
              <button
                key={stepNum}
                onClick={() => jumpTo(stepNum)}
                disabled={isLocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  textAlign: 'left',
                  color: isCurrent ? 'var(--color-bone-white)' : isCompleted ? 'var(--color-bone-white)' : 'var(--color-smoke)',
                  borderLeft: isCurrent ? '2px solid var(--color-mojo-red)' : '2px solid transparent',
                  background: isCurrent ? 'var(--color-gunmetal)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                {isCompleted ? (
                  <IconCircleCheck size={14} style={{ color: 'var(--color-brass)', flexShrink: 0 }} />
                ) : (
                  <span className="type-mono-detail" style={{ color: isCurrent ? 'var(--color-mojo-red)' : 'inherit', width: 14, flexShrink: 0 }}>
                    {String(stepNum).padStart(2, '0')}
                  </span>
                )}
                <span className="type-label">{s.title.toUpperCase()}</span>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />
          <Link
            href={`/projects/${project.id}`}
            style={{
              padding: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-smoke)',
            }}
            className="type-label"
          >
            <IconArrowLeft size={12} /> EXIT TO PROJECT
          </Link>
        </nav>

        {/* Center: canvas */}
        <section className="workflow-canvas scroll-y" style={{ padding: 'clamp(24px, 4vw, 48px)', position: 'relative' }}>
          {currentStep && (
            <div style={{ maxWidth: 720 }}>
              <h1 className="type-editorial-headline" style={{ marginBottom: 6 }}>{currentStep.title}</h1>
              <div className="type-label text-dust" style={{ marginBottom: 'var(--space-6)' }}>
                {currentStep.subtitle.toUpperCase()}
              </div>

              <StepIntro workflowSlug={run.workflowSlug} stepIndex={run.currentStep} project={project} />

              <StepInputForm
                workflowSlug={run.workflowSlug}
                stepIndex={run.currentStep}
                priorState={run.state}
                project={project}
                input={stepInput}
                onChange={setStepInput}
              />

              {/* Status / action row */}
              <div style={{ minHeight: 120, marginTop: 'var(--space-6)' }}>
                {isProcessing ? (
                  <ProcessingStatus status={run.status} message={run.lastStreamMessage} />
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {run.currentStep > 1 && (
                      <Button variant="outlined" onClick={() => jumpTo(run.currentStep - 1)}>
                        <IconArrowLeft size={14} /> BACK
                      </Button>
                    )}
                    {canGenerate && !currentArtifact && (
                      <Button variant="filled" tone="primary" loading={running} onClick={() => runStep()}>
                        <IconPlayerPlay size={14} /> GENERATE
                      </Button>
                    )}
                    {canGenerate && currentArtifact && (
                      <>
                        <Button variant="outlined" onClick={() => runStep(true)} loading={running}>
                          <IconRefresh size={14} /> REGENERATE
                        </Button>
                        {run.currentStep < run.totalSteps ? (
                          <Button variant="filled" tone="primary" onClick={advance}>
                            CONTINUE <IconChevronRight size={14} />
                          </Button>
                        ) : (
                          <Button variant="filled" tone="primary" onClick={advance}>
                            COMPLETE
                          </Button>
                        )}
                      </>
                    )}
                    {run.status === 'complete' && (
                      <div className="type-ui-body text-dust">Workflow complete. Nice work.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right: artifact panel on Paper */}
        <aside className="artifact-panel surface-paper" style={{ borderLeft: '1px solid var(--color-graphite)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ArtifactPanel
            artifact={currentArtifact}
            artifactTitle={currentStep?.artifactTitle ?? 'Artifact'}
            isProcessing={isProcessing}
          />
        </aside>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .workflow-grid { grid-template-columns: 160px 1fr !important; }
          .artifact-panel { display: none !important; }
        }
        @media (max-width: 768px) {
          .workflow-grid { grid-template-columns: 1fr !important; }
          .step-rail { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function StepIntro({ workflowSlug, stepIndex, project }: { workflowSlug: string; stepIndex: number; project: Project }) {
  // Static intro text per step. Kept in frontend to avoid round-trips and provide instant context.
  const text = getStepIntroText(workflowSlug, stepIndex);
  if (!text) return null;
  return (
    <div className="type-prose" style={{ marginBottom: 'var(--space-6)', maxWidth: '62ch' }}>
      {text.split('\n\n').map((p, i) => (
        <p key={i} style={{ marginBottom: 'var(--space-4)' }}>{p}</p>
      ))}
    </div>
  );
}

function StepInputForm({
  workflowSlug,
  stepIndex,
  priorState,
  project,
  input,
  onChange,
}: {
  workflowSlug: string;
  stepIndex: number;
  priorState: Record<string, unknown>;
  project: Project;
  input: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  // Step 1 of either workflow: free-text niche description
  if (stepIndex === 1) {
    const existing = (priorState['step1'] as { nicheText?: string; nicheStatement?: string } | undefined);
    const initialValue = (input.nicheText as string) ?? existing?.nicheText ?? existing?.nicheStatement ?? project.niche ?? '';
    return (
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label className="type-label text-dust" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          WHO DO YOU WANT TO WORK WITH?
        </label>
        <textarea
          value={initialValue}
          onChange={(e) => onChange({ ...input, nicheText: e.target.value })}
          placeholder="I help [specific people] with [specific problem]..."
          rows={4}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            background: 'var(--color-gunmetal)',
            border: '1px solid var(--color-graphite)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-bone-white)',
            fontSize: 15,
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-ui)',
          }}
        />
      </div>
    );
  }

  if (stepIndex === 6 && workflowSlug === 'coffee-dates-giving-funnel') {
    return (
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label className="type-label text-dust" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          PASTE THEIR LATEST REPLY OR YOUR UPDATE
        </label>
        <textarea
          value={(input.latestUpdate as string) ?? ''}
          onChange={(e) => onChange({ ...input, latestUpdate: e.target.value })}
          placeholder="Their reply, or what happened on the last call..."
          rows={5}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            background: 'var(--color-gunmetal)',
            border: '1px solid var(--color-graphite)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-bone-white)',
            fontSize: 15,
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-ui)',
          }}
        />
      </div>
    );
  }

  // Other steps don't need extra user input — Mr. A runs on the prior state
  return null;
}

function ProcessingStatus({ status, message }: { status: string; message?: string }) {
  const label =
    status === 'generating'
      ? 'GENERATING'
      : status === 'reviewing'
        ? 'REVIEWING'
        : status === 'revising'
          ? 'REFINING'
          : 'PROCESSING';
  return (
    <div
      style={{
        padding: 'var(--space-4)',
        background: 'var(--color-ironwood)',
        border: '1px solid var(--color-graphite)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="thinking-dots"><span /><span /><span /></div>
        <span className="type-label" style={{ color: 'var(--color-mojo-red)' }}>
          {label}
        </span>
      </div>
      {message && (
        <div className="type-ui-body text-dust" style={{ marginTop: 8 }}>
          {message}
        </div>
      )}
    </div>
  );
}

function ArtifactPanel({ artifact, artifactTitle, isProcessing }: { artifact: Artifact | undefined; artifactTitle: string; isProcessing: boolean }) {
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyText = editedBody ?? artifact?.body ?? '';

  useEffect(() => {
    setEditedBody(null);
  }, [artifact?.id]);

  const save = async () => {
    if (!artifact || editedBody === null) return;
    setSaving(true);
    try {
      await api.saveArtifactDraft({ id: artifact.id, body: editedBody });
      setEditedBody(null);
      useSession.getState().showToast('success', 'Saved.');
    } catch (err) {
      useSession.getState().showToast('error', 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(artifact?.body ?? '').catch(() => {});
    useSession.getState().showToast('info', 'Copied.');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-newsprint)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <div>
            <div className="type-label" style={{ color: 'var(--color-coal)', opacity: 0.6 }}>
              YOUR {artifactTitle.toUpperCase()}
            </div>
            {artifact && (
              <div className="type-mono-detail" style={{ color: 'var(--color-coal)', opacity: 0.5, marginTop: 4 }}>
                V{artifact.version} · UPDATED {timeAgo(artifact.updated_at).toUpperCase()}
              </div>
            )}
          </div>
          {artifact && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="ghost" tone="paper" size="small" onClick={copy}>
                <IconCopy size={12} /> COPY
              </Button>
            </div>
          )}
        </div>

        {/* Flagged concerns */}
        {artifact?.reviewVerdict === 'surface_issues' && artifact.reviewIssues && artifact.reviewIssues.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(194, 88, 42, 0.12)', border: '1px solid rgba(194, 88, 42, 0.3)', borderRadius: 'var(--radius-sm)' }}>
            <div className="type-label" style={{ color: 'var(--color-rust)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <IconAlertTriangle size={12} /> MR. A FLAGGED {artifact.reviewIssues.length} {artifact.reviewIssues.length === 1 ? 'CONCERN' : 'CONCERNS'}
            </div>
            <ul className="type-prose" style={{ color: 'var(--color-coal)', fontSize: 14, paddingLeft: 18, lineHeight: 1.5 }}>
              {artifact.reviewIssues.map((issue, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {issue}
                  {artifact.reviewSuggestions?.[i] && (
                    <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic', opacity: 0.7 }}>
                      → {artifact.reviewSuggestions[i]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="scroll-y" style={{ flex: 1, padding: 'var(--space-6)' }}>
        {isProcessing && !artifact ? (
          <SkeletonArtifact />
        ) : artifact ? (
          <ArtifactBody artifact={artifact} bodyText={bodyText} onChange={setEditedBody} />
        ) : (
          <div className="type-prose" style={{ color: 'var(--color-coal)', opacity: 0.5 }}>
            <p>No artifact yet. Fill in the form on the left and hit Generate — Mr. A will draft it here on Paper.</p>
          </div>
        )}
      </div>

      {/* Footer: Save bar when edited */}
      {editedBody !== null && artifact && (
        <footer style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-newsprint)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" tone="paper" onClick={() => setEditedBody(null)}>
            Cancel
          </Button>
          <Button variant="filled" tone="paper" loading={saving} onClick={save}>
            Save draft
          </Button>
        </footer>
      )}
    </div>
  );
}

function ArtifactBody({ artifact, bodyText, onChange }: { artifact: Artifact; bodyText: string; onChange: (v: string) => void }) {
  // If the body is JSON-formatted (from workflow generation), render it as structured sections.
  // Otherwise render markdown-ish.
  if (artifact.bodyFormat === 'json') {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      // Fall back to plain textarea
      return (
        <textarea
          value={bodyText}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: 300,
            padding: 'var(--space-3)',
            background: 'transparent',
            border: '1px solid var(--color-newsprint)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-coal)',
            fontSize: 15,
            fontFamily: 'var(--font-editorial)',
            lineHeight: 1.55,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      );
    }
    return <StructuredArtifactView data={parsed} />;
  }
  return (
    <textarea
      value={bodyText}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        minHeight: 300,
        padding: 'var(--space-3)',
        background: 'transparent',
        border: 'none',
        color: 'var(--color-coal)',
        fontSize: 16,
        fontFamily: 'var(--font-editorial)',
        lineHeight: 1.55,
        resize: 'none',
        outline: 'none',
      }}
    />
  );
}

function StructuredArtifactView({ data }: { data: Record<string, unknown> }) {
  // Render each top-level field with a label + value. Arrays become lists. Nested objects become cards.
  const entries = Object.entries(data).filter(([k]) => k !== 'citedSourceIds' && k !== 'flaggedConcerns');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="type-label" style={{ color: 'var(--color-coal)', opacity: 0.55, marginBottom: 6 }}>
            {humanizeKey(key).toUpperCase()}
          </div>
          <ArtifactFieldValue value={value} />
        </div>
      ))}
    </div>
  );
}

function ArtifactFieldValue({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    return (
      <div className="type-prose" style={{ color: 'var(--color-coal)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {value}
      </div>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') {
      return (
        <ul className="type-prose" style={{ color: 'var(--color-coal)', paddingLeft: 18, lineHeight: 1.55 }}>
          {(value as string[]).map((v, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{v}</li>
          ))}
        </ul>
      );
    }
    // Array of objects
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(value as Record<string, unknown>[]).map((item, i) => (
          <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--color-newsprint)', borderRadius: 'var(--radius-sm)' }}>
            {Object.entries(item).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 4 }}>
                <span className="type-label" style={{ color: 'var(--color-coal)', opacity: 0.6, marginRight: 6 }}>
                  {humanizeKey(k).toUpperCase()}
                </span>
                <span className="type-ui-body" style={{ color: 'var(--color-coal)' }}>
                  {typeof v === 'string' ? v : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <div style={{ padding: 'var(--space-3)', background: 'var(--color-newsprint)', borderRadius: 'var(--radius-sm)' }}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 6 }}>
            <div className="type-label" style={{ color: 'var(--color-coal)', opacity: 0.6 }}>
              {humanizeKey(k).toUpperCase()}
            </div>
            <div className="type-ui-body" style={{ color: 'var(--color-coal)', whiteSpace: 'pre-wrap' }}>
              {typeof v === 'string' ? v : JSON.stringify(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function SkeletonArtifact() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[180, 340, 300, 260, 220, 380].map((w, i) => (
        <div
          key={i}
          className="skeleton-block"
          style={{
            width: `${w / 4}%`,
            maxWidth: w,
            height: 12,
            background: 'rgba(26, 24, 21, 0.12)',
          }}
        />
      ))}
    </div>
  );
}

function humanizeKey(k: string) {
  return k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function statusLabel(s: string) {
  switch (s) {
    case 'draft': return 'IN PROGRESS';
    case 'generating': return 'GENERATING';
    case 'reviewing': return 'REVIEWING';
    case 'revising': return 'REFINING';
    case 'ready': return 'READY';
    case 'flagged': return 'FLAGGED';
    case 'complete': return 'COMPLETE';
    default: return s.toUpperCase();
  }
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStepIntroText(workflowSlug: string, stepIndex: number): string {
  const key = `${workflowSlug}:${stepIndex}`;
  return STEP_INTROS[key] ?? '';
}

// Step intro coaching text, kept client-side so it renders instantly while the generator runs.
// Per the grounding rule, these are framing / coaching text that doesn't make substantive claims —
// they tee up what the student is about to work on without citing specific sources.
const STEP_INTROS: Record<string, string> = {
  'validate-niche:1':
    "Travis's first rule: your niche can't be 'people.' It has to be specific enough that you can point at real companies, real offers, and real cashflow already moving in that market.\n\nTell Mr. A who you want to work with. Be as specific as you can — Mr. A will push you to sharpen it until you've got a niche where your prospect list is findable.",
  'coffee-dates-giving-funnel:1':
    "The niche is the foundation. If this is fuzzy, everything downstream gets fuzzy too.\n\nTell Mr. A who you want to work with. Be as specific as you can, and expect pushback if it's still too broad.",
  'coffee-dates-giving-funnel:2':
    "Now let's find real partners. Mr. A will search the web for companies that match your niche AND fit Travis's 'training wheels partner' criteria: 7-8 figure businesses, 3+ products, visible customer list, identifiable decision-maker.\n\nClick Generate and Mr. A will pull 10-15 candidates.",
  'coffee-dates-giving-funnel:3':
    "Your attraction video is what pulls T2 respondents into your Skool group. Travis's rule: give one specific thing away. Not a generic overview — one specific, useful thing your niche needs.\n\nMr. A will draft an outline tailored to your niche.",
  'coffee-dates-giving-funnel:4':
    "The Skool group is where hand-raisers land. It's a conversation, not a funnel. Your welcome post asks the one question, and their answers become your marketing.\n\nMr. A will draft the group name, description, welcome post, and a two-week content plan.",
  'coffee-dates-giving-funnel:5':
    "Time to write the outreach. T1 is the hand-raiser (short, one ask, no link). T2 is the one question. T3 is the offer, written after T2 responses tell you what to write.\n\nMr. A will draft all three tailored to your niche, plus a send plan.",
  'coffee-dates-giving-funnel:6':
    "This step is a running workspace, not a one-shot. Every time a partner replies, paste it in and Mr. A will help you hear the signal and draft the next message.\n\nIf this is your first update, paste what you've sent and received so far. If you're coming back to add a new reply, paste just the new one.",
};
