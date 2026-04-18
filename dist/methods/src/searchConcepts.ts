import { auth } from '@mindstudio-ai/agent';
import { Concepts } from './tables/concepts';

// Agent tool: fuzzy search concepts by name, alias, or description.
export async function searchConcepts(input: { query: string; tags?: string[]; limit?: number }) {
  auth.requireRole('student', 'admin');

  const queryLower = input.query.trim().toLowerCase();
  if (!queryLower) return { concepts: [] };

  const tagFilter = (input.tags ?? []).map((t) => t.toLowerCase());
  const limit = input.limit ?? 5;

  const allConcepts = await Concepts.toArray();

  const scored = allConcepts
    .filter((c) => tagFilter.length === 0 || tagFilter.some((t) => c.tags.map((ct) => ct.toLowerCase()).includes(t)))
    .map((c) => {
      const nameHit = c.name.toLowerCase().includes(queryLower) ? 10 : 0;
      const slugHit = c.slug.toLowerCase().includes(queryLower) ? 8 : 0;
      const aliasHit = c.aliases.some((a) => a.toLowerCase().includes(queryLower)) ? 6 : 0;
      const descHit = c.description.toLowerCase().includes(queryLower) ? 2 : 0;
      return { concept: c, score: nameHit + slugHit + aliasHit + descHit };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      slug: s.concept.slug,
      name: s.concept.name,
      summary: s.concept.description.split('\n')[0].slice(0, 280),
      tags: s.concept.tags,
      aliases: s.concept.aliases.slice(0, 3),
    }));

  return { concepts: scored };
}
