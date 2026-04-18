import { useEffect, useState } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import {
  IconArrowLeft,
  IconMessageCircle,
  IconArchive,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { api } from '../api';
import type { Project, WorkflowRun, Artifact, Conversation, WorkflowCatalogItem } from '../api';
import { Button } from '../components/Button';
import { useSession } from '../store';

const TABS = ['OVERVIEW', 'WORKFLOWS', 'CHAT', 'ARTIFACTS'] as const;
type Tab = (typeof TABS)[number];

// Project detail page. Loads full project data in one payload and renders 4 tabs.
export function ProjectPage() {
  const [, params] = useRoute<{ projectId: string }>('/projects/:projectId');
  const [, navigate] = useLocation();
  const user = useSession((s) => s.user);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [project, setProject] = useState<Project | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [workflowCatalog, setWorkflowCatalog] = useState<WorkflowCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const projectId = params?.projectId;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    Promise.all([api.getProject({ projectId }), api.listWorkflows()])
      .then(([projData, wfData]) => {
        if (cancelled) return;
        setProject(projData.project);
        setWorkflowRuns(projData.workflowRuns);
        setArtifacts(projData.artifacts);
        setConversations(projData.conversations);
        setWorkflowCatalog(wfData.workflows);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
        <div className="skeleton-block" style={{ width: 120, height: 12, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ width: 420, height: 32, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ width: 520, height: 14 }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: 48 }}>
        <div className="type-editorial-headline">Project not found.</div>
        <div style={{ marginTop: 16 }}>
          <Button variant="outlined" onClick={() => navigate('/')}>BACK TO PROJECTS</Button>
        </div>
      </div>
    );
  }

  const saveProjectMeta = async (patch: Partial<Pick<Project, 'name' | 'partnerName' | 'niche'>>) => {
    try {
      const res = await api.updateProject({ projectId: project.id, ...patch });
      setProject(res.project);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = async () => {
    // navigate to chat with project scope; thread is created lazily when first message is sent
    navigate(`/chat/project/${project.id}`);
  };

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 'clamp(24px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/" className="type-label text-dust" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-4)', color: 'var(--color-dust)' }}>
          <IconArrowLeft size={12} /> PROJECTS
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {isEditing ? (
              <input
                defaultValue={project.name}
                autoFocus
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== project.name) saveProjectMeta({ name: val });
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    e.currentTarget.value = project.name;
                    setIsEditing(false);
                  }
                }}
                className="type-editorial-headline"
                style={{
                  background: 'var(--color-ironwood)',
                  border: '1px solid var(--color-graphite)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-bone-white)',
                  outline: 'none',
                  width: '100%',
                  maxWidth: 640,
                }}
              />
            ) : (
              <h1 className="type-editorial-headline" onClick={() => setIsEditing(true)} style={{ cursor: 'text' }}>
                {project.name}
              </h1>
            )}
            <div className="type-label text-dust" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>CREATED {timeAgo(project.created_at).toUpperCase()}</span>
              {project.partnerName && (
                <>
                  <span style={{ color: 'var(--color-smoke)' }}>·</span>
                  <span>PARTNER: {project.partnerName.toUpperCase()}</span>
                </>
              )}
              {project.niche && (
                <>
                  <span style={{ color: 'var(--color-smoke)' }}>·</span>
                  <span style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    NICHE: {project.niche.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {project.status === 'active' && (
              <Button
                variant="outlined"
                onClick={() => saveProjectMeta({ status: 'archived' } as any)}
              >
                <IconArchive size={14} /> ARCHIVE
              </Button>
            )}
            <Button variant="outlined" tone="primary" onClick={startNewChat}>
              <IconMessageCircle size={14} /> NEW THREAD
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            borderBottom: '1px solid var(--color-graphite)',
            marginBottom: 'var(--space-8)',
          }}
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
              className="type-label"
              style={{
                padding: '12px 0',
                color: tab === t ? 'var(--color-bone-white)' : 'var(--color-dust)',
                borderBottom: tab === t ? '2px solid var(--color-mojo-red)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all var(--transition-fast)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'OVERVIEW' && (
          <OverviewTab
            project={project}
            runs={workflowRuns}
            artifacts={artifacts}
            conversations={conversations}
            workflowCatalog={workflowCatalog}
          />
        )}
        {tab === 'WORKFLOWS' && (
          <WorkflowsTab project={project} runs={workflowRuns} catalog={workflowCatalog} />
        )}
        {tab === 'CHAT' && <ChatTab project={project} conversations={conversations} />}
        {tab === 'ARTIFACTS' && <ArtifactsTab artifacts={artifacts} project={project} />}
      </div>
    </div>
  );
}

