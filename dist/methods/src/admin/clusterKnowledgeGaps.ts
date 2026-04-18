import { auth, mindstudio } from '@mindstudio-ai/agent';
import { KnowledgeGaps } from '../tables/knowledge_gaps';
import { MODEL_CONFIGS } from '../common/models';

// Admin-triggered: run the normalized-tag generator over all untagged knowledge gaps.
// Cheap model (gpt-4.1-nano). One call per gap. Fire-and-forget in batches of 10.
export async function clusterKnowledgeGaps() {
  auth.requireRole('admin');

  const untagged = await KnowledgeGaps
    .filter((g) => g.resolved === false && (g.normalizedTag === null || g.normalizedTag === ''))
    .take(100);                                     // Cap per run

  if (untagged.length === 0) {
    return { tagged: 0, message: 'No untagged gaps to cluster.' };
  }

  let successCount = 0;

  // Process in parallel batches of 10
  for (let i = 0; i < untagged.length; i += 10) {
    const batch = untagged.slice(i, i + 10);
    await Promise.all(batch.map(async (gap) => {
      try {
        const result = await mindstudio.generateText({
          message: gap.question,
          modelOverride: {
            ...MODEL_CONFIGS.TAG_GENERATOR,
            preamble:
              'You are a question-classifier. Given a student question about marketing, sales, or partnerships, ' +
              'output a short kebab-case tag capturing the core topic (3-5 words max).\n\n' +
              'Examples:\n' +
              '- "How do I write a cold email to SaaS founders?" → cold-email-saas\n' +
              '- "When should I send my T1 vs T2?" → t1-t2-timing\n' +
              '- "How do I handle a refund request?" → refund-handling\n' +
              '- "My niche is too broad, how do I narrow it?" → niche-sharpening\n\n' +
              'Output ONLY the tag. No prose, no punctuation beyond kebab-case dashes, no quotes.',
          },
        });
        const tag = (result.content ?? '').trim().toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 60);
        if (tag) {
          await KnowledgeGaps.update(gap.id, { normalizedTag: tag });
          successCount += 1;
        }
      } catch (err) {
        console.error(`Failed to tag gap ${gap.id}:`, err);
      }
    }));
  }

  return { tagged: successCount, total: untagged.length };
}
