import { auth, db } from '@mindstudio-ai/agent';
import { Sources } from './tables/sources';
import { Contexts } from './tables/contexts';
import { ConceptSources } from './tables/concept_links';
import { Concepts } from './tables/concepts';
import { formatLocator, formatTimestamp } from './common/citations';

// Agent tool + source side panel data source.
export async function getSource(input: { id: string }) {
  auth.requireRole('student', 'admin');

  const source = await Sources.get(input.id);
  if (!source) throw new Error('Source not found.');

  const [context, links] = await db.batch(
    Contexts.findOne((c) => c.slug === source.contextSlug),
    ConceptSources.filter((cs) => cs.sourceId === source.id)
  );

  const concepts = links.length
    ? await Concepts.filter((c) => links.map((l) => l.conceptSlug).includes(c.slug))
    : [];
  const conceptBySlug = new Map(concepts.map((c) => [c.slug, c]));

  return {
    source: {
      id: source.id,
      contextSlug: source.contextSlug,
      contextName: context?.name ?? source.contextSlug,
      contentId: source.contentId,
      contentName: source.contentName,
      format: source.format,
      chunkHeading: source.chunkHeading,
      description: source.description,
      body: source.body,
      locator: formatLocator(source),
      timestampStart: source.timestampStart,
      timestampStartFormatted: formatTimestamp(source.timestampStart),
      timestampEnd: source.timestampEnd,
      pageStart: source.pageStart,
      pageEnd: source.pageEnd,
      linkUrl: source.linkUrl,
    },
    relatedConcepts: links
      .map((link) => {
        const concept = conceptBySlug.get(link.conceptSlug);
        if (!concept) return null;
        return {
          slug: concept.slug,
          name: concept.name,
          depth: link.depth,
          role: link.role,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null),
  };
}
