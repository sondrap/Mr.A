// Processes one time-budgeted batch of chunks for a relink job.
// Used by both the synchronous starter (relinkAllSources) and the cron
// driver (driveRelinkJobs). Each call is bounded so it always exits cleanly
// before any sandbox runtime cutoff, then checkpoints progress to the DB.

import { IngestionJobs, type IngestionJobError } from '../tables/ingestion_jobs';
import { Sources } from '../tables/sources';
import { linkConceptsForSourceData, loadConceptCatalog } from './conceptLinker';

// Time budget per call. Stays well under any reasonable invocation cutoff.
// At ~3-5s per LLM call and 5-concurrent, we process ~50-80 chunks per
// advance call before hitting the budget.
const TIME_BUDGET_MS = 45_000;

// Concurrent in-flight chunks per micro-batch. Lower is more reliable.
//
// Why 5: each chunk does 1 source read + 1 LLM call + N concept_link writes,
// or roughly 8-12 DB operations in flight. At 5-concurrent that's ~40-60
// in-flight DB ops per micro-batch, well under any reasonable platform pool.
// At 30-concurrent (the previous setting) we hit ~300-450 in-flight ops and
// the platform's DB pool exhausted around chunk 328, after which every
// subsequent chunk failed with the same SDK error. The AI calls are the
// real wall-clock bottleneck so dropping from 30 to 5 only modestly slows
// throughput in exchange for a job that actually completes.
const BATCH_SIZE = 5;

// How many sources to pre-fetch per advance call. We bulk-fetch upfront so
// the parallel processing loop never has to issue per-chunk Sources.get
// calls (those were a major contributor to pool pressure). Sized larger
// than the time budget can churn through in one call so we never stall
// waiting for a refetch.
const PREFETCH_SIZE = 120;

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

  // Bulk-fetch the next slice of source rows in one query. Eliminates the
  // per-chunk Sources.get call that was the main contributor to DB pool
  // pressure under high concurrency.
  const prefetchIds = pending.slice(0, PREFETCH_SIZE);
  const prefetchSet = new Set(prefetchIds);
  const prefetchedRows = await Sources.filter((s) => prefetchSet.has(s.id));
  const sourceById = new Map(prefetchedRows.map((s) => [s.id, s]));

  const startedAt = Date.now();
  const errors: IngestionJobError[] = [...job.errors];
  let linked = job.linkedChunks;
  let candidates = job.candidateConceptsSurfaced;
  let processedThisCall = 0;

  // Process batches until budget exhausted or queue empty.
  while (pending.length > 0 && Date.now() - startedAt < TIME_BUDGET_MS) {
    const batchIds = pending.splice(0, BATCH_SIZE);
    const results = await Promise.all(
      batchIds.map(async (sourceId) => {
        const source = sourceById.get(sourceId);
        if (!source) {
          // Source wasn't in the prefetch (rare — chunk added/deleted
          // between prefetch and now, or pending queue exceeded prefetch).
          // Return a soft error and let it be retried by a later advance.
          return {
            sourceId,
            linksCreated: 0,
            candidatesSurfaced: 0,
            error: 'source_not_in_prefetch',
          };
        }
        return linkConceptsForSourceData(source, catalog);
      }),
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
    // Stop if we've exhausted the prefetched window — let the next advance
    // call pick up from the queue with a fresh prefetch.
    if (processedThisCall >= prefetchIds.length) break;
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
