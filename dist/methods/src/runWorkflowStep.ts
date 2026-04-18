import { auth } from '@mindstudio-ai/agent';
import { WorkflowRuns } from './tables/workflow_runs';
import { Projects } from './tables/projects';
import { executeWorkflowStep } from './common/executeWorkflowStep';

// Kick off generation for a workflow step. Returns immediately with status='generating'.
// The actual generation + review runs in the background (un-awaited Promise continues after the response).
// Frontend polls getWorkflowRun to pick up progress + the final artifact.
export async function runWorkflowStep(input: {
  runId: string;
  stepIndex: number;
  studentInput?: Record<string, unknown>;
}) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const run = await WorkflowRuns.get(input.runId);
  if (!run) throw new Error('Workflow run not found.');
  if (run.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Workflow run not found.');
  }

  // Free-tier access gate (no coffee-dates workflow)
  if (run.workflowSlug === 'coffee-dates-giving-funnel' && !auth.hasRole('student', 'admin')) {
    throw new Error('This workflow requires full access.');
  }

  if (input.stepIndex > run.totalSteps) {
    throw new Error(`Step ${input.stepIndex} is beyond this workflow's total (${run.totalSteps}).`);
  }

  // Mark as generating immediately so the UI reflects the state before the Promise continues
  await WorkflowRuns.update(input.runId, {
    status: 'generating',
    currentStep: input.stepIndex,
    generationStartedAt: Date.now(),
    lastStreamMessage: 'Starting...',
    lastError: '',
  });

  // Fire-and-forget: the un-awaited Promise continues after the response is sent.
  // Platform docs: "The execution environment persists between requests. The un-awaited
  // promise continues after the method returns. DB, auth, and SDK all work normally."
  executeWorkflowStep({
    userId: auth.userId,
    runId: input.runId,
    stepIndex: input.stepIndex,
    studentInput: input.studentInput ?? {},
  }).catch((err) => {
    console.error('Background workflow step execution failed:', err);
    WorkflowRuns.update(input.runId, {
      status: 'flagged',
      lastError: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
  });

  return { status: 'generating', runId: input.runId, stepIndex: input.stepIndex };
}
