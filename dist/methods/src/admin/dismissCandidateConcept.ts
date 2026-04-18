import { auth, db } from '@mindstudio-ai/agent';
import { CandidateConcepts } from '../tables/ontology_candidates';

export async function dismissCandidateConcept(input: { candidateId: string }) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const candidate = await CandidateConcepts.get(input.candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  await CandidateConcepts.update(input.candidateId, {
    status: 'dismissed',
    reviewedByUserId: auth.userId,
    reviewedAt: db.now(),
  });

  return { dismissed: true };
}
