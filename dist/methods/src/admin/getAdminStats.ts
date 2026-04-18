import { auth, db } from '@mindstudio-ai/agent';
import { Users } from '../tables/users';
import { AccessGrants } from '../tables/access_grants';
import { Sources } from '../tables/sources';
import { ConceptSources } from '../tables/concept_links';
import { Contexts } from '../tables/contexts';
import { KnowledgeGaps } from '../tables/knowledge_gaps';
import { CandidateConcepts } from '../tables/ontology_candidates';
import { IngestionJobs } from '../tables/ingestion_jobs';

// Top-of-dashboard stats for the admin console. Single payload.
export async function getAdminStats() {
  auth.requireRole('admin');

  const [
    totalUsers,
    totalApproved,
    activeLast7d,
    newLast24h,
    totalSources,
    totalConceptLinks,
    totalContexts,
    openKnowledgeGaps,
    pendingCandidateConcepts,
    recentJobs,
  ] = await db.batch(
    Users.count(),
    AccessGrants.count((g) => g.plan === 'full' && g.revoked === false),
    Users.count((u) => u.updated_at > db.ago(db.days(7))),
    Users.count((u) => u.created_at > db.ago(db.days(1))),
    Sources.count(),
    ConceptSources.count(),
    Contexts.count(),
    KnowledgeGaps.count((g) => g.resolved === false),
    CandidateConcepts.count((c) => c.status === 'pending'),
    IngestionJobs.sortBy((j) => j.startedAt).reverse().take(5)
  );

  return {
    users: {
      total: totalUsers,
      approved: totalApproved,
      activeLast7d,
      newLast24h,
    },
    library: {
      sources: totalSources,
      conceptLinks: totalConceptLinks,
      contexts: totalContexts,
      knowledgeGaps: openKnowledgeGaps,
      candidateConcepts: pendingCandidateConcepts,
    },
    recentIngestionJobs: recentJobs,
  };
}
