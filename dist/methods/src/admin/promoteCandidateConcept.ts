import { auth, db } from '@mindstudio-ai/agent';
import { CandidateConcepts } from '../tables/ontology_candidates';
import { Concepts } from '../tables/concepts';

// Admin: promote a candidate concept into the real concepts table.
export async function promoteCandidateConcept(input: {
  candidateId: string;
  slug?: string;
  name?: string;
  description?: string;
  northStarSlugs?: string[];
  tags?: string[];
}) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const candidate = await CandidateConcepts.get(input.candidateId);
  if (!candidate) throw new Error('Candidate not found.');
  if (candidate.status !== 'pending') throw new Error('Already processed.');

  const newSlug = (input.slug ?? candidate.suggestedSlug).toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  await Concepts.push({
    slug: newSlug,
    name: input.name ?? candidate.suggestedName,
    description: input.description ?? candidate.suggestedDescription,
    northStarSlugs: input.northStarSlugs ?? [],
    aliases: [],
    tags: input.tags ?? [],
  });

  await CandidateConcepts.update(input.candidateId, {
    status: 'promoted',
    reviewedByUserId: auth.userId,
    reviewedAt: db.now(),
  });

  return { promoted: true, newConceptSlug: newSlug };
}
