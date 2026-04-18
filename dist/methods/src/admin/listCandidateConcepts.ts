import { auth } from '@mindstudio-ai/agent';
import { CandidateConcepts } from '../tables/ontology_candidates';

// Admin: list candidate concepts surfaced by the concept-linker but not yet promoted or dismissed.
export async function listCandidateConcepts(input: { status?: 'pending' | 'promoted' | 'dismissed' } = {}) {
  auth.requireRole('admin');
  const statusFilter = input.status ?? 'pending';
  const candidates = await CandidateConcepts
    .filter((c) => c.status === statusFilter)
    .sortBy((c) => c.timesObserved).reverse();
  return { candidates };
}
