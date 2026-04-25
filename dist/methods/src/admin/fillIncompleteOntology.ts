// One-shot admin tool: walks every concept and skill that has a missing or thin
// description, looks at the source chunks the linker attached to it, and uses
// an LLM grounded in those chunks to write a proper Travis-style description.
//
// Returns a summary of what was filled in. Re-runnable safely — only touches
// entries that are still incomplete after each pass.

import { auth, mindstudio } from '@mindstudio-ai/agent';
import { Concepts } from '../tables/concepts';
import { Skills } from '../tables/skills';
import { ConceptSources } from '../tables/concept_links';
import { Sources } from '../tables/sources';

const MIN_DESCRIPTION_LEN = 30;

function isIncomplete(desc: string | undefined | null): boolean {
  return !desc || desc.trim().length < MIN_DESCRIPTION_LEN;
}

async function gatherChunkContext(
  slug: string,
  name: string,
  aliases: string[],
): Promise<{
  totalLinks: number;
  chunks: Array<{ heading: string; description: string; bodyExcerpt: string; contextSlug: string }>;
}> {
  // PRIMARY: Find concept_links that reference this slug
  const links = await ConceptSources
    .filter((cl) => cl.conceptSlug === slug)
    .sortBy((cl) => cl.depth ?? 0)
    .reverse()
    .take(8);

  if (links.length > 0) {
    const chunks = await Promise.all(
      links.map(async (l) => {
        const src = await Sources.get(l.sourceId);
        if (!src) return null;
        return {
          heading: src.chunkHeading || '',
          description: src.description || '',
          bodyExcerpt: (src.body || '').slice(0, 600),
          contextSlug: src.contextSlug,
        };
      })
    );
    return {
      totalLinks: links.length,
      chunks: chunks.filter((c): c is NonNullable<typeof c> => c !== null),
    };
  }

  // FALLBACK: No concept_links yet — search source bodies/headings/descriptions
  // for the concept name and any aliases. This catches concepts the linker
  // hasn't yet attached but whose teaching still lives in the corpus.
  // Compile search terms — name plus aliases, lowercased, deduped, longer first.
  const searchTerms = Array.from(
    new Set([name, ...aliases].filter(Boolean).map((t) => t.toLowerCase()))
  ).sort((a, b) => b.length - a.length);

  if (searchTerms.length === 0) return { totalLinks: 0, chunks: [] };

  // Pull a generous set of candidate chunks — filter falls back to JS for .includes(),
  // so we cap fanout by limiting to the longest terms first and breaking on enough hits.
  const allSources = await Sources.toArray();
  const matched: Array<{ src: typeof allSources[number]; score: number }> = [];

  for (const src of allSources) {
    const haystack = `${src.chunkHeading} ${src.description} ${src.body}`.toLowerCase();
    let score = 0;
    for (const term of searchTerms) {
      if (haystack.includes(term)) score += term.length;
    }
    if (score > 0) matched.push({ src, score });
    if (matched.length > 50) break; // soft cap
  }

  matched.sort((a, b) => b.score - a.score);
  const top = matched.slice(0, 8);

  return {
    totalLinks: top.length,
    chunks: top.map(({ src }) => ({
      heading: src.chunkHeading || '',
      description: src.description || '',
      bodyExcerpt: (src.body || '').slice(0, 600),
      contextSlug: src.contextSlug,
    })),
  };
}

