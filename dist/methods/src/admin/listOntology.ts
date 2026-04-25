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

  // Use groupBy to avoid pulling thousands of full source/link rows over the wire
  // just to count them. groupBy returns aggregate counts directly.
  const [northStars, concepts, skills] = await db.batch(
    NorthStars.sortBy((n) => n.name),
    Concepts.sortBy((c) => c.name),
    Skills.sortBy((s) => s.name)
  );
  const [contexts, linkGroups, sourceGroups] = await db.batch(
    Contexts.sortBy((c) => c.name),
    ConceptSources.groupBy((cl) => cl.conceptSlug),
    Sources.groupBy((s) => s.contextSlug)
  );

  // groupBy returns Record<key, count>. Convert to Maps for lookup.
  const linksByConceptSlug = new Map<string, number>(Object.entries(linkGroups));
  const sourcesByContextSlug = new Map<string, number>(Object.entries(sourceGroups));

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
