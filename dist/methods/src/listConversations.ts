import { auth } from '@mindstudio-ai/agent';
import { Conversations } from './tables/conversations';

// List Mr. A Chat threads for the current user, optionally scoped to a project.
// Returns the project-scoped threads if projectId is provided, or ALL the user's non-archived threads.
export async function listConversations(input: { projectId?: string | null }) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const userId = auth.userId;
  const projectFilter = input.projectId === undefined ? null : input.projectId;

  const conversations = await Conversations
    .filter((c) => {
      if (c.userId !== userId) return false;
      if (c.archived) return false;
      if (projectFilter === null) return true;                            // all threads
      return c.projectId === projectFilter;
    })
    .sortBy((c) => c.updated_at)
    .reverse();

  return {
    conversations: conversations.map((c) => ({
      id: c.id,
      agentThreadId: c.agentThreadId,
      title: c.title,
      projectId: c.projectId,
      lastMessageAt: c.lastMessageAt ?? c.updated_at,
      lastMessagePreview: c.lastMessagePreview,
    })),
  };
}
