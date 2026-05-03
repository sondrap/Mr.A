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
  onlyUnlinked?: boolean;     // default false — when true, only queue chunks that have ZERO existing concept_links. Useful for cleanup passes after a partial run.
}) {
  auth.requireRole('admin', 'system');

  const clearExisting = input.clearExisting !== false;
  const onlyUnlinked = input.onlyUnlinked === true;

  // Build the source scope. If onlyUnlinked is set, we filter down to
  // chunks that have no existing links — this lets us do cleanup passes
  // after a partial first run without redoing the work that succeeded.
  const allSources = await Sources.toArray();
  let scoped = allSources.filter((s) => {
    if (input.contextSlug && s.contextSlug !== input.contextSlug) return false;
    if (input.contentIdPrefix && !s.contentId.startsWith(input.contentIdPrefix)) return false;
    return true;
  });

  if (onlyUnlinked) {
    const allLinks = await ConceptSources.toArray();
    const linkedSet = new Set(allLinks.map((l) => l.sourceId));
    scoped = scoped.filter((s) => !linkedSet.has(s.id));
  }

  if (scoped.length === 0) {
    throw new Error('No sources matched the given scope.');
  }

  // When onlyUnlinked is on, clearExisting is meaningless (the chunks
  // have no links to clear). Skip it. Otherwise, optionally wipe existing
  // links in scope so we start clean.
  if (clearExisting && !onlyUnlinked) {
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
