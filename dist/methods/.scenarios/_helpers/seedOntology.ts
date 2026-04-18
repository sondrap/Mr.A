// Scenario helper: seed the four-layer ontology (north_stars, concepts, skills, contexts)
// from the user-provided JSON. Idempotent via upserts on slug.
//
// We import the JSON directly (via TypeScript's resolveJsonModule) rather than reading
// from disk — this bundles the data into the compiled scenario so it works in deployment
// where the file system layout may differ from local.

import { db } from '@mindstudio-ai/agent';
import { NorthStars } from '../../src/tables/north_stars';
import { Concepts } from '../../src/tables/concepts';
import { Skills } from '../../src/tables/skills';
import { Contexts } from '../../src/tables/contexts';
import ontologyData from '../_seed/ontology.json';

interface OntologyJson {
  version: number;
  north_stars: Array<{ id: string; name: string; description: string; aliases?: string[] }>;
  concepts: Array<{
    id: string;
    name: string;
    description: string;
    north_star_ids?: string[];
    aliases?: string[];
  }>;
  skills: Array<{
    id: string;
    name: string;
    description: string;
    concept_ids?: string[];
    aliases?: string[];
  }>;
  contexts: Array<{ id: string; name: string; description: string; aliases?: string[] }>;
}

export async function seedOntology() {
  const data = ontologyData as OntologyJson;

  await db.batch(
    ...data.north_stars.map((n) =>
      NorthStars.upsert('slug', {
        slug: n.id,
        name: n.name,
        description: n.description,
        aliases: n.aliases ?? [],
      })
    )
  );

  await db.batch(
    ...data.contexts.map((c) =>
      Contexts.upsert('slug', {
        slug: c.id,
        name: c.name,
        description: c.description,
        aliases: c.aliases ?? [],
      })
    )
  );

  const conceptsSeen = new Set<string>();
  const uniqueConcepts = data.concepts.filter((c) => {
    if (conceptsSeen.has(c.id)) return false;
    conceptsSeen.add(c.id);
    return true;
  });
  await db.batch(
    ...uniqueConcepts.map((c) =>
      Concepts.upsert('slug', {
        slug: c.id,
        name: c.name,
        description: c.description,
        northStarSlugs: c.north_star_ids ?? [],
        aliases: c.aliases ?? [],
        tags: [],
      })
    )
  );

  const skillsSeen = new Set<string>();
  const uniqueSkills = data.skills.filter((s) => {
    if (skillsSeen.has(s.id)) return false;
    skillsSeen.add(s.id);
    return true;
  });
  await db.batch(
    ...uniqueSkills.map((s) =>
      Skills.upsert('slug', {
        slug: s.id,
        name: s.name,
        description: s.description,
        conceptSlugs: s.concept_ids ?? [],
        aliases: s.aliases ?? [],
      })
    )
  );

  return {
    northStars: data.north_stars.length,
    concepts: uniqueConcepts.length,
    skills: uniqueSkills.length,
    contexts: data.contexts.length,
  };
}
