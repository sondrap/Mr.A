import { auth } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';

// Full detail of a single ingestion job — errors, progress, etc.
export async function getIngestionJob(input: { jobId: string }) {
  auth.requireRole('admin');
  const job = await IngestionJobs.get(input.jobId);
  if (!job) throw new Error('Ingestion job not found.');
  return { job };
}
