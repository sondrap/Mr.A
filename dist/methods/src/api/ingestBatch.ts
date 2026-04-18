import { auth, db } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { processIngestionJob } from '../common/processIngestionJob';

// API endpoint: POST /_/api/ingest/batch
//
// Submit up to 50 files in one request. Same idempotent upsert semantics as ingestSource.
export async function ingestBatch(input: {
  files: Array<{ filename: string; content: string }>;
  _request?: unknown;
}) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  if (!Array.isArray(input.files) || input.files.length === 0) {
    throw new Error('files array is required');
  }
  if (input.files.length > 50) {
    throw new Error('Max 50 files per batch request. Send in chunks.');
  }

  const job = await IngestionJobs.push({
    source: 'api',
    triggeredByUserId: auth.userId,
    status: 'parsing',
    totalFiles: input.files.length,
    processedFiles: 0,
    totalChunks: 0,
    processedChunks: 0,
    linkedChunks: 0,
    candidateConceptsSurfaced: 0,
    errors: [],
    startedAt: db.now(),
  });

  processIngestionJob(job.id, input.files).catch((err) => {
    console.error(`Ingestion job ${job.id} failed:`, err);
    IngestionJobs.update(job.id, {
      status: 'failed',
      completedAt: db.now(),
      errors: [{ code: 'unhandled_exception', message: String(err) }],
    }).catch(() => {});
  });

  return {
    jobId: job.id,
    status: 'queued',
    filesQueued: input.files.length,
  };
}
