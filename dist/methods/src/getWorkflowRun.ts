import { auth, db } from '@mindstudio-ai/agent';
import { WorkflowRuns } from './tables/workflow_runs';
import { Projects } from './tables/projects';
import { Artifacts } from './tables/artifacts';

// Full load for the workflow walkthrough page. Returns the run + project + all artifacts from this run.
// The frontend polls this method to pick up progress during async step generation.
export async function getWorkflowRun(input: { runId: string }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const run = await WorkflowRuns.get(input.runId);
  if (!run) throw new Error('Workflow run not found.');
  if (run.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Workflow run not found.');
  }

  const [project, artifacts] = await db.batch(
    Projects.get(run.projectId),
    Artifacts.filter((a) => a.workflowRunId === run.id).sortBy((a) => a.stepIndex ?? 0)
  );

  return {
    run,
    project,
    artifacts,
  };
}
