// Typed RPC client to the MRA backend. Export names match the camelCase method exports in
// dist/methods/src/*.ts. The MindStudio SDK maps these to the manifest's kebab-case ids
// automatically.

import { createClient, createAgentChatClient, auth, platform } from '@mindstudio-ai/interface';

import type { CitationChip } from './types';

export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
  displayName?: string;
  avatarUrl?: string;
  onboardedAt: number | null;
  recommendationsOptOut: boolean;
  createdAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  partnerName?: string;
  niche?: string;
  status: 'active' | 'archived';
  createdAt: number;
  lastActivityAt: number;
  threadCount: number;
  workflowCount: number;
  artifactCount: number;
  activeWorkflowSlug: string | null;
}

export interface ActivityItem {
  kind: 'thread' | 'artifact' | 'workflow';
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  updatedAt: number;
  subtitle?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  partnerName?: string;
  niche?: string;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
  lastActivityAt?: number;
}

export interface WorkflowRun {
  id: string;
  userId: string;
  projectId: string;
  workflowSlug: string;
  status: 'draft' | 'generating' | 'reviewing' | 'revising' | 'ready' | 'flagged' | 'complete';
  currentStep: number;
  totalSteps: number;
  state: Record<string, unknown>;
  lastStreamMessage?: string;
  generationStartedAt?: number;
  lastError?: string;
  created_at: number;
  updated_at: number;
}

