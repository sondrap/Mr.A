import { db } from '@mindstudio-ai/agent';

// Logged when Mr. A or a workflow agent can't ground an answer in the library.
// The admin console's Content tab surfaces these clustered by normalizedTag so admins
// see patterns not individual questions.
interface KnowledgeGap {
  userId: string;
  question: string;                          // Student's question (verbatim, redacted server-side)
  searchQueries: string[];                   // Queries Mr. A tried that came up empty
  projectId?: string | null;
  conversationId?: string | null;
  normalizedTag?: string | null;             // e.g. 'cold-email-saas' — set async by tag-generator
  resolved: boolean;
  resolvedByUserId?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: number | null;
}

export const KnowledgeGaps = db.defineTable<KnowledgeGap>('knowledge_gaps', {
  defaults: {
    resolved: false,
    searchQueries: [],
  },
});
