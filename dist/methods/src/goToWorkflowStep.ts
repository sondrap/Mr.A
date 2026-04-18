import { auth } from '@mindstudio-ai/agent';
import { WorkflowRuns } from './tables/workflow_runs';

// Jump back to a previously-completed step for review. Non-destructive — does not alter state,
// just updates `currentStep` so the UI shows that step's canvas. Upcoming steps are locked.
export async function goToWorkflowStep(input: { runId: string; stepIndex: number }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const run = await WorkflowRuns.get(input.runId);
  if (!run) throw new Error('Workflow run not found.');
  if (run.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Workflow run not found.');
  }

  if (input.stepIndex < 1 || input.stepIndex > run.totalSteps) {
    throw new Error('Step index out of range.');
  }

  // Can only revisit steps the student has already reached
  if (input.stepIndex > run.currentStep && run.status !== 'complete') {
    throw new Error("Can't jump forward to a step you haven't reached yet.");
  }

  const updated = await WorkflowRuns.update(input.runId, { currentStep: input.stepIndex });
  return { run: updated };
}
