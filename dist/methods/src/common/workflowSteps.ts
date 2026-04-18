// Per-step configuration for the two workflows. Each step has:
//   - a title and short description shown in the step rail
//   - the concept IDs that drive coaching for this step (retrieved at generation time)
//   - the skill ID this step maps to (for the "what skill are you practicing?" UI)
//   - a structured output shape the generator produces
//   - a prompt template function that produces the generator's system prompt
//   - the artifact type + artifact title template
//   - optionally, web-tool access (only the research step has this)

import type { ArtifactType } from '../tables/artifacts';

export interface WorkflowStepConfig {
  index: number;
  title: string;
  subtitle: string;
  skillSlug: string;
  conceptSlugs: string[];
  artifactType: ArtifactType;
  artifactTitle: string;
  // Whether this step gets web tools (only the research step has these)
  allowWebTools: boolean;
  // Structured output example (as a JS object) — the runTask task agent uses this shape
  structuredOutputExample: Record<string, unknown>;
  // Prompt template — given the student's niche, project name, and prior step state, produce a prompt
  buildPrompt: (ctx: PromptContext) => string;
}

export interface PromptContext {
  projectName: string;
  partnerName?: string;
  nicheText: string;
  priorState: Record<string, unknown>;
  studentInput: Record<string, unknown>;
  conceptsContext: string;                // Pre-formatted concept + source context block
}

// Shared system-prompt preamble that enforces Mr. A's grounded voice and the "no freelancing" rule.
// Every step prepends this. The response model treats the concept context as the only allowed source.
export const SHARED_PROMPT_PREAMBLE = `
You are generating a working artifact for an MRA student inside Mojo Results Accelerator.

HARD RULES:
- Ground every substantive claim in the reference material provided below. Do not fabricate.
- Use Travis's domain vocabulary naturally — T1, T2, T3, hand-raiser, coffee date, hell island, training wheels, BFOT, CD3 — but do NOT impersonate Travis's voice.
- Warm, direct coaching prose. Lowercase sentences OK. Em-dashes welcome.
- Concrete over abstract. Specific numbers. Short paragraphs.
- No marketing fluff: no "leverage," "unlock," "supercharge," "empower," "journey." No emoji.
- If the reference material does not cover something the student needs, say so in the artifact rather than making it up.

OUTPUT CONTRACT:
You return ONLY JSON matching the example shape provided. No prose, no markdown outside of fields.
Fields marked "markdown" accept multi-paragraph markdown strings. Fields marked as string arrays take clean strings (no leading bullets).
Include a citedSourceIds field listing the source IDs your claims draw from (subset of the reference material below).

If at any point you find yourself about to generate output with no supporting reference material, STOP and return a short artifact with flaggedConcerns populated describing what's missing.
`;

// The six steps of the Coffee Dates + Giving Funnel workflow, plus the standalone Validate Niche workflow.
// Step 1 is shared between both workflows (so free tier users using validate-niche get the same step 1 experience).

