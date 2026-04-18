import { auth } from '@mindstudio-ai/agent';
import { Sources } from '../tables/sources';
import { ConceptSources } from '../tables/concept_links';

// API endpoint: DELETE /_/api/sources/:sourceId
//
// Remove a single chunk. Cascades to concept_sources.
export async function deleteSourceChunk(input: { sourceId: string; _request?: unknown }) {
  auth.requireRole('admin');

  if (!input.sourceId) throw new Error('sourceId is required');

  const source = await Sources.get(input.sourceId);
  if (!source) return { deleted: false, sourceId: input.sourceId };

  const cascadeCount = await ConceptSources.removeAll((cs) => cs.sourceId === input.sourceId);
  const result = await Sources.remove(input.sourceId);

  return {
    deleted: result.deleted,
    sourceId: input.sourceId,
    cascadedLinks: cascadeCount,
  };
}
