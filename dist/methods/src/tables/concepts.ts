import { db } from '@mindstudio-ai/agent';

// The frameworks and ideas Travis teaches. Linked to source chunks via concept_sources.
// `slug` is the user-controlled stable ID (e.g. GIVING_FUNNEL).
interface Concept {
  slug: string;                    // SCREAMING_SNAKE_CASE — unique
  name: string;
  description: string;             // One to two paragraphs. Written in Mr. A's voice.
  northStarSlugs: string[];        // Foreign-key-by-slug into north_stars
  aliases: string[];               // Phrases / vernacular
  essence?: string;                // Optional markdown: "What it is" / "When to use"
  flavor?: 'philosophical' | 'tactical' | 'both';
  tags: string[];                  // Category tags: outreach, psychology, offer, partnership, mindset
}

export const Concepts = db.defineTable<Concept>('concepts', {
  unique: [['slug']],
  defaults: {
    flavor: 'both',
    tags: [],
    aliases: [],
    northStarSlugs: [],
  },
});
