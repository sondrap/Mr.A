// Cron driver for concept-linking jobs. Runs on a schedule. Finds the
// oldest in-progress job (relink or ingest) that has a non-empty queue
// and advances it by one bounded batch.
//
// Restricted to the system role so only the platform's cron trigger can
// invoke it. Each call is bounded by the underlying advance helper and
// always exits cleanly, so this is safe to schedule aggressively.
//
// Filtering on a non-empty pendingSourceIds queue is important: there are
// legacy "linking" zombie jobs in the table from before this design that
// have empty queues. Those should be ignored (and cleaned up separately),
// not advanced — advancing them would falsely mark them complete.

import { auth } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { advanceRelinkJobInternal } from '../common/advanceRelinkJob';

export async function driveRelinkJobs() {
  auth.requireRole('system');

  // Find any in-progress job with a real queue. We can't filter on
  // pendingSourceIds length in SQL with this SDK (the field is JSON), so
  // load the in-progress jobs and pick the first one that has work.
  const linkingJobs = await IngestionJobs.filter(
    (j) => j.status === 'linking',
  );
  const job = linkingJobs.find((j) => (j.pendingSourceIds ?? []).length > 0);

  if (!job) {
    return {
      advanced: false,
      reason: 'no_active_jobs_with_queue',
      candidatesScanned: linkingJobs.length,
    };
  }

  const result = await advanceRelinkJobInternal(job.id);

  return {
    advanced: true,
    jobId: result.jobId,
    jobType: job.jobType ?? 'unknown',
    status: result.status,
    processedThisCall: result.processedThisCall,
    remaining: result.remaining,
    totalChunks: result.totalChunks,
  };
}
