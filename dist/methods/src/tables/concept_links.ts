import { db } from '@mindstudio-ai/agent';

// Many-to-many link between concepts and sources with depth rating.
//
// Uniqueness is enforced via a single computed composite key `linkKey = {conceptSlug}::{sourceId}`.
// Single-column unique constraint works around schema-sync edge cases with compound uniques in dev.
interface ConceptSource {
  linkKey: string;                             // Computed composite key: `${conceptSlug}::${sourceId}`
  conceptSlug: string;                         // FK to concepts.slug
  sourceId: string;                            // FK to sources.id (system UUID)
  depth: number;                               // 1-5. 5 = primary teaching. 3 = applied example. 1 = passing reference.
  role: 'primary_teaching' | 'applied_example' | 'reference_mention';
  extract?: string;
}

export const ConceptSources = db.defineTable<ConceptSource>('concept_links', {
  unique: [['linkKey']],
});

export function conceptSourceLinkKey(conceptSlug: string, sourceId: string): string {
  return `${conceptSlug}::${sourceId}`;
}
