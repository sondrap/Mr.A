// Ingestion pipeline orchestrator. Phase 1 (parse + upsert sources) runs
// synchronously here. Phase 2 (concept linking) is queued onto the job's
// pendingSourceIds and processed by the cron driver in bounded batches.
// This makes the linking phase durable: it survives sandbox restarts and
// runtime cutoffs the same way the relink does.

import { parseChunkedMarkdown } from './chunkedMarkdown';
import { IngestionJobs, type IngestionJobError } from '../tables/ingestion_jobs';
import { Sources } from '../tables/sources';
import { Contexts } from '../tables/contexts';
import { ConceptSources } from '../tables/concept_links';

export interface IngestFileInput {
  filename: string;
  content: string;
}

// Resolve a contextSlug from a parent ID string. First try exact match, then alias match.
async function resolveContextSlug(parentId: string): Promise<string | null> {
  const contexts = await Contexts.toArray();
  const parentLower = parentId.trim().toLowerCase();

  const exact = contexts.find((c) => c.slug.toLowerCase() === parentLower);
  if (exact) return exact.slug;

  const aliasMatch = contexts.find((c) =>
    (c.aliases ?? []).some((a) => a.trim().toLowerCase() === parentLower)
  );
  if (aliasMatch) return aliasMatch.slug;

  return null;
}

export interface ProcessOptions {
  syncMode?: boolean;
}

// Ensure UNCATEGORIZED context exists as a fallback bucket
async function ensureUncategorized() {
  const existing = await Contexts.findOne((c) => c.slug === 'UNCATEGORIZED');
  if (existing) return;
  await Contexts.push({
    slug: 'UNCATEGORIZED',
    name: 'Uncategorized',
    description:
      'Default bucket for content whose parent Context has not yet been declared. Reclassify via the admin console.',
    aliases: [],
  });
}

export async function processIngestionJob(
  jobId: string,
  files: IngestFileInput[],
  options: ProcessOptions = {}
) {
  await IngestionJobs.update(jobId, {
    status: 'parsing',
    totalFiles: files.length,
    processedFiles: 0,
    processedChunks: 0,
    totalChunks: 0,
  });

  const errors: IngestionJobError[] = [];
  await ensureUncategorized();

  const newlyIngestedSourceIds: string[] = [];
  let totalChunksSeen = 0;

  // Phase 1: parse + upsert sources
  for (const file of files) {
    try {
      const { file: parsed, errors: parseErrors } = parseChunkedMarkdown(file.content);
      for (const err of parseErrors) {
        errors.push({ filename: file.filename, code: err.code, message: err.message, chunkIndex: err.chunkIndex });
      }
      if (!parsed) {
        const current = await IngestionJobs.get(jobId);
        if (current) {
          await IngestionJobs.update(jobId, { processedFiles: current.processedFiles + 1 });
        }
        continue;
      }

      let contextSlug = await resolveContextSlug(parsed.inventoryParentContentId);
      if (!contextSlug) {
        errors.push({
          filename: file.filename,
          code: 'unknown_context',
          message: `Context '${parsed.inventoryParentContentId}' not declared — bucketed as UNCATEGORIZED.`,
        });
        contextSlug = 'UNCATEGORIZED';
      }

      if (options.syncMode) {
        await Sources.removeAll((s) => s.contentId === parsed.contentId);
      }

      totalChunksSeen += parsed.chunks.length;

      for (const chunk of parsed.chunks) {
        try {
          const row = await Sources.upsert(['contentId', 'chunkIndex'], {
            contextSlug,
            contentId: parsed.contentId,
            contentName: parsed.contentName,
            format: parsed.type,
            chunkIndex: chunk.chunkIndex,
            chunkHeading: chunk.chunkHeading,
            timestampStart: chunk.timestampStart,
            timestampEnd: chunk.timestampEnd,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            description: chunk.description,
            body: chunk.body,
            bodyHash: chunk.bodyHash,
            linkUrl: chunk.linkUrl ?? undefined,
          });
          newlyIngestedSourceIds.push(row.id);

          if (options.syncMode) {
            await ConceptSources.removeAll((cs) => cs.sourceId === row.id);
          }
        } catch (chunkErr) {
          errors.push({
            filename: file.filename,
            chunkIndex: chunk.chunkIndex,
            code: 'chunk_write_failed',
            message: chunkErr instanceof Error ? chunkErr.message : String(chunkErr),
          });
        }
      }

      const current = await IngestionJobs.get(jobId);
      if (current) {
        await IngestionJobs.update(jobId, {
          processedFiles: current.processedFiles + 1,
          processedChunks: newlyIngestedSourceIds.length,
          totalChunks: totalChunksSeen,
          errors,
        });
      }
    } catch (fileErr) {
      errors.push({
        filename: file.filename,
        code: 'file_processing_failed',
        message: fileErr instanceof Error ? fileErr.message : String(fileErr),
      });
    }
  }

  // Phase 2: queue concept linking for the cron driver to handle in bounded
  // batches. Don't link inline — long-running fire-and-forget Promises get
  // torn down by the runtime, which is what bit the previous design.
  //
  // Special case: if no chunks were upserted (all-error file, or empty
  // file), there's nothing to link. Mark the job complete or failed
  // immediately depending on whether we got any errors.
  if (newlyIngestedSourceIds.length === 0) {
    const finalStatus = errors.length === 0 ? 'completed' : 'failed';
    await IngestionJobs.update(jobId, {
      status: finalStatus,
      completedAt: Date.now(),
      totalChunks: totalChunksSeen,
      errors,
    });
    return;
  }

  await IngestionJobs.update(jobId, {
    status: 'linking',
    jobType: 'ingest',
    totalChunks: totalChunksSeen,
    pendingSourceIds: newlyIngestedSourceIds,
    lastAdvancedAt: Date.now(),
    errors,
  });
}
