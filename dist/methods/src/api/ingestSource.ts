import { auth, db } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { processIngestionJob } from '../common/processIngestionJob';

// API endpoint: POST /_/api/ingest/source
//
// Submit a single ingestable markdown file. Returns immediately once parsing+source-upsert completes;
// concept linking runs in the background.
//
// Auth: requires admin API key.
export async function ingestSource(input: {
  filename: string;
  content: string;
  _request?: { method: string; headers: Record<string, string>; rawBody?: string };
}) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  if (!input.content) throw new Error('content is required');
  if (!input.filename) throw new Error('filename is required');

  const job = await IngestionJobs.push({
    source: 'api',
    triggeredByUserId: auth.userId,
    status: 'parsing',
    totalFiles: 1,
    processedFiles: 0,
    totalChunks: 0,
    processedChunks: 0,
    linkedChunks: 0,
    candidateConceptsSurfaced: 0,
    errors: [],
    startedAt: db.now(),
  });

  // Fire-and-forget the pipeline. Un-awaited Promise continues after the response is sent.
  processIngestionJob(job.id, [{ filename: input.filename, content: input.content }]).catch((err) => {
    console.error(`Ingestion job ${job.id} failed:`, err);
    IngestionJobs.update(job.id, {
      status: 'failed',
      completedAt: db.now(),
      errors: [{ code: 'unhandled_exception', message: String(err) }],
    }).catch(() => {});
  });

  return {
    jobId: job.id,
    fileId: input.filename,
    status: 'queued',
    conceptLinkingStatus: 'queued',
  };
}
