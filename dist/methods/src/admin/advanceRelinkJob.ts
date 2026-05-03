// Manually advance one relink job by one batch. Useful for the admin UI
// to force progress without waiting for the cron tick.

import { auth } from '@mindstudio-ai/agent';
import { advanceRelinkJobInternal } from '../common/advanceRelinkJob';

export async function advanceRelinkJob(input: { jobId: string }) {
  auth.requireRole('admin', 'system');
  if (!input.jobId) throw new Error('jobId is required.');
  return advanceRelinkJobInternal(input.jobId);
}