function OverviewTab({
  project,
  runs,
  artifacts,
  conversations,
  workflowCatalog,
}: {
  project: Project;
  runs: WorkflowRun[];
  artifacts: Artifact[];
  conversations: Conversation[];
  workflowCatalog: WorkflowCatalogItem[];
}) {
  const [, navigate] = useLocation();
  const activeRun = runs.find((r) => r.status !== 'complete');
  const [starting, setStarting] = useState(false);

  const startCoffeeDates = async () => {
    setStarting(true);
    try {
      const { run } = await api.startWorkflow({
        projectId: project.id,
        workflowSlug: 'coffee-dates-giving-funnel',
      });
      navigate(`/workflows/${run.id}`);
    } catch (err) {
      console.error(err);
      useSession.getState().showToast('error', err instanceof Error ? err.message : 'Could not start');
    } finally {
      setStarting(false);
    }
  };

  const startNiche = async () => {
    setStarting(true);
    try {
      const { run } = await api.startWorkflow({
        projectId: project.id,
        workflowSlug: 'validate-niche',
      });
      navigate(`/workflows/${run.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const isFree = !useSession.getState().user?.roles.includes('student') && !useSession.getState().user?.roles.includes('admin');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-8)' }} className="overview-grid">
      <div>
        <div className="type-label text-dust" style={{ marginBottom: 'var(--space-4)' }}>
          CURRENT WORK
        </div>
        {activeRun ? (
          <div
            onClick={() => navigate(`/workflows/${activeRun.id}`)}
            style={{
              padding: 'var(--space-6)',
              background: 'var(--color-ironwood)',
              border: '1px solid var(--color-graphite)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-mojo-red)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-graphite)')}
          >
            <div className="type-editorial-subhead">
              {activeRun.workflowSlug === 'coffee-dates-giving-funnel' ? 'Coffee Dates + Giving Funnel' : 'Validate Your Niche'}
            </div>
            <div className="type-mono-detail text-dust" style={{ marginTop: 8 }}>
              STEP {activeRun.currentStep} OF {activeRun.totalSteps} · {statusLabel(activeRun.status)}
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button variant="outlined" tone="primary">
                <IconPlayerPlay size={14} /> RESUME
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="type-editorial-subhead" style={{ marginBottom: 4 }}>
              Pick a play.
            </div>
            <p className="type-ui-body text-dust" style={{ marginBottom: 'var(--space-5)' }}>
              {isFree
                ? 'Validate your niche so you know exactly who you\'re going after.'
                : 'Most students start with Validate Niche to get sharp, then run Coffee Dates for outreach. You can skip straight to Coffee Dates if your niche is already locked.'}
            </p>

            {/* Validate Niche — the short prerequisite. Recommended starting point. */}
            <WorkflowStartCard
              order="01"
              recommended
              title="Validate Your Niche"
              stepLabel="1 STEP · 5-10 MIN"
              blurb="Stress-test your niche against Travis's 8 criteria. You'll walk away with a niche memo — the foundation every other play is built on."
              ctaLabel="BEGIN"
              onStart={startNiche}
              starting={starting}
              primary
            />

            {!isFree && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <WorkflowStartCard
                  order="02"
                  title="Coffee Dates + Giving Funnel"
                  stepLabel="6 STEPS · FULL CAMPAIGN"
                  blurb="The end-to-end outreach play. Research partners, write the T1, run coffee dates, work the giving funnel, close the yes."
                  ctaLabel="BEGIN"
                  onStart={startCoffeeDates}
                  starting={starting}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="type-label text-dust" style={{ marginBottom: 'var(--space-4)' }}>
          ARTIFACTS
        </div>
        {artifacts.length === 0 ? (
          <div className="type-caption text-smoke">No artifacts yet. Workflow steps will produce them.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {artifacts.slice(0, 5).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/workflows/${a.workflowRunId}`)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--color-graphite)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
                  {a.title}
                </div>
                <div className="type-mono-detail text-dust">
                  {(a.type || '').toUpperCase()} · V{a.version} · {timeAgo(a.updated_at).toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="type-label text-dust" style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
          THREADS
        </div>
        {conversations.length === 0 ? (
          <div className="type-caption text-smoke">No threads yet. Open chat to start one.</div>
        ) : (
          <div>
            {conversations.slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/chat/project/${project.id}/${c.id}`)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--color-graphite)',
                  display: 'block',
                  width: '100%',
                }}
              >
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
                  {c.title}
                </div>
                {c.lastMessagePreview && (
                  <div className="type-caption text-dust" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessagePreview}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .overview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function WorkflowsTab({
  project,
  runs,
  catalog,
}: {
  project: Project;
  runs: WorkflowRun[];
  catalog: WorkflowCatalogItem[];
}) {
  const [, navigate] = useLocation();

  return (
    <div>
      {catalog.map((w) => {
        const existing = runs.find((r) => r.workflowSlug === w.slug);
        return (
          <div
            key={w.slug}
            style={{
              padding: 'var(--space-6) 0',
              borderBottom: '1px solid var(--color-graphite)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200, maxWidth: 640 }}>
              <div className="type-editorial-subhead">{w.name}</div>
              <div className="type-ui-body text-dust" style={{ marginTop: 6 }}>
                {w.description}
              </div>
              <div className="type-mono-detail text-dust" style={{ marginTop: 8 }}>
                {w.totalSteps} {w.totalSteps === 1 ? 'STEP' : 'STEPS'}
                {w.accentLabel && (
                  <span style={{ marginLeft: 8, color: w.unlocked ? 'var(--color-brass)' : 'var(--color-smoke)' }}>
                    · {w.accentLabel}
                  </span>
                )}
              </div>
            </div>
            {w.unlocked ? (
              existing ? (
                <Button variant="outlined" tone="primary" onClick={() => navigate(`/workflows/${existing.id}`)}>
                  <IconPlayerPlay size={14} /> {existing.status === 'complete' ? 'REVIEW' : 'RESUME'}
                </Button>
              ) : (
                <StartWorkflowButton projectId={project.id} workflowSlug={w.slug} />
              )
            ) : (
              <Button variant="ghost" disabled>
                PAID ACCESS
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StartWorkflowButton({ projectId, workflowSlug }: { projectId: string; workflowSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  return (
    <Button
      variant="filled"
      tone="primary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const { run } = await api.startWorkflow({ projectId, workflowSlug });
          navigate(`/workflows/${run.id}`);
        } catch (err) {
          console.error(err);
          useSession.getState().showToast('error', err instanceof Error ? err.message : 'Could not start');
          setLoading(false);
        }
      }}
    >
      <IconPlayerPlay size={14} /> START
    </Button>
  );
}

function ChatTab({ project, conversations }: { project: Project; conversations: Conversation[] }) {
  const [, navigate] = useLocation();
  if (conversations.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8) 0' }}>
        <div className="type-editorial-subhead" style={{ marginBottom: 8 }}>No threads in this project yet.</div>
        <p className="type-ui-body text-dust" style={{ marginBottom: 'var(--space-4)' }}>
          Start a conversation scoped to this project — Mr. A can see the artifacts and stay in context.
        </p>
        <Button variant="outlined" tone="primary" onClick={() => navigate(`/chat/project/${project.id}`)}>
          <IconMessageCircle size={14} /> OPEN CHAT
        </Button>
      </div>
    );
  }
  return (
    <div>
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/chat/project/${project.id}/${c.id}`)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: 'var(--space-4) 0',
            borderBottom: '1px solid var(--color-graphite)',
          }}
        >
          <div className="type-editorial-subhead" style={{ fontSize: 18 }}>{c.title}</div>
          {c.lastMessagePreview && (
            <div className="type-ui-body text-dust" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 800 }}>
              {c.lastMessagePreview}
            </div>
          )}
          <div className="type-mono-detail text-smoke" style={{ marginTop: 4 }}>
            {timeAgo(c.lastMessageAt ?? c.updated_at).toUpperCase()}
          </div>
        </button>
      ))}
    </div>
  );
}

