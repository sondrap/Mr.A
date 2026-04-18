import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { IconPlus, IconX, IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { api } from '../api';
import { Button } from '../components/Button';
import { useSession } from '../store';

const TABS = ['USERS', 'CONTENT', 'ONTOLOGY', 'OVERVIEW'] as const;
type Tab = (typeof TABS)[number];

export function AdminPage() {
  const [, params] = useRoute<{ tab?: string }>('/admin/:tab?');
  const [, navigate] = useLocation();
  const tabParam = (params?.tab ?? '').toUpperCase() as Tab;
  const tab: Tab = TABS.includes(tabParam) ? tabParam : 'OVERVIEW';

  return (
    <div className="scroll-y" style={{ height: '100%', padding: 'clamp(24px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="type-section-display">Admin</h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-graphite)', marginBottom: 'var(--space-8)' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/admin/${t.toLowerCase()}`)}
              className="type-label"
              style={{
                padding: '12px 0',
                color: tab === t ? 'var(--color-bone-white)' : 'var(--color-dust)',
                borderBottom: tab === t ? '2px solid var(--color-mojo-red)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'OVERVIEW' && <OverviewTab />}
        {tab === 'USERS' && <UsersTab />}
        {tab === 'CONTENT' && <ContentTab />}
        {tab === 'ONTOLOGY' && <OntologyTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.getAdminStats>> | null>(null);
  useEffect(() => {
    api.getAdminStats().then(setStats).catch((err) => console.error(err));
  }, []);
  if (!stats) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-6)' }}>{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-block" style={{ height: 80 }} />)}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
        <StatCard label="APPROVED" value={stats.users.approved} />
        <StatCard label="ACTIVE · 7D" value={stats.users.activeLast7d} />
        <StatCard label="NEW · 24H" value={stats.users.newLast24h} />
        <StatCard label="TOTAL USERS" value={stats.users.total} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
        <StatCard label="SOURCES" value={stats.library.sources} muted />
        <StatCard label="CONCEPT LINKS" value={stats.library.conceptLinks} muted />
        <StatCard label="CONTEXTS" value={stats.library.contexts} muted />
        <StatCard label="KNOWLEDGE GAPS" value={stats.library.knowledgeGaps} tone={stats.library.knowledgeGaps > 0 ? 'warn' : 'neutral'} />
      </div>

      <div>
        <div className="type-label text-dust" style={{ marginBottom: 'var(--space-4)' }}>RECENT INGESTION</div>
        {stats.recentIngestionJobs.length === 0 ? (
          <div className="type-ui-body text-smoke">No ingestion jobs yet.</div>
        ) : (
          <div>
            {stats.recentIngestionJobs.map((j) => (
              <div key={j.id} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-graphite)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                <div>
                  <div className="type-mono-detail text-dust">{j.id.slice(0, 8).toUpperCase()}</div>
                  <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)', marginTop: 2 }}>
                    {j.totalFiles} {j.totalFiles === 1 ? 'FILE' : 'FILES'} · {j.totalChunks} CHUNKS
                  </div>
                </div>
                <div className="type-label" style={{ color: j.status === 'completed' ? 'var(--color-brass)' : j.status === 'failed' ? 'var(--color-rust)' : 'var(--color-dust)' }}>
                  {j.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, muted, tone }: { label: string; value: number; muted?: boolean; tone?: 'warn' | 'neutral' }) {
  return (
    <div style={{ padding: 'var(--space-4)', background: 'var(--color-ironwood)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)' }}>
      <div className="type-label" style={{ color: muted ? 'var(--color-smoke)' : 'var(--color-dust)' }}>{label}</div>
      <div className="type-hero-display" style={{ fontSize: 44, lineHeight: 1, marginTop: 8, color: tone === 'warn' && value > 0 ? 'var(--color-rust)' : 'var(--color-bone-white)' }}>
        {value}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<Awaited<ReturnType<typeof api.listUsers>>['users']>([]);
  const [search, setSearch] = useState('');
  const [showGrant, setShowGrant] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.listUsers({ searchEmail: search }).then((d) => setUsers(d.users));
  };
  useEffect(() => {
    load();
  }, [search]);

  const grant = async () => {
    if (!grantEmail.trim()) return;
    setSaving(true);
    try {
      await api.grantAccessAdmin({ email: grantEmail.trim(), note: grantNote.trim() || undefined });
      setShowGrant(false);
      setGrantEmail('');
      setGrantNote('');
      load();
      useSession.getState().showToast('success', 'Access granted.');
    } catch (err) {
      useSession.getState().showToast('error', err instanceof Error ? err.message : 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (email: string) => {
    if (!confirm(`Revoke access for ${email}?`)) return;
    try {
      await api.revokeAccessAdmin({ email, reason: 'Admin revocation' });
      load();
    } catch (err) {
      useSession.getState().showToast('error', err instanceof Error ? err.message : 'Failed.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by email..."
          style={{
            flex: 1,
            maxWidth: 360,
            padding: '10px 14px',
            background: 'var(--color-gunmetal)',
            border: '1px solid var(--color-graphite)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-bone-white)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <Button variant="filled" tone="primary" onClick={() => setShowGrant(true)}>
          <IconPlus size={14} /> GRANT ACCESS
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-graphite)' }}>
        {['EMAIL', 'PLAN', 'GRANTED BY', 'LAST ACTIVE', ''].map((h) => (
          <div key={h} className="type-label text-dust">{h}</div>
        ))}
      </div>
      {users.map((u) => (
        <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--space-4)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-graphite)', alignItems: 'center' }}>
          <div className="type-mono-detail" style={{ color: 'var(--color-bone-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.email}>{u.email}</div>
          <div>
            {u.roles.includes('admin') ? (
              <span className="type-label" style={{ padding: '2px 8px', background: 'var(--color-gunmetal)', color: 'var(--color-bone-white)', borderRadius: 2 }}>ADMIN</span>
            ) : u.roles.includes('student') && !u.grantRevoked ? (
              <span className="type-label" style={{ padding: '2px 8px', background: 'rgba(184,139,62,0.15)', color: 'var(--color-brass)', borderRadius: 2 }}>FULL</span>
            ) : (
              <span className="type-label" style={{ padding: '2px 8px', background: 'var(--color-gunmetal)', color: 'var(--color-smoke)', borderRadius: 2 }}>FREE</span>
            )}
          </div>
          <div className="type-caption text-dust" title={u.grantNote ?? ''}>
            {u.grantedBy === 'payment_system' ? 'PAYMENTS' : u.grantedBy === 'admin' ? 'ADMIN' : '—'}
          </div>
          <div className="type-caption text-dust">{timeAgo(u.lastActiveAt)}</div>
          <div>
            {u.roles.includes('student') && !u.grantRevoked && !u.roles.includes('admin') && (
              <Button variant="ghost" size="small" onClick={() => revoke(u.email)}>
                REVOKE
              </Button>
            )}
          </div>
        </div>
      ))}

      {showGrant && (
        <div onClick={() => setShowGrant(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--color-ironwood)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="type-editorial-headline">Grant access</div>
              <button onClick={() => setShowGrant(false)} style={{ color: 'var(--color-dust)' }} aria-label="Close"><IconX size={18} /></button>
            </div>
            <label className="type-label text-dust">EMAIL</label>
            <input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="user@example.com" style={{ padding: 10, background: 'var(--color-asphalt)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-sm)', color: 'var(--color-bone-white)', outline: 'none' }} />
            <label className="type-label text-dust" style={{ marginTop: 8 }}>NOTE (OPTIONAL)</label>
            <input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="Order #, team member, etc." style={{ padding: 10, background: 'var(--color-asphalt)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-sm)', color: 'var(--color-bone-white)', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setShowGrant(false)}>Cancel</Button>
              <Button variant="filled" tone="primary" loading={saving} onClick={grant}>Grant</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentTab() {
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof api.listIngestionJobs>>['jobs']>([]);
  const [gapData, setGapData] = useState<Awaited<ReturnType<typeof api.listKnowledgeGaps>> | null>(null);
  const [candidates, setCandidates] = useState<Awaited<ReturnType<typeof api.listCandidateConcepts>>['candidates']>([]);
  const [clustering, setClustering] = useState(false);

  const load = () => {
    api.listIngestionJobs().then((d) => setJobs(d.jobs)).catch(() => {});
    api.listKnowledgeGaps({ grouped: true }).then(setGapData).catch(() => {});
    api.listCandidateConcepts().then((d) => setCandidates(d.candidates)).catch(() => {});
  };
  useEffect(load, []);

  const runCluster = async () => {
    setClustering(true);
    try {
      await api.clusterKnowledgeGaps();
      load();
      useSession.getState().showToast('success', 'Clustered.');
    } catch {
      useSession.getState().showToast('error', 'Clustering failed.');
    } finally {
      setClustering(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>PROGRAMMATIC INGESTION</div>
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-ironwood)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-sm)' }}>
          <div className="type-mono-detail" style={{ color: 'var(--color-bone-white)', marginBottom: 8 }}>
            POST /_/api/ingest/source
          </div>
          <div className="type-ui-body-small text-dust">
            Post your ETL output with an admin API key. See the ETL handoff doc in the spec for the full contract.
          </div>
        </div>
      </div>

      <div>
        <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>INGESTION JOBS</div>
        {jobs.length === 0 ? (
          <div className="type-ui-body text-smoke">No jobs yet.</div>
        ) : (
          <div>
            {jobs.map((j) => (
              <div key={j.id} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-graphite)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div className="type-mono-detail text-dust">{j.id.slice(0, 8).toUpperCase()}</div>
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
                  {j.totalFiles} {j.totalFiles === 1 ? 'FILE' : 'FILES'}
                </div>
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
                  {j.processedChunks} / {j.totalChunks} CHUNKS
                </div>
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
                  {j.linkedChunks} LINKED
                </div>
                <div className="type-label" style={{ color: j.status === 'completed' ? 'var(--color-brass)' : j.status === 'failed' ? 'var(--color-rust)' : 'var(--color-dust)' }}>
                  {j.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div className="type-label text-dust">KNOWLEDGE GAPS</div>
          <Button variant="outlined" size="small" loading={clustering} onClick={runCluster}>
            <IconRefresh size={12} /> CLUSTER
          </Button>
        </div>
        {gapData?.clusters && gapData.clusters.length > 0 ? (
          <div>
            {gapData.clusters.map((cluster) => (
              <div key={cluster.tag} style={{ padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-graphite)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="type-editorial-subhead">{cluster.tag === '__unclustered__' ? 'Unclustered' : cluster.tag}</div>
                  <div className="type-mono-detail text-dust">{cluster.count} {cluster.count === 1 ? 'STUDENT' : 'STUDENTS'}</div>
                </div>
                <div className="type-ui-body text-dust" style={{ marginTop: 4, fontStyle: 'italic' }}>
                  "{cluster.sampleQuestion}"
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="type-ui-body text-smoke">No open gaps. Nice.</div>
        )}
      </div>

      {candidates.length > 0 && (
        <div>
          <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>CANDIDATE CONCEPTS · {candidates.length}</div>
          {candidates.map((c) => (
            <div key={c.id} style={{ padding: 'var(--space-4) 0', borderBottom: '1px solid var(--color-graphite)' }}>
              <div className="type-editorial-subhead">{c.suggestedName}</div>
              <div className="type-ui-body text-dust" style={{ marginTop: 4 }}>{c.suggestedDescription}</div>
              <div className="type-mono-detail text-smoke" style={{ marginTop: 6 }}>
                {c.suggestedSlug} · OBSERVED {c.timesObserved}x
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  variant="outlined"
                  tone="primary"
                  size="small"
                  onClick={async () => {
                    await api.promoteCandidateConcept({ candidateId: c.id });
                    load();
                  }}
                >
                  PROMOTE
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={async () => {
                    await api.dismissCandidateConcept({ candidateId: c.id });
                    load();
                  }}
                >
                  DISMISS
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OntologyTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.listOntology>> | null>(null);
  useEffect(() => {
    api.listOntology().then(setData).catch(() => {});
  }, []);
  if (!data) return <div className="type-ui-body text-smoke">Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <Section title={`NORTH STARS · ${data.northStars.length}`}>
        {data.northStars.map((n) => (
          <RowItem key={n.slug} slug={n.slug} name={n.name} description={n.description} />
        ))}
      </Section>
      <Section title={`CONCEPTS · ${data.concepts.length}`}>
        {data.concepts.map((c) => (
          <RowItem
            key={c.slug}
            slug={c.slug}
            name={c.name}
            description={c.description}
            incomplete={c.isIncomplete}
            meta={`${c.sourceCount} SOURCE LINKS`}
          />
        ))}
      </Section>
      <Section title={`SKILLS · ${data.skills.length}`}>
        {data.skills.map((s) => (
          <RowItem
            key={s.slug}
            slug={s.slug}
            name={s.name}
            description={s.description}
            incomplete={s.isIncomplete}
            meta={`${s.conceptSlugs.length} CONCEPTS`}
          />
        ))}
      </Section>
      <Section title={`CONTEXTS · ${data.contexts.length}`}>
        {data.contexts.map((c) => (
          <RowItem
            key={c.slug}
            slug={c.slug}
            name={c.name}
            description={c.description}
            meta={`${c.sourceCount} CHUNKS`}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="type-label text-dust" style={{ marginBottom: 'var(--space-3)' }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function RowItem({
  slug,
  name,
  description,
  incomplete,
  meta,
}: {
  slug: string;
  name: string;
  description: string;
  incomplete?: boolean;
  meta?: string;
}) {
  return (
    <div style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-graphite)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="type-ui-body" style={{ color: 'var(--color-bone-white)', fontWeight: 500 }}>{name}</div>
        <div className="type-mono-detail text-smoke">{slug}</div>
        {incomplete && (
          <span className="type-mono-detail" style={{ color: 'var(--color-rust)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconAlertTriangle size={11} /> INCOMPLETE
          </span>
        )}
        {meta && <span className="type-mono-detail text-dust" style={{ marginLeft: 'auto' }}>{meta}</span>}
      </div>
      {description && (
        <div className="type-ui-body-small text-dust" style={{ marginTop: 4, maxWidth: 720 }}>
          {description.length > 200 ? description.slice(0, 200) + '...' : description}
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