async function generateDescription(
  layerName: 'concept' | 'skill',
  slug: string,
  name: string,
  chunks: Array<{ heading: string; description: string; bodyExcerpt: string; contextSlug: string }>,
): Promise<string | null> {
  if (chunks.length === 0) return null;

  // Build a tight prompt from the source material the linker matched
  const sourceMaterial = chunks
    .map(
      (c, i) => `--- Source ${i + 1} (from ${c.contextSlug}) ---
Heading: ${c.heading}
Linker note: ${c.description}
Excerpt: ${c.bodyExcerpt}`,
    )
    .join('\n\n');

  const promptByLayer = {
    concept: `Write a 1-2 sentence definition of the Travis Sago ${layerName} called "${name}" (slug: ${slug}). Ground every claim in the source material below. Capture what it IS, what makes it distinct, and (if applicable) the specific framework or principle it represents. Use Travis's voice: direct, plainspoken, no fluff.`,
    skill: `Write a 1-2 sentence definition of the Travis Sago ${layerName} called "${name}" (slug: ${slug}). Skills are tactical do-this-thing-right-now moves. Ground every claim in the source material below. Lead with the action verb. Use Travis's voice: direct, plainspoken, no fluff.`,
  };

  const fullPrompt = `${promptByLayer[layerName]}

CRITICAL RULES:
- Do not include the slug or name in the definition — just write the definition body.
- 30-220 characters total. Tight. No "this concept describes" preamble.
- No emojis, no em dashes, no AI tells. Sound like a smart person who teaches this for a living.
- If the source material genuinely doesn't cover this, return exactly the string "INSUFFICIENT" so we can flag it for human review.

SOURCE MATERIAL:

${sourceMaterial}`;

  const result = await mindstudio.generateText({
    message: fullPrompt,
    modelOverride: {
      model: 'claude-4-6-sonnet',
      temperature: 0.2,
      maxResponseTokens: 200,
    },
  });

  const text = result.content?.trim();
  if (!text) return null;
  if (text === 'INSUFFICIENT' || text.includes('INSUFFICIENT')) return null;
  // Strip surrounding quotes the model sometimes adds
  return text.replace(/^["']|["']$/g, '').trim();
}

export async function fillIncompleteOntology(input: { dryRun?: boolean }) {
  auth.requireRole('admin');
  const dryRun = input.dryRun === true;

  const [allConcepts, allSkills] = await Promise.all([Concepts.toArray(), Skills.toArray()]);

  const incompleteConcepts = allConcepts.filter((c) => isIncomplete(c.description));
  const incompleteSkills = allSkills.filter((s) => isIncomplete(s.description));

  type Entry = { layer: 'concept' | 'skill'; id: string; slug: string; name: string; aliases: string[] };
  const queue: Entry[] = [
    ...incompleteConcepts.map((c) => ({ layer: 'concept' as const, id: c.id, slug: c.slug, name: c.name, aliases: c.aliases ?? [] })),
    ...incompleteSkills.map((s) => ({ layer: 'skill' as const, id: s.id, slug: s.slug, name: s.name, aliases: s.aliases ?? [] })),
  ];

  const results: Array<{
    layer: string;
    slug: string;
    name: string;
    status: 'filled' | 'no_sources' | 'insufficient' | 'failed';
    description?: string;
    sourceLinks?: number;
    error?: string;
  }> = [];

  // Process serially — these calls are quick and serializing keeps logs readable.
  for (const entry of queue) {
    try {
      const { totalLinks, chunks } = await gatherChunkContext(entry.slug, entry.name, entry.aliases);
      if (totalLinks === 0) {
        results.push({ ...entry, status: 'no_sources', sourceLinks: 0 });
        continue;
      }

      const description = await generateDescription(entry.layer, entry.slug, entry.name, chunks);
      if (!description) {
        results.push({ ...entry, status: 'insufficient', sourceLinks: totalLinks });
        continue;
      }

      if (!dryRun) {
        if (entry.layer === 'concept') {
          await Concepts.update(entry.id, { description });
        } else {
          await Skills.update(entry.id, { description });
        }
      }

      results.push({ ...entry, status: 'filled', sourceLinks: totalLinks, description });
    } catch (err) {
      results.push({
        ...entry,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    dryRun,
    summary: {
      total: queue.length,
      filled: results.filter((r) => r.status === 'filled').length,
      noSources: results.filter((r) => r.status === 'no_sources').length,
      insufficient: results.filter((r) => r.status === 'insufficient').length,
      failed: results.filter((r) => r.status === 'failed').length,
    },
    results,
  };
}
