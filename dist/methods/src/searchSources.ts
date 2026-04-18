import { auth } from '@mindstudio-ai/agent';
import { Sources } from './tables/sources';
import { ConceptSources } from './tables/concept_links';
import { Contexts } from './tables/contexts';
import { formatLocator } from './common/citations';

// Agent tool: full-text search over source chunks.
export async function searchSources(input: {
  query: string;
  contextSlug?: string;
  conceptSlug?: string;
  limit?: number;
}) {
  auth.requireRole('student', 'admin');

  const queryLower = input.query.trim().toLowerCase();
  if (!queryLower) return { sources: [] };

  const limit = input.limit ?? 5;

  // If filtering by concept, narrow via the link table first
  let candidateSourceIds: Set<string> | null = null;
  if (input.conceptSlug) {
    const links = await ConceptSources.filter((cs) => cs.conceptSlug === input.conceptSlug);
    candidateSourceIds = new Set(links.map((l) => l.sourceId));
    if (candidateSourceIds.size === 0) return { sources: [] };
  }

  const allSources = await Sources.toArray();

  const scored = allSources
    .filter((s) => {
      if (candidateSourceIds && !candidateSourceIds.has(s.id)) return false;
      if (input.contextSlug && s.contextSlug !== input.contextSlug) return false;
      return true;
    })
    .map((s) => {
      const headingHit = s.chunkHeading.toLowerCase().includes(queryLower) ? 6 : 0;
      const descHit = s.description.toLowerCase().includes(queryLower) ? 4 : 0;
      const bodyHit = s.body.toLowerCase().includes(queryLower) ? 2 : 0;
      return { source: s, score: headingHit + descHit + bodyHit };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) return { sources: [] };

  const contextSlugs = Array.from(new Set(scored.map((s) => s.source.contextSlug)));
  const contexts = await Contexts.filter((c) => contextSlugs.includes(c.slug));
  const contextBySlug = new Map(contexts.map((c) => [c.slug, c]));

  return {
    sources: scored.map((s) => {
      const ctx = contextBySlug.get(s.source.contextSlug);
      return {
        sourceId: s.source.id,
        contextSlug: s.source.contextSlug,
        contextName: ctx?.name ?? s.source.contextSlug,
        contentName: s.source.contentName,
        chunkHeading: s.source.chunkHeading,
        description: s.source.description,
        locator: formatLocator(s.source),
        linkUrl: s.source.linkUrl,
        bodyPreview: s.source.body.slice(0, 320),
      };
    }),
  };
}
