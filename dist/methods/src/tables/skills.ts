import { db } from '@mindstudio-ai/agent';

// Capabilities a student puts into practice. Each workflow step maps one-to-one to a Skill.
// A skill uses one or more Concepts as its theoretical underpinning.
interface Skill {
  slug: string;                    // SCREAMING_SNAKE_CASE — unique
  name: string;
  description: string;
  conceptSlugs: string[];          // Foreign-key-by-slug into concepts
  aliases: string[];
}

export const Skills = db.defineTable<Skill>('skills', {
  unique: [['slug']],
  defaults: {
    conceptSlugs: [],
    aliases: [],
  },
});
