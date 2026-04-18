import { auth, db } from '@mindstudio-ai/agent';
import { Users } from './tables/users';
import { Projects } from './tables/projects';
import { WorkflowRuns } from './tables/workflow_runs';
import { Artifacts } from './tables/artifacts';
import { Conversations } from './tables/conversations';

// Single-payload data loader for the project dashboard. Loads:
//   - the current user (with roles for conditional UI)
//   - all projects for the user (newest first)
//   - per-project compact metadata (thread count, workflow run count)
//   - recent activity across all projects (threads, artifacts, resume-able workflows)
//
// Batched into one round trip. No per-project spinners on the dashboard.
export async function getDashboard() {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const userId = auth.userId;

  const [user, projects, allRuns, allArtifacts, allConversations] = await db.batch(
    Users.get(userId),
    Projects.filter((p) => p.userId === userId && p.status === 'active').sortBy((p) => p.created_at).reverse(),
    WorkflowRuns.filter((r) => r.userId === userId).sortBy((r) => r.updated_at).reverse(),
    Artifacts.filter((a) => a.userId === userId && !a.archived).sortBy((a) => a.updated_at).reverse(),
    Conversations.filter((c) => c.userId === userId && !c.archived).sortBy((c) => c.updated_at).reverse()
  );

  // Per-project summaries — counts of runs / threads / artifacts / last activity
  const projectSummaries = projects.map((p) => {
    const runs = allRuns.filter((r) => r.projectId === p.id);
    const threads = allConversations.filter((c) => c.projectId === p.id);
    const arts = allArtifacts.filter((a) => a.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      partnerName: p.partnerName,
      niche: p.niche,
      status: p.status,
      createdAt: p.created_at,
      lastActivityAt: p.lastActivityAt ?? p.updated_at,
      threadCount: threads.length,
      workflowCount: runs.length,
      artifactCount: arts.length,
      activeWorkflowSlug: runs.find((r) => r.status !== 'complete')?.workflowSlug ?? null,
    };
  });

  // Recent activity: last 10 items across threads/artifacts/workflow-runs
  const activityItems: Array<{
    kind: 'thread' | 'artifact' | 'workflow';
    id: string;
    title: string;
    projectId: string | null;
    projectName: string | null;
    updatedAt: number;
    subtitle?: string;
  }> = [];

  for (const c of allConversations.slice(0, 10)) {
    const project = projects.find((p) => p.id === c.projectId);
    activityItems.push({
      kind: 'thread',
      id: c.id,
      title: c.title || 'Untitled thread',
      projectId: c.projectId ?? null,
      projectName: project?.name ?? null,
      updatedAt: c.lastMessageAt ?? c.updated_at,
      subtitle: c.lastMessagePreview,
    });
  }
  for (const a of allArtifacts.slice(0, 10)) {
    const project = projects.find((p) => p.id === a.projectId);
    activityItems.push({
      kind: 'artifact',
      id: a.id,
      title: a.title,
      projectId: a.projectId,
      projectName: project?.name ?? null,
      updatedAt: a.updated_at,
      subtitle: a.type,
    });
  }
  for (const r of allRuns.filter((r) => r.status !== 'complete').slice(0, 5)) {
    const project = projects.find((p) => p.id === r.projectId);
    activityItems.push({
      kind: 'workflow',
      id: r.id,
      title: r.workflowSlug === 'coffee-dates-giving-funnel' ? 'Coffee Dates + Giving Funnel' : 'Validate Your Niche',
      projectId: r.projectId,
      projectName: project?.name ?? null,
      updatedAt: r.updated_at,
      subtitle: `Step ${r.currentStep} of ${r.totalSteps}`,
    });
  }

  activityItems.sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          roles: user.roles ?? [],
          displayName: user.displayName,
          onboardedAt: user.onboardedAt ?? null,
        }
      : null,
    projects: projectSummaries,
    recentActivity: activityItems.slice(0, 12),
  };
}
