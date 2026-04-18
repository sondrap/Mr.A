import { auth } from '@mindstudio-ai/agent';
import { Skills } from './tables/skills';

// Agent tool: fuzzy search skills by name or alias.
export async function searchSkills(input: { query: string; limit?: number }) {
  auth.requireRole('student', 'admin');

  const queryLower = input.query.trim().toLowerCase();
  if (!queryLower) return { skills: [] };

  const limit = input.limit ?? 5;
  const allSkills = await Skills.toArray();

  const scored = allSkills
    .map((s) => {
      const nameHit = s.name.toLowerCase().includes(queryLower) ? 10 : 0;
      const slugHit = s.slug.toLowerCase().includes(queryLower) ? 8 : 0;
      const aliasHit = s.aliases.some((a) => a.toLowerCase().includes(queryLower)) ? 6 : 0;
      const descHit = s.description.toLowerCase().includes(queryLower) ? 2 : 0;
      return { skill: s, score: nameHit + slugHit + aliasHit + descHit };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      slug: s.skill.slug,
      name: s.skill.name,
      summary: s.skill.description.split('\n')[0].slice(0, 280),
      conceptSlugs: s.skill.conceptSlugs,
      aliases: s.skill.aliases.slice(0, 3),
    }));

  return { skills: scored };
}
