import { auth } from '@mindstudio-ai/agent';
import { Sources } from '../tables/sources';
import { ConceptSources } from '../tables/concept_links';

// API endpoint: DELETE /_/api/sources/:contentId
//
// Remove all chunks for a content_id and cascade to concept_sources. Use when retiring a file.
export async function deleteSourcesByContentId(input: { contentId: string; _request?: unknown }) {
  auth.requireRole('admin');

  if (!input.contentId) throw new Error('contentId is required');

  const sources = await Sources.filter((s) => s.contentId === input.contentId);
  if (sources.length === 0) {
    return { deleted: 0, contentId: input.contentId };
  }

  const sourceIds = new Set(sources.map((s) => s.id));

  // Cascade: delete all concept_sources links for these sources
  const cascadeCount = await ConceptSources.removeAll((cs) => sourceIds.has(cs.sourceId));

  // Then delete the sources themselves
  const sourceDeleteCount = await Sources.removeAll((s) => s.contentId === input.contentId);

  return {
    deleted: sourceDeleteCount,
    cascadedLinks: cascadeCount,
    contentId: input.contentId,
  };
}
