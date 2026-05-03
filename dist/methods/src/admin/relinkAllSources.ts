// Starts a durable relink job. Returns immediately with a jobId. The job
// processes chunks in bounded batches driven by a cron interface so it
// survives sandbox restarts and runtime timeouts.
//
// Architecture: the job's pendingSourceIds is the queue. Each cron tick
// calls advanceRelinkJob, which processes a time-budgeted batch and shrinks
// the queue. When the queue is empty, the job is marked completed.

import { auth } from '@mindstudio-ai/agent';
import { Sources } from '../tables/sources';
import { ConceptSources } from '../tables/concept_links';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { advanceRelinkJobInternal } from '../common/advanceRelinkJob';

export async function relinkAllSources(input: {
  contextSlug?: string;       // optional filter — e.g. 'BDTS' to relink only one course
  contentIdPrefix?: string;   // optional filter — e.g. 'BDTS-M' to relink specific files
  clearExisting?: boolean;    // default true — wipe concept_links for the affected scope first
}) {
  auth.requireRole('admin', 'system');

  const clearExisting = input.clearExisting !== false;

  // Build the source scope
  const allSources = await Sources.toArray();
  const scoped = allSources.filter((s) => {
    if (input.contextSlug && s.contextSlug !== input.contextSlug) return false;
    if (input.contentIdPrefix && !s.contentId.startsWith(input.contentIdPrefix)) return false;
    return true;
  });

  if (scoped.length === 0) {
    throw new Error('No sources matched the given scope.');
  }

  // Optionally clear existing links in scope so we start clean. Done up
  // front before the job is created so a partial clear can't leave the
  // job in a confusing half-state.
  if (clearExisting) {
    const sourceIds = new Set(scoped.map((s) => s.id));
    await ConceptSources.removeAll((cs) => sourceIds.has(cs.sourceId));
  }

  const sourceIds = scoped.map((s) => s.id);

  // Seed the job with the full pending queue. Each cron tick will advance it.
  const job = await IngestionJobs.push({
    source: 'upload',
    jobType: 'relink',
    triggeredByUserId: auth.userId,
    totalFiles: 1,
    processedFiles: 0,
    totalChunks: scoped.length,
    processedChunks: 0,
    linkedChunks: 0,
    candidateConceptsSurfaced: 0,
    status: 'linking',
    errors: [],
    startedAt: Date.now(),
    pendingSourceIds: sourceIds,
    lastAdvancedAt: Date.now(),
  });

  // Process one batch synchronously so the caller sees immediate progress.
  // Subsequent batches are driven by the cron tick.
  await advanceRelinkJobInternal(job.id);

  return {
    jobId: job.id,
    scope: {
      contextSlug: input.contextSlug ?? null,
      contentIdPrefix: input.contentIdPrefix ?? null,
    },
    sourcesInScope: scoped.length,
    clearExisting,
  };
}
