import { db } from '@mindstudio-ai/agent';

// One workflow run per student × project × workflow. Tracks progress through steps.
// state is a JSON object carrying captured form data from each step.
//
// Granular status state machine so the frontend can show meaningful progress at each sub-state:
//   draft    → student just started, no step completed yet
//   generating → runTask is producing the current step's artifact
//   reviewing  → reviewer agent is checking the artifact
//   revising   → reviewer said revise, regenerating once
//   ready      → step complete, student can review / continue
//   flagged    → artifact shipped with surfaced concerns (two fails or explicit surface_issues)
//   complete   → all steps finished
export interface WorkflowRunState {
  // Step-keyed captured data (step index 1-based)
  [stepKey: string]: unknown;
}

interface WorkflowRun {
  userId: string;
  projectId: string;
  workflowSlug: string;                      // e.g. 'coffee-dates-giving-funnel' or 'validate-niche'
  status:
    | 'draft'
    | 'generating'
    | 'reviewing'
    | 'revising'
    | 'ready'
    | 'flagged'
    | 'complete';
  currentStep: number;                       // 1-based
  totalSteps: number;
  state: WorkflowRunState;                   // JSON, captured inputs + intermediate data
  lastStreamMessage?: string;                // Latest status message for live display
  generationStartedAt?: number;
  lastError?: string;
}

export const WorkflowRuns = db.defineTable<WorkflowRun>('workflow_runs', {
  defaults: {
    status: 'draft',
    currentStep: 1,
    totalSteps: 6,
    state: {},
  },
});
