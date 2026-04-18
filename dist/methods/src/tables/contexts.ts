import { db } from '@mindstudio-ai/agent';

// The courses/programs where Travis teaches this material. Every source chunk belongs to a Context.
interface LearningContext {
  slug: string;                    // SCREAMING_SNAKE_CASE — unique (e.g. CDODU, PSM, BDTS)
  name: string;                    // Full display name
  description: string;
  aliases: string[];               // Alternate names Travis uses
  kajabiProductSlug?: string;      // Optional
}

export const Contexts = db.defineTable<LearningContext>('contexts', {
  unique: [['slug']],
  defaults: { aliases: [] },
});
