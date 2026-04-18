// Helper for workflow generation: pull the concept + source context block that gets injected
// into the generator's system prompt as the "reference material" section.
//
// Grounding rule: the generator sees ONLY these sources. It's instructed not to draw from
// general knowledge. This is how we enforce "Mr. A doesn't freelance" in workflow artifacts.

import { Concepts } from '../tables/concepts';
import { ConceptSources } from '../tables/concept_links';
import { Sources } from '../tables/sources';

export async function buildConceptsContext(
  conceptSlugs: string[],
  maxSourcesPerConcept = 2
): Promise<{ contextBlock: string; sourceIds: string[] }> {
  if (conceptSlugs.length === 0) {
    return { contextBlock: '(no reference material provided for this step)', sourceIds: [] };
  }

  const concepts = await Concepts.filter((c) => conceptSlugs.includes(c.slug));
  if (concepts.length === 0) {
    return { contextBlock: '(no concepts found for this step — skip any teaching claims)', sourceIds: [] };
  }

  // Pull link table for all these concepts in one query
  const allLinks = await ConceptSources.filter((cs) => conceptSlugs.includes(cs.conceptSlug));

  // For each concept, pick top N sources by depth
  const byConceptSlug = new Map<string, typeof allLinks>();
  for (const link of allLinks) {
    const arr = byConceptSlug.get(link.conceptSlug) ?? [];
    arr.push(link);
    byConceptSlug.set(link.conceptSlug, arr);
  }

  const uniqueLinks: Array<{
    link: (typeof allLinks)[number];
    concept: (typeof concepts)[number];
  }> = [];
  const seenSourceIds = new Set<string>();
  for (const concept of concepts) {
    const links = (byConceptSlug.get(concept.slug) ?? []).sort((a, b) => b.depth - a.depth);
    for (const link of links.slice(0, maxSourcesPerConcept)) {
      if (!seenSourceIds.has(link.sourceId)) {
        seenSourceIds.add(link.sourceId);
        uniqueLinks.push({ link, concept });
      }
    }
  }

  if (uniqueLinks.length === 0) {
    // Concepts exist but have no linked sources yet — return the concept descriptions only
    const conceptBlocks = concepts.map(
      (c) => `### Concept: ${c.name} (slug: ${c.slug})\n${c.description}\n`
    );
    return {
      contextBlock: [
        'CONCEPTS IN SCOPE FOR THIS STEP (no source chunks linked yet — proceed with concept definitions only):',
        ...conceptBlocks,
      ].join('\n'),
      sourceIds: [],
    };
  }

  // Fetch source bodies in one batch
  const sourceRows = await Promise.all(uniqueLinks.map((ul) => Sources.get(ul.link.sourceId)));

  const conceptBlocks = concepts.map(
    (c) => `### Concept: ${c.name} (slug: ${c.slug})\n${c.description}\n`
  );

  const sourceBlocks = sourceRows
    .map((src, i) => {
      if (!src) return null;
      const link = uniqueLinks[i].link;
      const concept = uniqueLinks[i].concept;
      return `### Source: ${src.id} (teaching: ${concept.name}, depth ${link.depth})\nFrom "${src.contentName}" — ${src.chunkHeading}\n${src.body.slice(0, 2000)}\n`;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const contextBlock = [
    'CONCEPTS IN SCOPE FOR THIS STEP:',
    ...conceptBlocks,
    '',
    'SOURCE EXCERPTS (cite these source IDs in your output — subset of these only):',
    ...sourceBlocks,
  ].join('\n');

  return {
    contextBlock,
    sourceIds: sourceRows.filter((s): s is NonNullable<typeof s> => s !== null).map((s) => s.id),
  };
}
