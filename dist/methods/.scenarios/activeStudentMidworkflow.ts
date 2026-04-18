import { db } from '@mindstudio-ai/agent';
import { Users } from '../src/tables/users';
import { AccessGrants } from '../src/tables/access_grants';
import { Projects } from '../src/tables/projects';
import { WorkflowRuns } from '../src/tables/workflow_runs';
import { Artifacts } from '../src/tables/artifacts';
import { Conversations } from '../src/tables/conversations';
import { seedOntology } from './_helpers/seedOntology';
import { seedSampleContent } from './_helpers/seedSampleContent';

// Scenario: paid student with real work in flight.
// Two projects, one mid-Coffee-Dates workflow (steps 1-3 done with artifacts), some chat threads.
// Best starting state for exploring the full product.
export async function activeStudentMidworkflow() {
  await seedOntology();
  await seedSampleContent();

  const user = await Users.push({
    email: 'jamie@example.com',
    roles: ['student'],
    displayName: 'Jamie',
    onboardedAt: db.now() - db.days(7),
    recommendationsOptOut: false,
  });
  await AccessGrants.upsert('email', {
    email: 'jamie@example.com',
    plan: 'full',
    grantedBy: 'admin',
    grantedByUserId: null,
    note: 'Paid annual access, Order #A-1042',
    revoked: false,
    revokedAt: null,
    revokedReason: null,
  });

  // Project 1: the active partnership project
  const justinProject = await Projects.push({
    userId: user.id,
    name: 'Justin @ BraveMinds',
    partnerName: 'Justin Rivera',
    niche: 'Independent podcast hosts (10k-50k monthly downloads) who want to monetize without a course',
    status: 'active',
    lastActivityAt: db.now() - db.hours(3),
  });

  // Workflow run — mid-flight, step 3 just completed (attraction video outline),
  // moving toward step 4 (Skool setup)
  const justinRun = await WorkflowRuns.push({
    userId: user.id,
    projectId: justinProject.id,
    workflowSlug: 'coffee-dates-giving-funnel',
    status: 'ready',
    currentStep: 3,
    totalSteps: 6,
    state: {
      step1: {
        nicheText:
          'Independent podcast hosts (10k-50k monthly downloads) who want to monetize without a course',
      },
      step2: {
        runConfirmed: true,
      },
      step3: {
        format: 'talking head with inline Loom teardown',
        targetLength: '7-9 minutes',
      },
    },
    lastStreamMessage: 'Step 3 complete. Move on when ready.',
  });

  // Artifacts from steps 1-3
  await Artifacts.push({
    userId: user.id,
    projectId: justinProject.id,
    workflowRunId: justinRun.id,
    stepIndex: 1,
    type: 'niche_doc',
    title: 'Niche Doc',
    body: JSON.stringify(
      {
        nicheStatement:
          'I help independent podcast hosts (10k-50k monthly downloads) monetize their show through sponsor-matching and short-form content licensing — without having to sell a course.',
        examplePartners: [
          'Podcast Insights Co — runs 8 mid-tier shows, visible sponsor marketplace, decision-maker is the founder.',
          'Sponsored Inc — SaaS that matches podcasts and sponsors; has an existing list of host-side customers.',
          'The Podcast Consulting Network — sells 3+ courses to hosts, active membership community.',
        ],
        cashflowEvidence:
          'Sponsor dollars are real and measurable ($500-$5000 per episode depending on size), and hosts spend 3-8 hours per week chasing deals directly. Offloading sponsor-matching is a pain they pay for.',
        sharpeningQuestions: [
          'Are you going after English-language hosts specifically, or open to international?',
          'True-crime, business, or lifestyle vertical dominant first?',
        ],
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      null,
      2
    ),
    bodyFormat: 'json',
    version: 2,
    reviewVerdict: 'pass',
    reviewIssues: [],
    reviewSuggestions: [],
    citedSourceIds: [],
    archived: false,
  });

  await Artifacts.push({
    userId: user.id,
    projectId: justinProject.id,
    workflowRunId: justinRun.id,
    stepIndex: 2,
    type: 'prospect_list',
    title: 'Prospect List',
    body: JSON.stringify(
      {
        prospects: [
          {
            name: 'Podcast Insights Co',
            url: 'https://podcastinsights.example',
            whatTheySell: 'Sponsor-matching marketplace + a paid course for mid-tier hosts',
            whyFits: 'Established list, 3+ products, clear decision-maker, audience matches niche',
            decisionMaker: 'Jordan Elias (Founder)',
            angle: 'Offer to interview them on the craft of sponsor matching for our list',
            confidence: 'high',
          },
          {
            name: 'Sponsored Inc',
            url: 'https://sponsored.example',
            whatTheySell: 'SaaS + two mastermind cohorts for host monetization',
            whyFits: 'Plateaued, looking for new partnership content, active customer base',
            decisionMaker: 'Priya Rao (CMO)',
            angle: 'Propose a joint workshop on sponsor negotiation for our combined lists',
            confidence: 'high',
          },
          {
            name: 'The Podcast Consulting Network',
            url: 'https://pcnetwork.example',
            whatTheySell: 'Courses + membership community + done-for-you services',
            whyFits: '3+ products, large existing membership, decision-maker engaged',
            decisionMaker: 'Marcus Devlin (Program Director)',
            angle: 'Run a 4-week sponsor-matching cohort inside their community with revenue share',
            confidence: 'medium',
          },
        ],
        searchStrategy:
          'Searched for course creators with 3+ products in the podcast-hosting space, prioritized visible customer testimonials and active sponsorship chatter as a proxy for real list size.',
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      null,
      2
    ),
    bodyFormat: 'json',
    version: 1,
    reviewVerdict: 'pass',
    reviewIssues: [],
    reviewSuggestions: [],
    citedSourceIds: [],
    archived: false,
  });

  await Artifacts.push({
    userId: user.id,
    projectId: justinProject.id,
    workflowRunId: justinRun.id,
    stepIndex: 3,
    type: 'attraction_video',
    title: 'Attraction Video Outline',
    body: JSON.stringify(
      {
        title: '3 reasons your podcast stopped growing — and the 15-minute fix',
        hook: 'Open with a specific pain: "you\'ve been posting every week for a year and your downloads haven\'t budged."',
        outline: [
          'Reason 1 — you\'re optimizing for downloads, not for conversation. Story: the 14k-download podcast that 3x\'d by switching to a reply-to-listen flow.',
          'Reason 2 — your show opener is burying the hook. Show the 90-second fix live on screen.',
          'Reason 3 — you\'re not asking listeners for anything specific. Show the one-line CTA that doubled my referral rate.',
        ],
        giveaway:
          'The "first-90-seconds" teardown template — paste your show URL and get back 3 specific fixes.',
        cta: 'If you want the teardown, it lives in our Skool group. Link in the show notes and pinned comment.',
        targetLength: '7-9 minutes',
        format: 'talking head with inline Loom teardown of a real show (with permission)',
        flaggedConcerns: [
          'I could not find an MRA source that specifically covers video-hook pacing; the 90-second target is drawn from general copywriting principles in the reference material.',
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
      'The "90-second hook" specific timing isn\'t grounded in the reference material — it\'s a common video-copy rule but not one Travis explicitly teaches in the linked sources.',
    ],
    reviewSuggestions: [
      'Either remove the specific 90-second framing or replace it with the "give first — one specific thing" teaching from the Giving Funnel.',
    ],
    citedSourceIds: [],
    archived: false,
  });

  // A few chat threads in the project
  const thread1 = await Conversations.push({
    userId: user.id,
    projectId: justinProject.id,
    agentThreadId: `seed-thread-${user.id}-1`,
    title: 'Sharpening the niche statement',
    lastMessageAt: db.now() - db.hours(3),
    lastMessagePreview:
      "let's tighten the 'without a course' framing — it's doing a lot of work but needs one more example",
    archived: false,
  });

  await Conversations.push({
    userId: user.id,
    projectId: justinProject.id,
    agentThreadId: `seed-thread-${user.id}-2`,
    title: 'How specific should the prospect angle be?',
    lastMessageAt: db.now() - db.hours(8),
    lastMessagePreview:
      'for Sponsored Inc, lean into the "your customers are already asking you this" hook',
    archived: false,
  });

  // Project 2: older archived-style project with just a niche doc
  const olderProject = await Projects.push({
    userId: user.id,
    name: 'Marin @ Groundkeeper',
    partnerName: 'Marin Choi',
    niche: 'Mid-tier newsletter operators with 20k-80k subscribers, monetizing via sponsorships',
    status: 'active',
    lastActivityAt: db.now() - db.days(5),
  });

  const olderRun = await WorkflowRuns.push({
    userId: user.id,
    projectId: olderProject.id,
    workflowSlug: 'coffee-dates-giving-funnel',
    status: 'ready',
    currentStep: 1,
    totalSteps: 6,
    state: {
      step1: {
        nicheText: 'Mid-tier newsletter operators with 20k-80k subscribers, monetizing via sponsorships',
      },
    },
  });

  await Artifacts.push({
    userId: user.id,
    projectId: olderProject.id,
    workflowRunId: olderRun.id,
    stepIndex: 1,
    type: 'niche_doc',
    title: 'Niche Doc',
    body: JSON.stringify(
      {
        nicheStatement:
          'Mid-tier newsletter operators (20k-80k subs) who monetize primarily through sponsorships and want to diversify without losing their voice.',
        examplePartners: [
          'The Substack-Tier Operators Collective',
          'Newsletter Growth Lab',
          'ConvertKit Creator Network',
        ],
        cashflowEvidence:
          'Sponsor revenue per operator ranges $3k-$40k/month. Diversification into paid subs is the common request.',
        sharpeningQuestions: ['Paid subs vs product sales vs course?'],
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      null,
      2
    ),
    bodyFormat: 'json',
    version: 1,
    reviewVerdict: 'pass',
    reviewIssues: [],
    reviewSuggestions: [],
    citedSourceIds: [],
    archived: false,
  });

  // Global (non-project-scoped) chat thread
  await Conversations.push({
    userId: user.id,
    projectId: null,
    agentThreadId: `seed-thread-${user.id}-global-1`,
    title: 'General question about T1 emails',
    lastMessageAt: db.now() - db.days(2),
    lastMessagePreview:
      'the "one ask, no link" rule trips most people up — let me pull the sources',
    archived: false,
  });

  return { userId: user.id, projectIds: [justinProject.id, olderProject.id] };
}
