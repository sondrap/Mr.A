import { auth, db } from '@mindstudio-ai/agent';
import { Skills } from './tables/skills';
import { Concepts } from './tables/concepts';
import { ConceptSources } from './tables/concept_links';
import { Sources } from './tables/sources';
import { Contexts } from './tables/contexts';
import { formatLocator } from './common/citations';

// Agent tool: fetch a skill's full details.
export async function getSkill(input: { slug: string; maxSources?: number }) {
  auth.requireRole('student', 'admin');

  const maxSources = input.maxSources ?? 4;

  const skill = await Skills.findOne((s) => s.slug === input.slug);
  if (!skill) throw new Error('Skill not found.');

  if (skill.conceptSlugs.length === 0) {
    return { skill, concepts: [], topSources: [] };
  }

  const concepts = await Concepts.filter((c) => skill.conceptSlugs.includes(c.slug));

  // Pull all concept_sources links for these concepts
  const allLinks = await ConceptSources.filter((cs) => skill.conceptSlugs.includes(cs.conceptSlug));

  // Top links by depth, dedupe by sourceId
  const sourceToBestLink = new Map<string, (typeof allLinks)[number]>();
  for (const link of allLinks) {
    const existing = sourceToBestLink.get(link.sourceId);
    if (!existing || link.depth > existing.depth) {
      sourceToBestLink.set(link.sourceId, link);
    }
  }
  const topLinks = Array.from(sourceToBestLink.values())
    .sort((a, b) => b.depth - a.depth)
    .slice(0, maxSources);

  const sourceRows = await Promise.all(topLinks.map((l) => Sources.get(l.sourceId)));
  const contextSlugs = Array.from(
    new Set(sourceRows.filter((s): s is NonNullable<typeof s> => s !== null).map((s) => s.contextSlug))
  );
  const contexts = contextSlugs.length ? await Contexts.filter((c) => contextSlugs.includes(c.slug)) : [];
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
        locator: formatLocator(src),
        depth: link.depth,
        role: link.role,
        linkUrl: src.linkUrl,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    skill: {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      aliases: skill.aliases,
    },
    concepts: concepts.map((c) => ({
      slug: c.slug,
      name: c.name,
      summary: c.description.split('\n')[0].slice(0, 280),
    })),
    topSources,
  };
}
