import { db } from '@mindstudio-ai/agent';

// New concepts surfaced by the concept-linker that aren't in the ontology yet.
interface CandidateConcept {
  suggestedSlug: string;                     // SCREAMING_SNAKE_CASE suggestion
  suggestedName: string;
  suggestedDescription: string;
  evidence: string;
  foundInSourceId?: string;
  timesObserved: number;
  status: 'pending' | 'promoted' | 'dismissed';
  reviewedByUserId?: string | null;
  reviewedAt?: number | null;
}

export const CandidateConcepts = db.defineTable<CandidateConcept>('ontology_candidates', {
  unique: [['suggestedSlug']],
  defaults: {
    status: 'pending',
    timesObserved: 1,
  },
});
