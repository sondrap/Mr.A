import { auth, db } from '@mindstudio-ai/agent';
import { Conversations } from './tables/conversations';
import { Projects } from './tables/projects';

// Called by the frontend after the platform agent-chat SDK creates a new thread.
// We wrap the platform's thread with our own Conversation row so we can tie it to a user + project.
//
// Idempotent on (userId, agentThreadId): if the thread is already registered, return the existing row.
export async function registerConversation(input: {
  agentThreadId: string;
  projectId?: string | null;
  title?: string;
}) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const userId = auth.userId;

  // If project-scoped, confirm the project belongs to this user
  if (input.projectId) {
    const project = await Projects.get(input.projectId);
    if (!project) throw new Error('Project not found.');
    if (project.userId !== userId && !auth.hasRole('admin')) {
      throw new Error('Project not found.');
    }
  }

  // Check for existing
  const existing = await Conversations.findOne(
    (c) => c.userId === userId && c.agentThreadId === input.agentThreadId
  );
  if (existing) return { conversation: existing };

  const convo = await Conversations.push({
    userId,
    agentThreadId: input.agentThreadId,
    projectId: input.projectId ?? null,
    title: input.title?.trim() || 'New thread',
    archived: false,
  });

  // Touch project's last-activity
  if (input.projectId) {
    await Projects.update(input.projectId, { lastActivityAt: db.now() });
  }

  return { conversation: convo };
}
