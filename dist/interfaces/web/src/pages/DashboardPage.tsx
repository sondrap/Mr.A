import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { IconPlus, IconArrowRight } from '@tabler/icons-react';
import { api } from '../api';
import type { ProjectSummary, ActivityItem } from '../api';
import { useSession } from '../store';
import { Button } from '../components/Button';

// Project dashboard — the default landing page after login.
// Editorial table layout. No card grid. Each project is a row.
// Loads all data in a single batch payload (getDashboard).
export function DashboardPage() {
  const user = useSession((s) => s.user);
  const [, navigate] = useLocation();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getDashboard()
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects);
        setActivity(data.recentActivity);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createProject = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { project } = await api.createProject({ name });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      useSession.getState().showToast('error', 'Could not create project. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const greeting = timeGreeting();
  const firstName = user?.displayName?.split(/\s+/)[0] ?? 'friend';
  const countLabel = String(projects.length).padStart(2, '0');

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 'clamp(24px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-12)',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <h1 className="type-section-display" style={{ maxWidth: '100%', lineHeight: 1.05 }}>
            {greeting}, {firstName}.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexShrink: 0 }}>
            <div className="type-mono-detail text-dust" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="type-hero-display" style={{ color: 'var(--color-bone-white)', fontSize: 32, lineHeight: 1 }}>
                {countLabel}
              </span>
              <span>{projects.length === 1 ? 'PROJECT' : 'PROJECTS'}</span>
            </div>
            <Button variant="outlined" tone="primary" onClick={() => setShowNewDialog(true)}>
              <IconPlus size={14} /> NEW PROJECT
            </Button>
          </div>
        </div>

        {/* Projects list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 'var(--space-6) 0',
                  borderBottom: '1px solid var(--color-graphite)',
                }}
              >
                <div className="skeleton-block" style={{ width: 260, height: 24 }} />
                <div className="skeleton-block" style={{ width: 380, height: 12 }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onStart={() => setShowNewDialog(true)} />
        ) : (
          <div>
            {projects.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        )}

        {/* Recent activity */}
        {activity.length > 0 && (
          <div style={{ marginTop: 'var(--space-16)' }}>
            <div className="type-label text-dust" style={{ marginBottom: 'var(--space-4)' }}>
              RECENT ACTIVITY
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                overflowX: 'auto',
                paddingBottom: 'var(--space-3)',
              }}
              className="scroll-y"
            >
              {activity.map((item) => (
                <ActivityTile key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New project dialog */}
      {showNewDialog && (
        <div
          onClick={() => setShowNewDialog(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-ironwood)',
              border: '1px solid var(--color-graphite)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              maxWidth: 420,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div className="type-editorial-headline">New project</div>
            <div className="type-ui-body text-dust">
              A project is a campaign or partner you're working on. Start with whatever name makes sense — you can rename later.
            </div>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
                if (e.key === 'Escape') setShowNewDialog(false);
              }}
              placeholder="e.g. Justin @ BraveMinds"
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button variant="filled" tone="primary" loading={creating} onClick={createProject}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  const metadata = [
    project.threadCount > 0 ? `${String(project.threadCount).padStart(2, '0')} ${project.threadCount === 1 ? 'THREAD' : 'THREADS'}` : null,
    project.workflowCount > 0 ? `${project.workflowCount} ${project.workflowCount === 1 ? 'WORKFLOW' : 'WORKFLOWS'}` : null,
    project.artifactCount > 0 ? `${project.artifactCount} ${project.artifactCount === 1 ? 'ARTIFACT' : 'ARTIFACTS'}` : null,
    `UPDATED ${timeAgo(project.lastActivityAt)}`,
  ].filter(Boolean);

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 'var(--space-6) var(--space-4)',
        background: hovered ? 'var(--color-ironwood)' : 'transparent',
        borderBottom: '1px solid var(--color-graphite)',
        transition: 'background var(--transition-fast)',
      }}
    >
      <div className="type-editorial-subhead">{project.name}</div>
      <div
        className="type-label text-dust"
        style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {metadata.map((m, i) => (
          <span key={i}>
            {m}
            {i < metadata.length - 1 && <span style={{ marginLeft: 8, color: 'var(--color-smoke)' }}>·</span>}
          </span>
        ))}
      </div>
    </button>
  );
}

function ActivityTile({ item }: { item: ActivityItem }) {
  const [, navigate] = useLocation();
  const target =
    item.kind === 'thread'
      ? item.projectId
        ? `/chat/project/${item.projectId}/${item.id}`
        : `/chat/${item.id}`
      : item.kind === 'workflow'
        ? `/workflows/${item.id}`
        : `/projects/${item.projectId}`;

  const kindLabel = item.kind === 'thread' ? 'THREAD' : item.kind === 'workflow' ? 'WORKFLOW' : 'ARTIFACT';

  return (
    <button
      onClick={() => navigate(target)}
      style={{
        flex: '0 0 280px',
        textAlign: 'left',
        padding: 'var(--space-4)',
        background: 'var(--color-ironwood)',
        border: '1px solid var(--color-graphite)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        transition: 'all var(--transition-fast)',
        minHeight: 120,
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-mojo-red)')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-graphite)')}
    >
      <div className="type-label text-dust">{kindLabel}</div>
      <div className="type-ui-body" style={{ color: 'var(--color-bone-white)', fontWeight: 500 }}>
        {item.title}
      </div>
      {item.subtitle && (
        <div className="type-caption text-smoke" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.subtitle}
        </div>
      )}
      <div style={{ flex: 1 }} />
      <div className="type-mono-detail text-smoke">{timeAgo(item.updatedAt)}</div>
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        padding: 'clamp(40px, 8vw, 80px) 0',
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        {/* Simple envelope line illustration, inline SVG */}
        <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="4" y="10" width="72" height="44" stroke="var(--color-bone-white)" strokeWidth="1.5" />
          <path d="M4 10L40 36L76 10" stroke="var(--color-bone-white)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="type-editorial-headline">No projects yet.</h2>
      <p className="type-prose text-dust" style={{ marginBottom: 'var(--space-4)' }}>
        Start with one. Pick a partner you've been meaning to reach out to and go.
      </p>
      <div>
        <Button variant="filled" tone="primary" size="large" onClick={onStart}>
          <IconPlus size={16} /> START YOUR FIRST PROJECT
        </Button>
      </div>
    </div>
  );
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
