import { db } from '@mindstudio-ai/agent';
import { Users } from '../src/tables/users';
import { Projects } from '../src/tables/projects';
import { WorkflowRuns } from '../src/tables/workflow_runs';
import { Artifacts } from '../src/tables/artifacts';
import { seedOntology } from './_helpers/seedOntology';
import { seedSampleContent } from './_helpers/seedSampleContent';

// Scenario: a free-tier user who signed up but isn't on the access allowlist.
// Sees the full shell with most sections locked. Validate Your Niche is unlocked.
// Useful for testing the paid-access lock treatment.
export async function freeTierUser() {
  await seedOntology();
  await seedSampleContent();

  const user = await Users.push({
    email: 'visitor@example.com',
    roles: ['free'],
    displayName: 'Alex',
    onboardedAt: db.now() - db.days(1),
  });

  // Deliberately NO access_grant — this user sees the locked state
  // But we do give them an in-progress niche validation project so the free experience
  // doesn't feel completely empty
  const project = await Projects.push({
    userId: user.id,
    name: 'My First Niche',
    status: 'active',
    lastActivityAt: db.now() - db.hours(2),
  });

  const run = await WorkflowRuns.push({
    userId: user.id,
    projectId: project.id,
    workflowSlug: 'validate-niche',
    status: 'ready',
    currentStep: 1,
    totalSteps: 1,
    state: {
      step1: {
        nicheText: 'I want to help freelancers grow their business',
      },
    },
  });

  await Artifacts.push({
    userId: user.id,
    projectId: project.id,
    workflowRunId: run.id,
    stepIndex: 1,
    type: 'niche_doc',
    title: 'Niche Doc',
    body: JSON.stringify(
      {
        nicheStatement:
          '"Freelancers" is too broad to be a niche. Mr. A sharpened: "Solo freelancers in design and copywriting making $8k-$25k/month who want to add a productized service without becoming an agency."',
        examplePartners: [
          'The Freelance Collective (established community, 3+ paid offerings)',
          'Creator Career Paths (newsletter + course for design freelancers)',
        ],
        cashflowEvidence:
          'Solo freelancers in this income band consistently pay $100-$500/month for productized-service training. Visible via course sales and community memberships.',
        sharpeningQuestions: [
          'Design vs copy as the primary vertical?',
          'Add a geographic filter (US-based first)?',
        ],
        flaggedConcerns: [
          'The initial niche ("freelancers") was too vague. Sharpening still needed around vertical (design vs copy) and income band.',
        ],
        citedSourceIds: [],
      },
      null,
      2
    ),
    bodyFormat: 'json',
    version: 1,
    reviewVerdict: 'surface_issues',
    reviewIssues: [
      'The initial niche ("freelancers") was too vague per Travis\'s rule — sharpening still needed.',
    ],
    reviewSuggestions: [
      'Pick one vertical to start (design OR copy) so your prospect list is findable.',
    ],
    citedSourceIds: [],
    archived: false,
  });

  return { userId: user.id };
}
