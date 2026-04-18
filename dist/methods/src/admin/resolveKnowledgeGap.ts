import { auth, db } from '@mindstudio-ai/agent';
import { KnowledgeGaps } from '../tables/knowledge_gaps';

// Admin: mark a knowledge gap (or a whole cluster) as resolved with a note.
export async function resolveKnowledgeGap(input: {
  gapIds: string[];
  note: string;
}) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const now = db.now();
  await db.batch(
    ...input.gapIds.map((id) =>
      KnowledgeGaps.update(id, {
        resolved: true,
        resolvedByUserId: auth.userId,
        resolutionNote: input.note,
        resolvedAt: now,
      })
    )
  );

  return { resolvedCount: input.gapIds.length };
}
