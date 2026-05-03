import { db } from '@mindstudio-ai/agent';

// Tracks content ingestion runs. Updated as phase 1 (source import) completes and as
// phase 2 (concept linking) progresses in the background.
export interface IngestionJobError {
  filename?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

interface IngestionJob {
  source: 'api' | 'upload' | 'scenario';
  triggeredByUserId?: string | null;
  status: 'queued' | 'parsing' | 'linking' | 'completed' | 'failed' | 'partial';
  // jobType discriminates relink jobs from new-content ingest jobs so
  // the cron driver only picks up relinks. Defaults to 'ingest' for
  // historical jobs that don't have it set.
  jobType?: 'ingest' | 'relink';
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  processedChunks: number;
  linkedChunks: number;                      // Chunks that have had concept-linking completed
  candidateConceptsSurfaced: number;
  errors: IngestionJobError[];
  startedAt: number;
  completedAt?: number;
  // For relink jobs: the source IDs left to process. Removed in chunks
  // as the cron advances the job. When empty, the job is marked completed.
  // Stored as JSON; SQLite handles this as TEXT.
  pendingSourceIds?: string[];
  // Heartbeat — last time the cron driver advanced this job. Used to
  // detect jobs that have stalled despite the cron being active.
  lastAdvancedAt?: number;
}

export const IngestionJobs = db.defineTable<IngestionJob>('ingestion_jobs', {
  defaults: {
    source: 'api',
    status: 'queued',
    totalFiles: 0,
    processedFiles: 0,
    totalChunks: 0,
    processedChunks: 0,
    linkedChunks: 0,
    candidateConceptsSurfaced: 0,
    errors: [],
  },
});
