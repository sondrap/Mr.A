import { auth } from '@mindstudio-ai/agent';
import { IngestionJobs } from '../tables/ingestion_jobs';

// Admin Content tab: recent ingestion jobs for the live job list.
export async function listIngestionJobs(input: { limit?: number } = {}) {
  auth.requireRole('admin');
  const limit = input.limit ?? 20;
  const jobs = await IngestionJobs.sortBy((j) => j.startedAt).reverse().take(limit);
  return { jobs };
}
