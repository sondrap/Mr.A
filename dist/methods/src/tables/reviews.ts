import { db } from '@mindstudio-ai/agent';

// Adversarial review outcomes. One row per review pass over an artifact or concept_sources link.
// Stored separately from the reviewed entity so we have full audit history and can tune prompts.
interface Review {
  entityType: 'artifact' | 'concept_link' | 'concept_candidate';
  entityId: string;                          // FK to artifacts.id or concept_sources.id or similar
  verdict: 'pass' | 'revise' | 'surface_issues';
  issues: string[];                          // Specific concerns
  suggestedRevisions: string[];
  modelUsed: string;                         // e.g. 'gemini-3-flash'
  costCents?: number;                        // For telemetry
  attempt: number;                           // 1 for first review, 2 if regeneration triggered another review
}

export const Reviews = db.defineTable<Review>('reviews');
