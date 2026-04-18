import { auth } from '@mindstudio-ai/agent';
import { Sources } from '../tables/sources';
import { fileLevelHash } from '../common/hashing';

// API endpoint: GET /_/api/sources/manifest
//
// Returns a lightweight listing of every content_id currently ingested with chunk count + file-level hash.
// The ETL uses this to diff against its local output and only re-post what's changed.
//
// Hash algorithm: concatenate chunk bodies in chunk-index order with '\n---\n', sha256 the result.
// This matches the algorithm documented in etl-handoff.md so the ETL's locally-computed hash matches.
export async function getSourcesManifest(input: { _request?: unknown } = {}) {
  auth.requireRole('admin');

  const allSources = await Sources.toArray();

  // Group by contentId
  const byContentId = new Map<string, typeof allSources>();
  for (const src of allSources) {
    const arr = byContentId.get(src.contentId) ?? [];
    arr.push(src);
    byContentId.set(src.contentId, arr);
  }

  const files: Record<string, { chunks: number; hash: string; lastUpdated: number }> = {};
  for (const [contentId, chunks] of byContentId) {
    const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const hash = fileLevelHash(sorted.map((s) => s.body));
    const lastUpdated = Math.max(...sorted.map((s) => s.updated_at));
    files[contentId] = {
      chunks: sorted.length,
      hash: `sha256:${hash}`,
      lastUpdated,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    totalSources: allSources.length,
    files,
  };
}