function ArtifactsTab({ artifacts }: { artifacts: Artifact[]; project: Project }) {
  const [, navigate] = useLocation();
  if (artifacts.length === 0) {
    return <div className="type-ui-body text-dust">No artifacts yet.</div>;
  }
  const byType = artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    const k = a.type || 'custom';
    (acc[k] ??= []).push(a);
    return acc;
  }, {});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {Object.entries(byType).map(([type, items]) => (
        <div key={type}>
          <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>
            {type.replace(/_/g, ' ').toUpperCase()} ({items.length})
          </div>
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/workflows/${a.workflowRunId}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--color-graphite)',
                alignItems: 'center',
              }}
            >
              <div>
                <div className="type-ui-body" style={{ color: 'var(--color-bone-white)' }}>
                  {a.title}
                </div>
                <div className="type-mono-detail text-dust" style={{ marginTop: 2 }}>
                  V{a.version} · UPDATED {timeAgo(a.updated_at).toUpperCase()}
                </div>
              </div>
              {a.reviewVerdict === 'surface_issues' && (
                <span className="type-label" style={{ color: 'var(--color-rust)', padding: '4px 8px', background: 'rgba(194,88,42,0.1)', borderRadius: 2 }}>
                  CONCERNS FLAGGED
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case 'draft': return 'IN PROGRESS';
    case 'generating': return 'GENERATING...';
    case 'reviewing': return 'REVIEWING...';
    case 'revising': return 'REFINING...';
    case 'ready': return 'READY';
    case 'flagged': return 'CONCERNS FLAGGED';
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
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Workflow start card — editorial, numbered, with a clear "what you get" blurb.
// Used on the Overview tab when there's no active workflow yet.
function WorkflowStartCard({
  order,
  title,
  stepLabel,
  blurb,
  ctaLabel,
  onStart,
  starting,
  primary = false,
  recommended = false,
}: {
  order: string;
  title: string;
  stepLabel: string;
  blurb: string;
  ctaLabel: string;
  onStart: () => void;
  starting: boolean;
  primary?: boolean;
  recommended?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 'var(--space-4)',
        padding: 'var(--space-5) var(--space-6)',
        background: 'var(--color-ironwood)',
        border: primary ? '1px solid var(--color-mojo-red)' : '1px solid var(--color-graphite)',
        borderRadius: 'var(--radius-md)',
        position: 'relative',
      }}
    >
      {/* Numeric order in Tanker, tinted */}
      <div
        className="type-section-display"
        style={{
          color: primary ? 'var(--color-mojo-red)' : 'var(--color-smoke)',
          fontSize: 44,
          lineHeight: 1,
          opacity: primary ? 0.9 : 0.5,
          paddingTop: 2,
        }}
      >
        {order}
      </div>

      <div style={{ minWidth: 0 }}>
        {recommended && (
          <div
            className="type-mono-detail"
            style={{
              color: 'var(--color-mojo-red)',
              letterSpacing: '0.12em',
              marginBottom: 6,
            }}
          >
            RECOMMENDED · START HERE
          </div>
        )}

        <div className="type-editorial-subhead" style={{ marginBottom: 4 }}>
          {title}
        </div>

        <div className="type-mono-detail text-dust" style={{ marginBottom: 'var(--space-3)' }}>
          {stepLabel}
        </div>

        <p className="type-ui-body text-dust" style={{ marginBottom: 'var(--space-4)', maxWidth: '60ch' }}>
          {blurb}
        </p>

        <Button
          variant={primary ? 'filled' : 'outlined'}
          tone="primary"
          loading={starting}
          onClick={onStart}
        >
          <IconPlayerPlay size={14} /> {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
