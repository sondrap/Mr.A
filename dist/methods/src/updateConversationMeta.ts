import { auth, db } from '@mindstudio-ai/agent';
import { Conversations } from './tables/conversations';

// Called by the frontend to update title/lastMessage metadata on a conversation.
// Used after platform thread auto-titling and after each new message.
export async function updateConversationMeta(input: {
  id: string;
  title?: string;
  lastMessagePreview?: string;
  archived?: boolean;
}) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const convo = await Conversations.get(input.id);
  if (!convo) throw new Error('Conversation not found.');
  if (convo.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Conversation not found.');
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim() || convo.title;
  if (input.lastMessagePreview !== undefined) {
    patch.lastMessagePreview = input.lastMessagePreview.slice(0, 280);
    patch.lastMessageAt = db.now();
  }
  if (input.archived !== undefined) patch.archived = input.archived;

  const updated = await Conversations.update(input.id, patch);
  return { conversation: updated };
}
