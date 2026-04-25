// Re-runs the concept linker against every source chunk (or a filtered subset)
// without requiring re-ingest. Used after an ontology replacement or expansion.
//
// Fires in the background — returns immediately with a jobId the caller can poll.
// Progress is written into an IngestionJobs row so the admin UI tracks it.

import { auth } from '@mindstudio-ai/agent';
import { Sources } from '../tables/sources';
import { ConceptSources } from '../tables/concept_links';
import { IngestionJobs, type IngestionJobError } from '../tables/ingestion_jobs';
import { linkConceptsForSource, loadConceptCatalog } from '../common/conceptLinker';

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

  // Seed an ingestion job so progress is observable in the admin console
  const job = await IngestionJobs.push({
    source: 'upload',
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
  });

  // Fire-and-forget the actual relink
  (async () => {
    try {
      // Optionally clear existing links in scope so we start clean
      if (clearExisting) {
        const sourceIds = new Set(scoped.map((s) => s.id));
        await ConceptSources.removeAll((cs) => sourceIds.has(cs.sourceId));
      }

      const catalog = await loadConceptCatalog();
      const errors: IngestionJobError[] = [];
      let linked = 0;
      let candidates = 0;

      // Process in batches of 10 to keep LLM concurrency reasonable
      for (let i = 0; i < scoped.length; i += 10) {
        const batch = scoped.slice(i, i + 10);
        const results = await Promise.all(
          batch.map((s) => linkConceptsForSource(s.id, catalog))
        );

        for (const r of results) {
          if (r.error) {
            errors.push({ code: 'concept_linking_failed', message: `${r.sourceId}: ${r.error}` });
          } else {
            linked += 1;
            candidates += r.candidatesSurfaced;
          }
        }

        await IngestionJobs.update(job.id, {
          processedChunks: Math.min(i + 10, scoped.length),
          linkedChunks: linked,
          candidateConceptsSurfaced: candidates,
          errors,
        });
      }

      await IngestionJobs.update(job.id, {
        status: errors.length === 0 ? 'completed' : 'partial',
        processedFiles: 1,
        completedAt: Date.now(),
        errors,
      });
    } catch (err) {
      await IngestionJobs.update(job.id, {
        status: 'failed',
        completedAt: Date.now(),
        errors: [
          { code: 'relink_failed', message: err instanceof Error ? err.message : String(err) },
        ],
      });
    }
  })();

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
