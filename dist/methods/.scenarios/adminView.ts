import { db } from '@mindstudio-ai/agent';
import { Users } from '../src/tables/users';
import { AccessGrants } from '../src/tables/access_grants';
import { KnowledgeGaps } from '../src/tables/knowledge_gaps';
import { CandidateConcepts } from '../src/tables/ontology_candidates';
import { IngestionJobs } from '../src/tables/ingestion_jobs';
import { seedOntology } from './_helpers/seedOntology';
import { seedSampleContent } from './_helpers/seedSampleContent';

// Scenario: admin user with a populated admin console.
// Several approved users, a few ingestion jobs in history, open knowledge gaps, candidate concepts.
export async function adminView() {
  await seedOntology();
  await seedSampleContent();

  // The admin
  const admin = await Users.push({
    email: 'admin@example.com',
    roles: ['admin'],
    displayName: 'Sondra',
    onboardedAt: db.now() - db.days(30),
  });

  // A handful of approved users spread across realistic dates
  const demoUsers = [
    { email: 'jamie@example.com', name: 'Jamie', note: 'Paid annual — Order #A-1042' },
    { email: 'marin@example.com', name: 'Marin', note: 'Paid annual — Order #A-1039' },
    { email: 'kofi@example.com', name: 'Kofi', note: 'Paid annual — Order #A-1037' },
    { email: 'priya@example.com', name: 'Priya', note: 'Lifetime — Order #A-1030' },
    { email: 'diego@example.com', name: 'Diego', note: 'Paid annual — Order #A-1028' },
    { email: 'leah@example.com', name: 'Leah', note: 'Comp — team member' },
    { email: 'ren@example.com', name: 'Ren', note: 'Paid annual — Order #A-1012' },
  ];

  for (const [i, u] of demoUsers.entries()) {
    await Users.push({
      email: u.email,
      roles: ['student'],
      displayName: u.name,
      onboardedAt: db.now() - db.days(Math.min(25 - i * 3, 40)),
    });
    await AccessGrants.upsert('email', {
      email: u.email,
      plan: 'full',
      grantedBy: i === 5 ? 'admin' : 'payment_system',
      grantedByUserId: i === 5 ? admin.id : null,
      note: u.note,
      revoked: false,
      revokedAt: null,
      revokedReason: null,
    });
  }

  // A revoked user (refund)
  await Users.push({
    email: 'refunded@example.com',
    roles: ['free'],
    displayName: 'Quinn',
    onboardedAt: db.now() - db.days(45),
  });
  await AccessGrants.upsert('email', {
    email: 'refunded@example.com',
    plan: 'full',
    grantedBy: 'payment_system',
    grantedByUserId: null,
    note: 'Original Order #A-998',
    revoked: true,
    revokedAt: db.now() - db.days(10),
    revokedReason: 'Refund — Order #A-998',
  });

  // Ingestion history — a few completed jobs
  await IngestionJobs.push({
    source: 'api',
    triggeredByUserId: admin.id,
    status: 'completed',
    totalFiles: 12,
    processedFiles: 12,
    totalChunks: 148,
    processedChunks: 148,
    linkedChunks: 148,
    candidateConceptsSurfaced: 3,
    errors: [],
    startedAt: db.now() - db.days(7),
    completedAt: db.now() - db.days(7) + db.minutes(42),
  });

  await IngestionJobs.push({
    source: 'api',
    triggeredByUserId: admin.id,
    status: 'partial',
    totalFiles: 4,
    processedFiles: 4,
    totalChunks: 51,
    processedChunks: 50,
    linkedChunks: 48,
    candidateConceptsSurfaced: 1,
    errors: [
      {
        filename: 'BDTS-M03.md',
        chunkIndex: 7,
        code: 'malformed_chunk_heading',
        message: 'Could not parse: ## Chunk 7 — no colon separator',
      },
    ],
    startedAt: db.now() - db.days(3),
    completedAt: db.now() - db.days(3) + db.minutes(18),
  });

  await IngestionJobs.push({
    source: 'upload',
    triggeredByUserId: admin.id,
    status: 'completed',
    totalFiles: 1,
    processedFiles: 1,
    totalChunks: 6,
    processedChunks: 6,
    linkedChunks: 6,
    candidateConceptsSurfaced: 0,
    errors: [],
    startedAt: db.now() - db.hours(4),
    completedAt: db.now() - db.hours(4) + db.minutes(2),
  });

  // Knowledge gaps — realistic clustering
  const gapClusters: Array<{ tag: string; questions: string[] }> = [
    {
      tag: 'cold-email-saas',
      questions: [
        'how do I write a T1 email to a SaaS founder?',
        'travis\'s t1 template for SaaS companies?',
        'is the regular T1 good for software founders?',
        'how do I adjust T1 for B2B SaaS vs consumer?',
      ],
    },
    {
      tag: 'refund-handling',
      questions: [
        'what does travis say about handling refund requests?',
        'how should I respond when a customer asks for a refund?',
        'when is it right to refund vs offer replacement?',
      ],
    },
    {
      tag: 'international-markets',
      questions: [
        'does travis teach anything about selling in non-english markets?',
        'are coffee dates different in UK vs US?',
        'how do I adapt T1 for Spanish-speaking audiences?',
      ],
    },
    {
      tag: null,
      questions: [
        'how long should I wait between T1 and a follow-up?',
        'what about email deliverability issues with Gmail?',
      ],
    },
  ];

  for (const cluster of gapClusters) {
    for (const q of cluster.questions) {
      await KnowledgeGaps.push({
        userId: admin.id,
        question: q,
        searchQueries: ['T1 email', 'cold outreach', q.split(' ').slice(0, 3).join(' ')],
        projectId: null,
        conversationId: null,
        normalizedTag: cluster.tag,
        resolved: false,
      });
    }
  }

  // Candidate concepts surfaced by the linker
  await CandidateConcepts.push({
    suggestedSlug: 'SPONSOR_MATCHING_MODEL',
    suggestedName: 'Sponsor Matching Model',
    suggestedDescription:
      'Travis\'s model for matching independent creators with aligned sponsors through a short questionnaire + intro framework.',
    evidence:
      "In CDODU-SPONSOR chunk, Travis describes the three-question sponsor match: 'who's paying them, what do they need from you, what makes them easy to work with.'",
    foundInSourceId: 'placeholder',
    timesObserved: 4,
    status: 'pending',
  });

  await CandidateConcepts.push({
    suggestedSlug: 'COFFEE_DATE_PREP_CHECKLIST',
    suggestedName: 'Coffee Date Prep Checklist',
    suggestedDescription:
      "A specific pre-call checklist Travis mentions in multiple places: partner's recent content, three-question research, signal-to-noise cue for the call.",
    evidence:
      "In BEAM-M02 chunk 3, Travis runs through his 5-minute prep routine before every coffee date.",
    foundInSourceId: 'placeholder',
    timesObserved: 2,
    status: 'pending',
  });

  return { userId: admin.id };
}
