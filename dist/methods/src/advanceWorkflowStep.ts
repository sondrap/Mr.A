import { auth } from '@mindstudio-ai/agent';
import { WorkflowRuns } from './tables/workflow_runs';

// Called by the frontend when the student clicks CONTINUE on a completed step.
// Advances currentStep to the next one. Marks the workflow complete if we've reached the end.
// Status resets to 'draft' on the new step so the student is ready to provide input for it.
export async function advanceWorkflowStep(input: { runId: string }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const run = await WorkflowRuns.get(input.runId);
  if (!run) throw new Error('Workflow run not found.');
  if (run.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Workflow run not found.');
  }

  if (run.status !== 'ready' && run.status !== 'flagged') {
    throw new Error('Current step is not complete yet.');
  }

  const nextStep = run.currentStep + 1;
  if (nextStep > run.totalSteps) {
    const updated = await WorkflowRuns.update(input.runId, {
      status: 'complete',
    });
    return { run: updated, complete: true };
  }

  const updated = await WorkflowRuns.update(input.runId, {
    currentStep: nextStep,
    status: 'draft',
    lastStreamMessage: '',
    lastError: '',
  });
  return { run: updated, complete: false };
}
