import { auth, db } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';
import { processIngestionJob } from '../common/processIngestionJob';

// API endpoint: POST /_/api/ingest/sync-file
//
// Replace all chunks for the file's content_id before inserting the new ones. Right call for
// re-chunked files (19 chunks → 22 chunks). Concept links for deleted chunks cascade away.
export async function syncFile(input: {
  filename: string;
  content: string;
  _request?: unknown;
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

  processIngestionJob(job.id, [{ filename: input.filename, content: input.content }], { syncMode: true }).catch((err) => {
    console.error(`Sync ingestion job ${job.id} failed:`, err);
    IngestionJobs.update(job.id, {
      status: 'failed',
      completedAt: db.now(),
      errors: [{ code: 'unhandled_exception', message: String(err) }],
    }).catch(() => {});
  });

  return { jobId: job.id, status: 'queued', mode: 'sync' };
}
