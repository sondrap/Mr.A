import { auth } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';

// API endpoint: GET /_/api/ingest/status/:jobId
//
// Poll ingestion progress. Returns current phase (parsing / linking / completed / failed / partial)
// plus counts and any errors.
export async function getIngestionStatus(input: { jobId: string; _request?: unknown }) {
  auth.requireRole('admin');

  const job = await IngestionJobs.get(input.jobId);
  if (!job) throw new Error('Ingestion job not found.');

  return {
    jobId: job.id,
    status: job.status,
    totalFiles: job.totalFiles,
    processedFiles: job.processedFiles,
    totalChunks: job.totalChunks,
    processedChunks: job.processedChunks,
    linkedChunks: job.linkedChunks,
    candidateConceptsSurfaced: job.candidateConceptsSurfaced,
    errors: job.errors,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}
