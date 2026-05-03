import { auth, db } from '@mindstudio-ai/agent';
import { Concepts } from './tables/concepts';
import { ConceptSources } from './tables/concept_links';
import { Sources } from './tables/sources';
import { NorthStars } from './tables/north_stars';
import { Skills } from './tables/skills';
import { Contexts } from './tables/contexts';
import { formatLocator } from './common/citations';

// Agent tool: fetch a concept's full details including linked North Stars, linked Skills,
// and top source chunks ordered by depth desc.
export async function getConcept(input: { slug: string; maxSources?: number }) {
  auth.requireRole('student', 'admin');

  const maxSources = input.maxSources ?? 3;

  const concept = await Concepts.findOne((c) => c.slug === input.slug);
  if (!concept) throw new Error('Concept not found.');

  const [links, allSkills, allNorthStars] = await db.batch(
    ConceptSources.filter((cs) => cs.conceptSlug === concept.slug),
    Skills.filter((s) => s.conceptSlugs.includes(concept.slug)),
    NorthStars.toArray()
  );

  // Filter out depth=1 ("passing reference") and role='reference_mention'
  // before sorting. These tags mean the concept is briefly mentioned but
  // not actually taught — they're useful for retrieval recall but bad as
  // user-facing citations. If filtering leaves us empty (nothing above
  // depth 1 was tagged for this concept), fall back to all links so the
  // tool still returns something rather than nothing.
  const meaningfulLinks = links.filter((l) => l.depth >= 2 && l.role !== 'reference_mention');
  const linksForCitations = meaningfulLinks.length > 0 ? meaningfulLinks : links;
  const topLinks = [...linksForCitations].sort((a, b) => b.depth - a.depth).slice(0, maxSources);
  const sourceRows = await Promise.all(topLinks.map((l) => Sources.get(l.sourceId)));

  const contextSlugs = Array.from(
    new Set(sourceRows.filter((s): s is NonNullable<typeof s> => s !== null).map((s) => s.contextSlug))
  );
  const contexts = contextSlugs.length
    ? await Contexts.filter((c) => contextSlugs.includes(c.slug))
    : [];
  const contextBySlug = new Map(contexts.map((c) => [c.slug, c]));

  const topSources = topLinks
    .map((link, i) => {
      const src = sourceRows[i];
      if (!src) return null;
      const ctx = contextBySlug.get(src.contextSlug);
      return {
        sourceId: src.id,
        contextSlug: src.contextSlug,
        contextName: ctx?.name ?? src.contextSlug,
        contentName: src.contentName,
        chunkHeading: src.chunkHeading,
        description: src.description,
        locator: formatLocator(src),
        depth: link.depth,
        role: link.role,
        extract: link.extract,
        linkUrl: src.linkUrl,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const linkedNorthStars = allNorthStars.filter((n) => concept.northStarSlugs.includes(n.slug));

  return {
    concept: {
      slug: concept.slug,
      name: concept.name,
      description: concept.description,
      aliases: concept.aliases,
      essence: concept.essence,
      flavor: concept.flavor,
      tags: concept.tags,
    },
    northStars: linkedNorthStars.map((n) => ({ slug: n.slug, name: n.name, description: n.description })),
    linkedSkills: allSkills.map((s) => ({ slug: s.slug, name: s.name, description: s.description })),
    topSources,
  };
}