export const WORKFLOW_STEPS: Record<string, WorkflowStepConfig[]> = {
  'validate-niche': [
    {
      index: 1,
      title: 'Validate your niche',
      subtitle: 'Sharpen who you serve',
      skillSlug: 'BUILD_PROSPECT_LIST',
      conceptSlugs: ['GIVING_FUNNEL', 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', 'TRAINING_WHEELS_PARTNER', 'NEEDINESS_ELIMINATION'],
      artifactType: 'niche_doc',
      artifactTitle: 'Niche Doc',
      allowWebTools: false,
      structuredOutputExample: {
        nicheStatement: 'I help independent podcast hosts with growing audiences (10k-50k monthly downloads) who want to monetize their show without selling a course.',
        examplePartners: [
          'CompanyX Podcasts (hosts several mid-tier shows, visible sponsor program)',
          'CreatorHub Network (runs 15+ shows, sells a course, clear decision-maker)',
          'PodcastGrowth.io (SaaS, audience of podcast hosts, has existing customer list)',
        ],
        cashflowEvidence: 'This niche has identifiable money movement: podcast sponsorship fees ($500-$5000/episode), course sales to hosts, podcast networking events with paid tickets.',
        sharpeningQuestions: [
          'Are you going after English-only hosts or multi-language?',
          'True-crime, business, or lifestyle vertical?',
        ],
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE (verbatim):
${ctx.nicheText || '(not provided)'}

YOUR JOB: Produce a niche doc. Travis's rule: the niche cannot be "people" — it must be specific enough to identify real prospects, real offers, and real cashflow. If the student's niche is too vague, name the specific problem and produce a sharper version PLUS the 2-3 most important clarifying questions to pin it down further.

REFERENCE MATERIAL (the ONLY sources you may draw from for coaching claims):
${ctx.conceptsContext}

PRODUCE A JSON ARTIFACT matching the example shape. Be concrete and specific. Use the student's language where possible, but sharpen vagueness. Draw every teaching claim from the reference material.`,
    },
  ],

  'coffee-dates-giving-funnel': [
    // Step 1 is the same as validate-niche standalone
    {
      index: 1,
      title: 'Validate your niche',
      subtitle: 'Sharpen who you serve',
      skillSlug: 'BUILD_PROSPECT_LIST',
      conceptSlugs: ['GIVING_FUNNEL', 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', 'TRAINING_WHEELS_PARTNER', 'NEEDINESS_ELIMINATION'],
      artifactType: 'niche_doc',
      artifactTitle: 'Niche Doc',
      allowWebTools: false,
      structuredOutputExample: {
        nicheStatement: 'I help independent podcast hosts with growing audiences (10k-50k monthly downloads) who want to monetize their show without selling a course.',
        examplePartners: [
          'CompanyX Podcasts (hosts several mid-tier shows, visible sponsor program)',
          'CreatorHub Network (runs 15+ shows, sells a course, clear decision-maker)',
          'PodcastGrowth.io (SaaS, audience of podcast hosts, has existing customer list)',
        ],
        cashflowEvidence: 'This niche has identifiable money movement: podcast sponsorship fees ($500-$5000/episode), course sales to hosts, podcast networking events with paid tickets.',
        sharpeningQuestions: [
          'Are you going after English-only hosts or multi-language?',
          'True-crime, business, or lifestyle vertical?',
        ],
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE (verbatim):
${ctx.nicheText || '(not provided)'}

YOUR JOB: Produce a niche doc. Travis's rule: the niche cannot be "people" — it must be specific enough to identify real prospects, real offers, and real cashflow. If the student's niche is too vague, name the specific problem and produce a sharper version PLUS the 2-3 most important clarifying questions to pin it down further.

REFERENCE MATERIAL (the ONLY sources you may draw from for coaching claims):
${ctx.conceptsContext}

PRODUCE A JSON ARTIFACT matching the example shape. Be concrete and specific. Use the student's language where possible, but sharpen vagueness. Draw every teaching claim from the reference material.`,
    },
    {
      index: 2,
      title: 'Research your partner list',
      subtitle: '7-8 figure companies with 3+ products',
      skillSlug: 'RESEARCHING_PARTNERS',
      conceptSlugs: ['TRAINING_WHEELS_PARTNER', 'COFFEE_DATE_MODEL', 'GIVING_FUNNEL'],
      artifactType: 'prospect_list',
      artifactTitle: 'Prospect List',
      allowWebTools: true,                               // The ONE step that gets web tools
      structuredOutputExample: {
        prospects: [
          {
            name: 'Example Partner Co',
            url: 'https://example.com',
            whatTheySell: 'Online course + community for mid-career professionals',
            whyFits: 'Established list, multiple products, visible decision-maker, audience matches our niche',
            decisionMaker: 'Jane Doe (CEO)',
            angle: 'Offer to interview them for our list in exchange for a product swap',
            confidence: 'high',
          },
        ],
        searchStrategy: 'We searched for established course creators with 3+ products in the podcast-hosting space, looking for visible customer testimonials as a proxy for having a list.',
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE:
${ctx.nicheText}

PRIOR STEP OUTPUT (niche doc — already confirmed by student):
${JSON.stringify(ctx.priorState['step1'] ?? {}, null, 2)}

YOUR JOB: Build a prospect list of 10-15 candidate partners. Use the web tools (searchGoogle, scrapeUrl, searchGoogleNews) to find REAL companies matching Travis's "training wheels partner" criteria: 7-8 figure companies, 3+ products, plateaued growth, existing customer list, identifiable decision-maker. Produce a structured list with name, URL, what they sell, why they fit, decision-maker if findable, and a suggested angle.

IMPORTANT:
- Only include companies you verified via web search. Do not fabricate.
- Partnership criteria come from the reference material below.
- The list of actual candidates comes from the web. This is the ONE step where web tools are in scope.

REFERENCE MATERIAL (partner criteria):
${ctx.conceptsContext}

PRODUCE a JSON artifact matching the example shape. Include a brief searchStrategy note explaining your methodology.`,
    },
    {
      index: 3,
      title: 'Draft your attraction video',
      subtitle: 'Give first, one specific thing',
      skillSlug: 'DELIVER_VALUE_BEFORE_SELLING',
      conceptSlugs: ['GIVING_FUNNEL', 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', 'NEEDINESS_ELIMINATION'],
      artifactType: 'attraction_video',
      artifactTitle: 'Attraction Video Outline',
      allowWebTools: false,
      structuredOutputExample: {
        title: '3 reasons your podcast stopped growing (and the fix that takes 15 minutes)',
        hook: 'Open with a specific pain: "you\'ve been posting every week for a year and your downloads haven\'t budged."',
        outline: [
          'Reason 1: You\'re optimizing for downloads, not for conversation. Story: [specific example].',
          'Reason 2: Your show opener is burying the hook. Show the fix in 90 seconds.',
          'Reason 3: You\'re not asking listeners for anything specific. Show the one-line CTA.',
        ],
        giveaway: 'Free audit — paste your show\'s RSS feed into a template and get 3 specific fixes.',
        cta: 'If you want the audit template, it\'s in the Skool group — link in description.',
        targetLength: '6-8 minutes',
        format: 'talking head with one on-screen slide per reason',
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE:
${ctx.nicheText}

STUDENT'S PREFERENCES FOR THIS VIDEO (from the form):
${JSON.stringify(ctx.studentInput, null, 2)}

YOUR JOB: Draft an attraction video outline. The video's purpose is to pull T2 respondents into the Skool group. It should: (1) give ONE specific thing away (not generic advice), (2) be short (5-10 min), (3) have a clear direct CTA to join the Skool group.

REFERENCE MATERIAL:
${ctx.conceptsContext}

PRODUCE a JSON artifact with title, hook, outline (3-5 bullets), the one giveaway, the CTA, target length, and format. Draw the "give first" and "the market writes your marketing" framing from the reference material.`,
    },
    {
      index: 4,
      title: 'Set up your Skool group',
      subtitle: 'Where hand-raisers land',
      skillSlug: 'DELIVER_VALUE_BEFORE_SELLING',
      conceptSlugs: ['GIVING_FUNNEL', 'COFFEE_DATE_MODEL'],
      artifactType: 'skool_setup',
      artifactTitle: 'Skool Setup Plan',
      allowWebTools: false,
      structuredOutputExample: {
        groupName: 'The Podcast Growth Lab',
        groupDescription: 'For independent podcast hosts serious about making their show a business. Weekly audits, frameworks, and one-on-one hot seats.',
        welcomePost:
          'Welcome. Here\'s what this group is (and isn\'t)...\n\nStart here: [link to the audit template]\n\nTell me one thing: what\'s your show and what\'s the one thing that\'s stopping you from doubling it?',
        firstTwoWeekContent: [
          'Week 1: Audit template (the giveaway from the video)',
          'Week 1: Short teardown of a member\'s show (with permission)',
          'Week 2: Framework post — the 3-question filter for sponsors',
          'Week 2: Hot seat call announcement',
        ],
        skoolSetupChecklist: [
          'Create the group with the name above',
          'Paste the description',
          'Pin the welcome post as Post #1',
          'Create a Calendar event for the Week 2 hot seat',
          'Disable automatic "member joined" notifications (noise)',
          'Set the group to Private with approval required',
        ],
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE:
${ctx.nicheText}

PRIOR STEP (the attraction video outline):
${JSON.stringify(ctx.priorState['step3'] ?? {}, null, 2)}

YOUR JOB: Produce a Skool group setup plan. Name, description copy, a welcome post that asks the one question ("what's the one thing stopping you"), the first 2 weeks of content, and a setup checklist for the student to do on Skool itself (MRA does not integrate with Skool — this is a handoff checklist).

REFERENCE MATERIAL:
${ctx.conceptsContext}

PRODUCE a JSON artifact matching the example shape.`,
    },
    {
      index: 5,
      title: 'Write your cold outreach',
      subtitle: 'T1 → T2 → T3',
      skillSlug: 'WRITE_T1_HANDRAISER_EMAIL',
      conceptSlugs: ['GIVING_FUNNEL', 'COFFEE_DATE_MODEL', 'ESCAPE_HELL_ENTER_HEAVEN', 'NEEDINESS_ELIMINATION'],
      artifactType: 'outreach_pack',
      artifactTitle: 'Outreach Pack (T1/T2/T3)',
      allowWebTools: false,
      structuredOutputExample: {
        t1Email: {
          subject: 'quick question about [Partner Name]',
          body:
            'saw [specific thing]. nice work.\n\nfor [your niche], we\'ve got a [giveaway]. thought it might be useful for your people.\n\nhappy to walk you through it if you reply back.',
          notes: 'One ask. No link. Reply-or-text only.',
        },
        t2Conversation: {
          openingQuestion: 'can you tell me a little about your situation right now — what\'s on your plate this month?',
          listeningFor: [
            'Any mention of a gap or a capacity problem',
            'Mentions of something they\'ve been meaning to do',
            'Mentions of an offer that isn\'t selling',
          ],
        },
        t3Skeleton: {
          whenToUse: 'After T2 surfaces a specific opening the student can address.',
          structure:
            "Subject: quick idea for [thing they mentioned]\n\nBody: specific, short offer tied to what they said on the T2. No feature list — just the outcome and the next step.",
        },
        plan: {
          firstSend: 'Send T1 to 1 partner today. Wait 48 hours.',
          iteration: 'Tune T1 based on reply rate — if no replies after 5, change the [specific thing] line.',
        },
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE:
${ctx.nicheText}

PRIOR STEPS (niche doc + prospect list + attraction video + Skool setup):
${JSON.stringify(ctx.priorState, null, 2)}

YOUR JOB: Produce an outreach pack with T1 template, T2 one-question script, T3 skeleton, and a send plan. Travis's rules on T1: short, one ask, reply or text (no link to a landing page). T2: one question, then listen. T3: only written after T2 responses reveal what the market wants.

REFERENCE MATERIAL:
${ctx.conceptsContext}

PRODUCE a JSON artifact matching the example shape. The T1 should be tailored to the student's niche. The T2 script is a standard framework. The T3 is a skeleton with guidance on when to fill it in.`,
    },
    {
      index: 6,
      title: 'Track conversations and iterate',
      subtitle: 'The running workspace',
      skillSlug: 'APPLY_TRUTH_SERUM_QUESTIONING',
      conceptSlugs: ['COFFEE_DATE_MODEL', 'GIVING_FUNNEL', 'BOTTOM_DOLLAR_TRUTH_SERUM', 'NEEDINESS_ELIMINATION'],
      artifactType: 'conversation_log',
      artifactTitle: 'Partner Conversation Log',
      allowWebTools: false,
      structuredOutputExample: {
        partnerName: 'Example Partner Name',
        conversationHistory: [
          { direction: 'sent', type: 'T1', summary: 'Sent T1 on Apr 10. No link, one ask.' },
          { direction: 'received', type: 'reply', summary: 'They replied asking for more context.' },
          { direction: 'sent', type: 'T2', summary: 'Asked the one question about their offer.' },
        ],
        signalsHeard: [
          'Their course has plateaued at around $30k/mo',
          'They mentioned they\'ve been "meaning to" do a summit but haven\'t',
        ],
        opening: 'The summit. They already want it, they just don\'t have bandwidth.',
        nextMove: 'Propose to run the summit with them. Short message, one specific next step (a 30-min call).',
        nextMessage: '',
        flaggedConcerns: [],
        citedSourceIds: [],
      },
      buildPrompt: (ctx) => `${SHARED_PROMPT_PREAMBLE}

CURRENT PROJECT: ${ctx.projectName}

THE STUDENT'S NICHE:
${ctx.nicheText}

STUDENT'S INPUT FOR THIS UPDATE (the latest reply, or a summary of the conversation so far):
${JSON.stringify(ctx.studentInput, null, 2)}

PRIOR CONVERSATION LOG (if any):
${JSON.stringify(ctx.priorState['step6'] ?? {}, null, 2)}

YOUR JOB: Update the conversation log for this partner. Surface the signals the student should hear, name the opening (the specific thing this partner needs that we can address), and draft the next message.

REFERENCE MATERIAL:
${ctx.conceptsContext}

PRODUCE a JSON artifact matching the example shape. The conversation history should accumulate over time. signalsHeard and opening should be updated based on the latest input. nextMessage should be a specific draft the student can send.`,
    },
  ],
};

// Helper: get the step config for a workflow + step index, or null if out of range.
export function getStepConfig(workflowSlug: string, stepIndex: number): WorkflowStepConfig | null {
  const steps = WORKFLOW_STEPS[workflowSlug];
  if (!steps) return null;
  return steps.find((s) => s.index === stepIndex) ?? null;
}
