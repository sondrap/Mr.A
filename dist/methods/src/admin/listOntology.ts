import { auth, db } from '@mindstudio-ai/agent';
import { NorthStars } from '../tables/north_stars';
import { Concepts } from '../tables/concepts';
import { Skills } from '../tables/skills';
import { Contexts } from '../tables/contexts';
import { ConceptSources } from '../tables/concept_links';
import { Sources } from '../tables/sources';

// Admin Ontology tab: view all 4 layers with stats.
export async function listOntology() {
  auth.requireRole('admin');

  // Split into two batches of 3 to stay within tuple-inference overloads
  const [northStars, concepts, skills] = await db.batch(
    NorthStars.sortBy((n) => n.name),
    Concepts.sortBy((c) => c.name),
    Skills.sortBy((s) => s.name)
  );
  const [contexts, allLinks, allSources] = await db.batch(
    Contexts.sortBy((c) => c.name),
    ConceptSources.toArray(),
    Sources.toArray()
  );

  // Counts per concept / per context
  const linksByConceptSlug = new Map<string, number>();
  for (const link of allLinks) {
    linksByConceptSlug.set(link.conceptSlug, (linksByConceptSlug.get(link.conceptSlug) ?? 0) + 1);
  }
  const sourcesByContextSlug = new Map<string, number>();
  for (const src of allSources) {
    sourcesByContextSlug.set(src.contextSlug, (sourcesByContextSlug.get(src.contextSlug) ?? 0) + 1);
  }

  return {
    northStars,
    concepts: concepts.map((c) => ({
      ...c,
      sourceCount: linksByConceptSlug.get(c.slug) ?? 0,
      isIncomplete: !c.description || c.description.length < 20,
    })),
    skills: skills.map((s) => ({
      ...s,
      isIncomplete: !s.description || s.description.length < 20,
    })),
    contexts: contexts.map((c) => ({
      ...c,
      sourceCount: sourcesByContextSlug.get(c.slug) ?? 0,
    })),
  };
}
