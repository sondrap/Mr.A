import { auth, db } from '@mindstudio-ai/agent';
import { WorkflowRuns } from './tables/workflow_runs';
import { Projects } from './tables/projects';

// Start a new workflow run for a project. Validates role access (free tier can only start validate-niche).
// Returns the new run; idempotent per (userId, projectId, workflowSlug) — if already started, returns existing.
export async function startWorkflow(input: { projectId: string; workflowSlug: string }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const project = await Projects.get(input.projectId);
  if (!project) throw new Error('Project not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Project not found.');
  }

  // Free-tier access gate
  if (input.workflowSlug !== 'validate-niche' && !auth.hasRole('student', 'admin')) {
    throw new Error('This workflow requires full access. Reach out to Travis\'s team to unlock.');
  }

  // Check for an existing run on this project + workflow
  const existing = await WorkflowRuns.findOne(
    (r) => r.projectId === input.projectId && r.workflowSlug === input.workflowSlug
  );
  if (existing) return { run: existing, alreadyStarted: true };

  const totalSteps = input.workflowSlug === 'coffee-dates-giving-funnel' ? 6 : 1;

  const run = await WorkflowRuns.push({
    userId: auth.userId,
    projectId: input.projectId,
    workflowSlug: input.workflowSlug,
    status: 'draft',
    currentStep: 1,
    totalSteps,
    state: {},
  });

  await Projects.update(input.projectId, { lastActivityAt: db.now() });

  return { run, alreadyStarted: false };
}
