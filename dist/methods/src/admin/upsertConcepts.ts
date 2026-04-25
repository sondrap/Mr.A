import { db, auth } from '@mindstudio-ai/agent';
import { Concepts } from '../tables/concepts';

// Bulk upsert concepts. Used to manually seed missing core concepts that
// the auto-extraction pipeline didn't catch. Idempotent — safe to re-run.
export async function upsertConcepts(input: {
  concepts: Array<{
    slug: string;
    name: string;
    description: string;
    northStarSlugs?: string[];
    aliases?: string[];
    essence?: string;
    flavor?: 'philosophical' | 'tactical' | 'both';
    tags?: string[];
  }>;
}) {
  auth.requireRole('admin');

  if (!Array.isArray(input.concepts) || input.concepts.length === 0) {
    throw new Error('Provide at least one concept to upsert.');
  }

  // Validate shape up front — fail fast if any concept is malformed.
  for (const c of input.concepts) {
    if (!c.slug || !c.name || !c.description) {
      throw new Error(`Concept missing required field (slug/name/description): ${JSON.stringify(c)}`);
    }
    if (!/^[A-Z0-9_]+$/.test(c.slug)) {
      throw new Error(`Invalid slug "${c.slug}" — must be SCREAMING_SNAKE_CASE`);
    }
  }

  // Batch all upserts. Each upsert is idempotent on slug.
  const mutations = input.concepts.map((c) =>
    Concepts.upsert('slug', {
      slug: c.slug,
      name: c.name,
      description: c.description,
      northStarSlugs: c.northStarSlugs ?? [],
      aliases: c.aliases ?? [],
      essence: c.essence,
      flavor: c.flavor ?? 'both',
      tags: c.tags ?? [],
    })
  );

  const results = await db.batch(...mutations);

  return {
    upserted: results.length,
    slugs: results.map((r) => (r as { slug: string }).slug),
  };
}
