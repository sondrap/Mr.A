import { auth } from '@mindstudio-ai/agent';
import { KnowledgeGaps } from '../tables/knowledge_gaps';

// Admin Knowledge Gaps panel. Returns gaps grouped by normalizedTag (clustered) or flat.
export async function listKnowledgeGaps(input: {
  grouped?: boolean;
  includeResolved?: boolean;
} = {}) {
  auth.requireRole('admin');

  const grouped = input.grouped ?? true;
  const includeResolved = input.includeResolved ?? false;

  const gaps = await KnowledgeGaps
    .filter((g) => includeResolved ? true : g.resolved === false)
    .sortBy((g) => g.created_at).reverse();

  if (!grouped) {
    return { clusters: null, gaps };
  }

  // Cluster by normalizedTag. Null tags go into a special "unclustered" bucket.
  const clusters = new Map<string, {
    tag: string;
    count: number;
    sampleQuestion: string;
    mostRecent: number;
    gapIds: string[];
  }>();

  for (const gap of gaps) {
    const tag = gap.normalizedTag ?? '__unclustered__';
    const existing = clusters.get(tag);
    if (existing) {
      existing.count += 1;
      existing.gapIds.push(gap.id);
      if (gap.created_at > existing.mostRecent) {
        existing.mostRecent = gap.created_at;
      }
    } else {
      clusters.set(tag, {
        tag,
        count: 1,
        sampleQuestion: gap.question.slice(0, 240),
        mostRecent: gap.created_at,
        gapIds: [gap.id],
      });
    }
  }

  const sorted = Array.from(clusters.values()).sort((a, b) => b.count - a.count);

  return { clusters: sorted, gaps };
}
