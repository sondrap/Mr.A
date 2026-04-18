import { db } from '@mindstudio-ai/agent';

// Top of the ontology. 4 stable rows covering Travis's big-picture outcomes.
// Concepts tag to one or more North Stars for strategic framing.
//
// `slug` is the user-controlled stable identifier (e.g. SERVE_NO_MASTER). The system `id`
// column (auto-UUID) is used for internal FK references where needed, but we query by slug
// almost everywhere since that's the human-meaningful name.
interface NorthStar {
  slug: string;              // SCREAMING_SNAKE_CASE — user-controlled stable ID (unique)
  name: string;              // Display name
  description: string;       // One to two paragraphs
  aliases: string[];         // Phrases students or Travis might use
}

export const NorthStars = db.defineTable<NorthStar>('north_stars', {
  unique: [['slug']],
  defaults: { aliases: [] },
});
