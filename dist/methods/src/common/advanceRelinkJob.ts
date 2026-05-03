// Processes one time-budgeted batch of chunks for a relink job.
// Used by both the synchronous starter (relinkAllSources) and the cron
// driver (driveRelinkJobs). Each call is bounded so it always exits cleanly
// before any sandbox runtime cutoff, then checkpoints progress to the DB.

import { IngestionJobs, type IngestionJobError } from '../tables/ingestion_jobs';
import { linkConceptsForSource, loadConceptCatalog } from './conceptLinker';

// Time budget per call. Stays well under any reasonable invocation cutoff.
// At ~5s per LLM-bound chunk and 30-concurrent batches, this lets us
// process roughly 60-90 chunks per call (2-3 batches) without ever
// running long enough to risk getting torn down mid-batch.
const TIME_BUDGET_MS = 45_000;

// Each parallel batch within a single advance call. 30 concurrent LLM
// calls is comfortably under any per-account rate limit and matches what
// production was running before we redesigned this.
const BATCH_SIZE = 30;

export interface AdvanceResult {
  jobId: string;
  status: 'linking' | 'completed' | 'partial' | 'failed' | 'noop';
  processedThisCall: number;
  remaining: number;
  totalChunks: number;
  reason: 'budget_exhausted' | 'queue_empty' | 'job_not_found' | 'job_terminal';
}

export async function advanceRelinkJobInternal(jobId: string): Promise<AdvanceResult> {
  const job = await IngestionJobs.get(jobId);
  if (!job) {
    return {
      jobId,
      status: 'noop',
      processedThisCall: 0,
      remaining: 0,
      totalChunks: 0,
      reason: 'job_not_found',
    };
  }

  // If the job is already in a terminal state, no-op. This can happen
  // if a stale cron tick races with a manual completion.
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'partial') {
    return {
      jobId,
      status: job.status,
      processedThisCall: 0,
      remaining: 0,
      totalChunks: job.totalChunks,
      reason: 'job_terminal',
    };
  }

  const pending = (job.pendingSourceIds ?? []).slice();

  // Queue empty — mark the job done and return.
  if (pending.length === 0) {
    const finalStatus: 'completed' | 'partial' =
      job.errors.length === 0 ? 'completed' : 'partial';
    await IngestionJobs.update(jobId, {
      status: finalStatus,
      processedFiles: 1,
      completedAt: Date.now(),
      pendingSourceIds: [],
    });
    return {
      jobId,
      status: finalStatus,
      processedThisCall: 0,
      remaining: 0,
      totalChunks: job.totalChunks,
      reason: 'queue_empty',
    };
  }

  // Load the concept catalog once for this advance call. This is the
  // expensive shared setup that would have been wasted if we processed
  // one chunk per invocation.
  const catalog = await loadConceptCatalog();

  const startedAt = Date.now();
  const errors: IngestionJobError[] = [...job.errors];
  let linked = job.linkedChunks;
  let candidates = job.candidateConceptsSurfaced;
  let processedThisCall = 0;

  // Process batches until budget exhausted or queue empty.
  while (pending.length > 0 && Date.now() - startedAt < TIME_BUDGET_MS) {
    const batchIds = pending.splice(0, BATCH_SIZE);
    const results = await Promise.all(
      batchIds.map((sourceId) => linkConceptsForSource(sourceId, catalog)),
    );
    for (const r of results) {
      if (r.error) {
        errors.push({
          code: 'concept_linking_failed',
          message: `${r.sourceId}: ${r.error}`,
        });
      } else {
        linked += 1;
        candidates += r.candidatesSurfaced;
      }
    }
    processedThisCall += batchIds.length;
  }

  // Checkpoint progress to the DB.
  const totalProcessed = job.totalChunks - pending.length;
  const queueEmpty = pending.length === 0;
  const finalStatus: 'completed' | 'partial' | 'linking' = queueEmpty
    ? errors.length === 0
      ? 'completed'
      : 'partial'
    : 'linking';

  await IngestionJobs.update(jobId, {
    pendingSourceIds: pending,
    processedChunks: totalProcessed,
    linkedChunks: linked,
    candidateConceptsSurfaced: candidates,
    errors,
    status: finalStatus,
    lastAdvancedAt: Date.now(),
    ...(queueEmpty ? { completedAt: Date.now(), processedFiles: 1 } : {}),
  });

  return {
    jobId,
    status: finalStatus,
    processedThisCall,
    remaining: pending.length,
    totalChunks: job.totalChunks,
    reason: queueEmpty ? 'queue_empty' : 'budget_exhausted',
  };
}
