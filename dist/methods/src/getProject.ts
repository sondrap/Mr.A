import { auth, db } from '@mindstudio-ai/agent';
import { Projects } from './tables/projects';
import { WorkflowRuns } from './tables/workflow_runs';
import { Artifacts } from './tables/artifacts';
import { Conversations } from './tables/conversations';

// Load full project detail in one payload: project row + all workflow runs + all artifacts + all conversations.
// Used by the project detail page to render Overview / Workflows / Chat / Artifacts tabs without additional calls.
export async function getProject(input: { projectId: string }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const project = await Projects.get(input.projectId);
  if (!project) throw new Error('Project not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Project not found.');
  }

  const [runs, artifacts, conversations] = await db.batch(
    WorkflowRuns.filter((r) => r.projectId === input.projectId).sortBy((r) => r.updated_at).reverse(),
    Artifacts.filter((a) => a.projectId === input.projectId && !a.archived).sortBy((a) => a.updated_at).reverse(),
    Conversations.filter((c) => c.projectId === input.projectId && !c.archived).sortBy((c) => c.updated_at).reverse()
  );

  return {
    project,
    workflowRuns: runs,
    artifacts,
    conversations,
  };
}
