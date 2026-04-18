import { db } from '@mindstudio-ai/agent';

// Raw YAML-chunked content from Travis's courses. One row per chunk.
// Uniqueness is (contentId, chunkIndex) so re-ingestion upserts idempotently.
// The system auto-generated `id` (UUID) is used for FK references from concept_sources
// and citedSourceIds on artifacts. The displayed locator uses contentId + chunkIndex.
interface Source {
  contextSlug: string;             // FK to contexts.slug
  contentId: string;               // Inner content identifier from YAML (e.g. BEAM-M02)
  contentName: string;             // Inner content name (e.g. "Fast Action Plan")
  format: 'VIDEO' | 'DOCUMENT' | 'LESSON' | 'WORKSHOP' | 'COACHING_CALL';
  chunkIndex: number;              // Position within the file
  chunkHeading: string;            // The inline ## heading
  timestampStart?: number | null;
  timestampEnd?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  description: string;
  body: string;                    // Main retrieval target
  bodyHash: string;                // For change detection / manifest endpoint
  linkUrl?: string;
}

export const Sources = db.defineTable<Source>('sources', {
  unique: [['contentId', 'chunkIndex']],
});
