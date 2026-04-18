import { db } from '@mindstudio-ai/agent';

// Concrete deliverables produced by workflow steps: niche docs, prospect lists,
// video outlines, Skool setup plans, T1/T2/T3 packs, conversation logs.
// Body shape varies by type — text artifacts use markdown, structured ones use JSON-stringified data.
export type ArtifactType =
  | 'niche_doc'
  | 'prospect_list'
  | 'attraction_video'
  | 'skool_setup'
  | 'outreach_pack'
  | 'conversation_log'
  | 'notes'
  | 'custom';

interface Artifact {
  userId: string;
  projectId: string;
  workflowRunId?: string;                    // Which workflow run produced this, if any
  stepIndex?: number;                        // Which step of that run
  type: ArtifactType;
  title: string;
  body: string;                              // Markdown for text artifacts, JSON string for structured
  bodyFormat: 'markdown' | 'json';
  version: number;                           // Incremented on each edit or regeneration

  // Adversarial review surfacing
  reviewVerdict?: 'pass' | 'revise' | 'surface_issues' | null;
  reviewIssues?: string[];                   // When verdict is surface_issues, these are shown to student
  reviewSuggestions?: string[];              // Suggested revisions for each issue

  // Citation metadata
  citedSourceIds?: string[];                 // Source chunks this artifact drew from

  archived: boolean;
}

export const Artifacts = db.defineTable<Artifact>('artifacts', {
  defaults: {
    version: 1,
    archived: false,
    bodyFormat: 'markdown',
  },
});
