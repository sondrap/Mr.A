import { auth } from '@mindstudio-ai/agent';
import { KnowledgeGaps } from './tables/knowledge_gaps';

// Agent tool: Mr. A calls this when he can't ground an answer in the library.
// Writes a row to knowledge_gaps. The normalizedTag is assigned later by an admin-triggered
// clustering job (see clusterKnowledgeGaps) so this call is fast and non-blocking.
export async function flagKnowledgeGap(input: {
  question: string;
  searchQueries: string[];
  projectId?: string;
  conversationId?: string;
}) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const question = input.question.trim();
  if (!question) throw new Error('Question is required.');

  const row = await KnowledgeGaps.push({
    userId: auth.userId,
    question,
    searchQueries: input.searchQueries ?? [],
    projectId: input.projectId ?? null,
    conversationId: input.conversationId ?? null,
    normalizedTag: null,
    resolved: false,
  });

  return { flagged: true, gapId: row.id };
}
