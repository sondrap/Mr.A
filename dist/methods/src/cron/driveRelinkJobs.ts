// Cron driver for relink jobs. Runs on a schedule. Finds the oldest
// in-progress relink job and advances it by one bounded batch.
//
// Restricted to the system role so only the platform's cron trigger can
// invoke it. Each call is bounded by the underlying advance helper and
// always exits cleanly, so this is safe to schedule aggressively.

import { auth } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { advanceRelinkJobInternal } from '../common/advanceRelinkJob';

export async function driveRelinkJobs() {
  auth.requireRole('system');

  // Find the oldest in-progress relink job. Process one per tick so the
  // cron call stays well under any runtime cutoff. If multiple relink
  // jobs are queued, the next tick will pick up the next one.
  const job = await IngestionJobs.findOne(
    (j) => j.status === 'linking' && j.jobType === 'relink',
  );

  if (!job) {
    return { advanced: false, reason: 'no_active_relink_jobs' };
  }

  const result = await advanceRelinkJobInternal(job.id);

  return {
    advanced: true,
    jobId: result.jobId,
    status: result.status,
    processedThisCall: result.processedThisCall,
    remaining: result.remaining,
    totalChunks: result.totalChunks,
  };
}