export interface Artifact {
  id: string;
  userId: string;
  projectId: string;
  workflowRunId?: string;
  stepIndex?: number;
  type: string;
  title: string;
  body: string;
  bodyFormat: 'markdown' | 'json';
  version: number;
  reviewVerdict?: 'pass' | 'revise' | 'surface_issues' | null;
  reviewIssues?: string[];
  reviewSuggestions?: string[];
  citedSourceIds?: string[];
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface Conversation {
  id: string;
  userId: string;
  projectId?: string | null;
  agentThreadId: string;
  title: string;
  lastMessageAt?: number;
  lastMessagePreview?: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface WorkflowCatalogItem {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  totalSteps: number;
  unlocked: boolean;
  accentLabel: string | null;
}

export interface NorthStarRow {
  slug: string;
  name: string;
  description: string;
}

export interface SourceDetail {
  id: string;
  contextSlug: string;
  contextName: string;
  contentId: string;
  contentName: string;
  format: string;
  chunkHeading: string;
  description: string;
  body: string;
  locator: string | null;
  timestampStart?: number | null;
  timestampStartFormatted?: string | null;
  timestampEnd?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  linkUrl?: string;
}

export interface SourceSidePanelResponse {
  source: SourceDetail;
  relatedConcepts: Array<{
    slug: string;
    name: string;
    depth: number;
    role: string;
  }>;
}

// RPC type definition — matches method exports in dist/methods/src/
interface ApiMethods {
  getCurrentUser(): Promise<{ user: CurrentUser | null }>;
  completeOnboarding(input: { displayName?: string }): Promise<{ user: Partial<CurrentUser> }>;
  setRecommendationsOptOut(input: { optOut: boolean }): Promise<{ optOut: boolean }>;

  getDashboard(): Promise<{
    user: { id: string; email: string; roles: string[]; displayName?: string; onboardedAt: number | null } | null;
    projects: ProjectSummary[];
    recentActivity: ActivityItem[];
  }>;
  createProject(input: { name: string; partnerName?: string; niche?: string }): Promise<{ project: Project }>;
  getProject(input: { projectId: string }): Promise<{
    project: Project;
    workflowRuns: WorkflowRun[];
    artifacts: Artifact[];
    conversations: Conversation[];
  }>;
  updateProject(input: {
    projectId: string;
    name?: string;
    partnerName?: string;
    niche?: string;
    status?: 'active' | 'archived';
  }): Promise<{ project: Project }>;

  listWorkflows(): Promise<{ workflows: WorkflowCatalogItem[] }>;
  startWorkflow(input: { projectId: string; workflowSlug: string }): Promise<{ run: WorkflowRun; alreadyStarted: boolean }>;
  getWorkflowRun(input: { runId: string }): Promise<{ run: WorkflowRun; project: Project; artifacts: Artifact[] }>;
  runWorkflowStep(input: { runId: string; stepIndex: number; studentInput?: Record<string, unknown> }): Promise<{ status: string; runId: string; stepIndex: number }>;
  advanceWorkflowStep(input: { runId: string }): Promise<{ run: WorkflowRun; complete: boolean }>;
  goToWorkflowStep(input: { runId: string; stepIndex: number }): Promise<{ run: WorkflowRun }>;
  saveArtifactDraft(input: { id: string; body: string; title?: string }): Promise<{ artifact: Artifact }>;

  listConversations(input: { projectId?: string | null }): Promise<{ conversations: Conversation[] }>;
  registerConversation(input: { agentThreadId: string; projectId?: string | null; title?: string }): Promise<{ conversation: Conversation }>;
  updateConversationMeta(input: { id: string; title?: string; lastMessagePreview?: string; archived?: boolean }): Promise<{ conversation: Conversation }>;

  transcribeVoiceInput(input: { audioUrl: string }): Promise<{ text: string }>;
  synthesizeVoiceOutput(input: { text: string }): Promise<{ audioUrl: string }>;

  listNorthStars(): Promise<{ northStars: NorthStarRow[] }>;
  getSource(input: { id: string }): Promise<SourceSidePanelResponse>;

  // Admin
  getAdminStats(): Promise<{
    users: { total: number; approved: number; activeLast7d: number; newLast24h: number };
    library: { sources: number; conceptLinks: number; contexts: number; knowledgeGaps: number; candidateConcepts: number };
    recentIngestionJobs: Array<{ id: string; status: string; startedAt: number; completedAt?: number; totalFiles: number; totalChunks: number }>;
  }>;
  listUsers(input?: { searchEmail?: string }): Promise<{
    users: Array<{
      id: string;
      email: string;
      displayName?: string;
      roles: string[];
      grantedBy: string | null;
      grantedAt: number | null;
      grantNote: string | null;
      grantRevoked: boolean;
      lastActiveAt: number;
      createdAt: number;
    }>;
  }>;
  grantAccessAdmin(input: { email: string; plan?: 'full' | 'free'; note?: string }): Promise<unknown>;
  revokeAccessAdmin(input: { email: string; reason?: string }): Promise<unknown>;
  listIngestionJobs(input?: { limit?: number }): Promise<{ jobs: Array<{ id: string; status: string; startedAt: number; completedAt?: number; totalFiles: number; totalChunks: number; processedChunks: number; linkedChunks: number; errors: unknown[] }> }>;
  listKnowledgeGaps(input?: { grouped?: boolean; includeResolved?: boolean }): Promise<{
    clusters: Array<{ tag: string; count: number; sampleQuestion: string; mostRecent: number; gapIds: string[] }> | null;
    gaps: Array<{ id: string; question: string; normalizedTag?: string | null; created_at: number; resolved: boolean }>;
  }>;
  resolveKnowledgeGap(input: { gapIds: string[]; note: string }): Promise<{ resolvedCount: number }>;
  clusterKnowledgeGaps(): Promise<{ tagged: number; total?: number }>;
  listCandidateConcepts(input?: { status?: 'pending' | 'promoted' | 'dismissed' }): Promise<{ candidates: Array<{ id: string; suggestedSlug: string; suggestedName: string; suggestedDescription: string; evidence: string; timesObserved: number; status: string }> }>;
  promoteCandidateConcept(input: { candidateId: string; slug?: string; name?: string; description?: string; northStarSlugs?: string[]; tags?: string[] }): Promise<{ promoted: boolean; newConceptSlug: string }>;
  dismissCandidateConcept(input: { candidateId: string }): Promise<{ dismissed: boolean }>;
  listOntology(): Promise<{
    northStars: Array<{ slug: string; name: string; description: string }>;
    concepts: Array<{ slug: string; name: string; description: string; tags: string[]; sourceCount: number; isIncomplete: boolean }>;
    skills: Array<{ slug: string; name: string; description: string; conceptSlugs: string[]; isIncomplete: boolean }>;
    contexts: Array<{ slug: string; name: string; description: string; sourceCount: number }>;
  }>;
}

export const api = createClient<ApiMethods>();
export const agentChat = createAgentChatClient();
export { auth, platform };
export type { CitationChip };
