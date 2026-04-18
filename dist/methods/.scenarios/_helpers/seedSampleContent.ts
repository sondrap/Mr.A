// Scenario helper: seed a curated set of source chunks + concept links for development.
// Combines the real Beamer sample (parsed from its markdown file) with a small set of
// synthetic chunks for the v1 workflows' concepts.
//
// Without concept linking, the workflows have nothing to cite. The synthetic chunks are
// clearly marked as synthetic so real ingested content replaces them once the ETL runs.

import { db } from '@mindstudio-ai/agent';
import { Contexts } from '../../src/tables/contexts';
import { Sources } from '../../src/tables/sources';
import { ConceptSources, conceptSourceLinkKey } from '../../src/tables/concept_links';
import { parseChunkedMarkdown } from '../../src/common/chunkedMarkdown';
import { sha256 } from '../../src/common/hashing';
import { BEAMER_SAMPLE_MARKDOWN } from '../_seed/beamerSample';

// Ensure the BEAM context exists for the Beamer sample (not in the standard ontology list).
async function ensureBeamContext() {
  const existing = await Contexts.findOne((c) => c.slug === 'BEAM');
  if (existing) return;
  await Contexts.push({
    slug: 'BEAM',
    name: 'Beamer 2.0',
    description:
      "Travis's training on the T3 system for revenue-sharing partnerships with established businesses. The sample lesson (Fast Action Plan) covers Coffee Dates for partnerships.",
    aliases: ['beamer', 'beamer 2.0', 'BEAM'],
  });
}

// Synthetic chunk generator. Same shape as parsed chunks. Covers the core v1 workflow concepts
// with enough substance for the generator agents to have real grounding material.
interface SyntheticChunk {
  contextSlug: string;
  contentId: string;
  contentName: string;
  format: 'VIDEO' | 'DOCUMENT' | 'LESSON' | 'WORKSHOP' | 'COACHING_CALL';
  chunkIndex: number;
  chunkHeading: string;
  timestampStart: number;
  timestampEnd: number;
  description: string;
  body: string;
  linkUrl: string;
  // Which concepts this chunk teaches, with depth + role
  links: Array<{ conceptSlug: string; depth: number; role: 'primary_teaching' | 'applied_example' | 'reference_mention' }>;
}

const SYNTHETIC_CHUNKS: SyntheticChunk[] = [
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-NICHE',
    contentName: 'Validating Your Niche',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: "Why 'People' Is Not A Niche",
    timestampStart: 180,
    timestampEnd: 620,
    description:
      'Travis breaks down the rule that your niche cannot be "people" — it has to be specific enough to identify real prospects, real offers, and real cashflow moving in that market.',
    body:
      "Let me say this plain: your niche can't be people. It's gotta be more specific than that. I don't care if you want to help entrepreneurs or creators or coaches — all of those are still too broad. You need to narrow down to the kind of business that has three-plus products already, a visible list of customers, and a problem you can name in one sentence. Because here's what happens when your niche is vague: your messaging is vague, your prospects are vague, and your offers land flat. Every time. The test I give people — can you name five real companies serving this niche? If you can't name five, you don't have a niche yet. You have a mood. Go find the five, then we can talk.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/niche?t=180',
    links: [
      { conceptSlug: 'GIVING_FUNNEL', depth: 4, role: 'applied_example' },
      { conceptSlug: 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', depth: 5, role: 'primary_teaching' },
    ],
  },
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-NICHE',
    contentName: 'Validating Your Niche',
    format: 'VIDEO',
    chunkIndex: 2,
    chunkHeading: 'Training Wheels Partners',
    timestampStart: 1220,
    timestampEnd: 1680,
    description:
      "Travis explains why new students should target 7-8 figure companies with 3+ products rather than going after solopreneurs — the concept of 'training wheels' partners.",
    body:
      "People want to go after the guy with the 500-person list because he feels approachable. Wrong move. You want the 7-to-8 figure company that already has three products, an existing customer list, and a decision-maker you can identify. Those are your training wheels partners. They've already got the market taste, the list, and the motivation. Solopreneurs with tiny lists don't have the capacity to absorb a test with you. Go bigger than you think.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/niche?t=1220',
    links: [{ conceptSlug: 'TRAINING_WHEELS_PARTNER', depth: 5, role: 'primary_teaching' }],
  },
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-T1-EMAILS',
    contentName: 'The T1 Hand-Raiser Email',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'What A T1 Actually Looks Like',
    timestampStart: 0,
    timestampEnd: 540,
    description:
      "Travis walks through the T1 email template: short, one ask (reply or text), no link. Why the link kills the email, and how the 'reply back' signal is the point.",
    body:
      "The T1 is a hand-raiser email. That's it. Its only job is to get someone to say yes — yes, tell me more, yes, I'm interested, yes, let's talk. It is not a sales email. It is not a pitch. It's not the thing you send because you've been reading marketing Twitter.\n\nRules: it is short. It's got one ask. It does not have a link. Why? Because the second you put a link in a T1, you've turned it into a pitch. People either click or they don't, and your response rate collapses. The whole point of a T1 is the reply — you want them to write you back. That's your signal. That's the hand-raiser.\n\nThe body is three parts: a specific thing you noticed about them (the hook), a specific thing you've got that would help their people (the offer line), and a specific ask (are you open to hearing more, or can I text you at this number). One ask. No link. Don't overthink it.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/t1?t=0',
    links: [
      { conceptSlug: 'COFFEE_DATE_MODEL', depth: 3, role: 'applied_example' },
      { conceptSlug: 'ESCAPE_HELL_ENTER_HEAVEN', depth: 2, role: 'reference_mention' },
      { conceptSlug: 'NEEDINESS_ELIMINATION', depth: 3, role: 'applied_example' },
    ],
  },
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-T2-T3',
    contentName: 'T2 and T3: After the Hand-Raiser',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'The One-Question T2',
    timestampStart: 0,
    timestampEnd: 480,
    description:
      "After a T1 reply, the T2 is a single question that makes the prospect tell you what they actually need. Travis shows how 'can you tell me a little about your situation' does more work than any pitch deck.",
    body:
      "Okay they replied to your T1. Now what? This is where most people blow it. They go right into pitch mode. Don't do that. The T2 is one question. One. The question is some version of: 'can you tell me a little about your situation right now — what's on your plate this month?'\n\nThen shut up and listen. The prospect will tell you what they need, what they've been meaning to do, and what isn't working. That's the market writing your marketing. You're not selling — you're interviewing. The T3, the actual offer, doesn't get written until after the T2 responses tell you what to write.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/t2?t=0',
    links: [
      { conceptSlug: 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', depth: 4, role: 'applied_example' },
      { conceptSlug: 'COFFEE_DATE_MODEL', depth: 4, role: 'applied_example' },
      { conceptSlug: 'BOTTOM_DOLLAR_TRUTH_SERUM', depth: 3, role: 'applied_example' },
    ],
  },
  {
    contextSlug: 'CDODC',
    contentId: 'CDODC-GIVING-FUNNEL',
    contentName: 'The Giving Funnel Overview',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: "Four Legs: Specific Problem, Superpower, Sampling, Stock Your Pond",
    timestampStart: 120,
    timestampEnd: 820,
    description:
      "Travis introduces the Giving Funnel and walks through its four legs — specific problem, superpower, sampling (giving value), and stock-your-pond (building the audience you'll later serve).",
    body:
      "The Giving Funnel is built on four legs. Leg one: a specific problem you solve. Not a broad theme. A specific problem. Leg two: your superpower — the thing you do better than most people in your niche. Leg three: sampling. You give away something that is tangibly useful. Not a lead magnet made of fluff. Actual value. And leg four: stocking your pond — building the audience and the group you'll later serve.\n\nThe funnel's job is to turn high-intent prospects into pre-sold leads, then into a steady stream of first meetings — coffee dates. When this is humming, you never feel needy. Neediness is the biggest deal blocker. Needy people have skinny kids.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-course/overview?t=120',
    links: [
      { conceptSlug: 'GIVING_FUNNEL', depth: 5, role: 'primary_teaching' },
      { conceptSlug: 'NEEDINESS_ELIMINATION', depth: 4, role: 'applied_example' },
      { conceptSlug: 'COFFEE_DATE_MODEL', depth: 3, role: 'applied_example' },
    ],
  },
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-SKOOL',
    contentName: 'Your Skool Group: Where Hand-Raisers Land',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'The Welcome Post and the One Question',
    timestampStart: 0,
    timestampEnd: 560,
    description:
      "Travis on the Skool group as the landing spot for prospects who respond to the attraction video. The welcome post asks the one question that gets the prospect to tell you what they need.",
    body:
      "Your Skool group is where people land after they raise their hand. Not a sales page. Not a webinar funnel. A group. Why? Because a group is a conversation, and a conversation gives you what a funnel never will — the actual words your prospects use to describe their problem.\n\nYour welcome post does two things. One: it sets the tone (what this group is, what it isn't, and what they should start with). Two: it asks them the one question. 'Tell me one thing — what's your show and what's the one thing stopping you from doubling it?' Or some version of that, tailored to your niche. Whatever they write back becomes your curriculum. Let the market write your marketing.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/skool?t=0',
    links: [
      { conceptSlug: 'GIVING_FUNNEL', depth: 4, role: 'applied_example' },
      { conceptSlug: 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', depth: 5, role: 'primary_teaching' },
    ],
  },
  {
    contextSlug: 'CDODU',
    contentId: 'CDODU-ATTRACTION',
    contentName: 'Attraction Video',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'Give First: One Specific Thing',
    timestampStart: 0,
    timestampEnd: 520,
    description:
      "The attraction video is the first real value drop. Travis's rule: one specific thing you give away, not a generic overview. Short (5-10 min), direct, and leads to the Skool group.",
    body:
      "Your attraction video has one job: give away one specific thing that's so useful people can't help but want more. One specific thing. Not seven tips. Not a broad overview. Pick one problem you've heard your market name, and solve it inside five to ten minutes.\n\nThe format is whatever works for you — talking head, Loom screenshare, a teardown of an example. The content is specific, usable, and tight. Then you invite them into your Skool group at the end. That's it. Not a sales pitch. A working example of your superpower, and an invitation to join the conversation.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/cdod-university/attraction-video?t=0',
    links: [
      { conceptSlug: 'GIVING_FUNNEL', depth: 4, role: 'applied_example' },
      { conceptSlug: 'LETTING_THE_MARKET_WRITE_YOUR_MARKETING', depth: 3, role: 'applied_example' },
    ],
  },
  {
    contextSlug: 'BDTS',
    contentId: 'BDTS-WALLET-WRECKERS',
    contentName: 'Wallet Wreckers: Language That Kills Sales',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'What A Wallet Wrecker Is',
    timestampStart: 0,
    timestampEnd: 440,
    description:
      'Travis defines "wallet wreckers" — language that triggers defensiveness and shuts down the truth serum. Common offenders and what to say instead.',
    body:
      "A wallet wrecker is a phrase that triggers your prospect's defenses and shuts down everything you were trying to learn. 'Let me pick your brain.' 'Can I get your thoughts on something?' 'I just want to understand your business.' These sound harmless but every one of them puts the prospect on guard.\n\nThe fix isn't better phrasing — it's a fundamentally different stance. Instead of asking them to share with you, share something first that shows you already did the work. Then ask a question that assumes they're smart and busy. 'Here's what I'm seeing in [their market]. Does that match what you're seeing, or am I off?' Now you're giving, not taking. That's the truth serum.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/bdts/wallet-wreckers?t=0',
    links: [
      { conceptSlug: 'BOTTOM_DOLLAR_TRUTH_SERUM', depth: 5, role: 'primary_teaching' },
      { conceptSlug: 'NEEDINESS_ELIMINATION', depth: 3, role: 'applied_example' },
    ],
  },
  {
    contextSlug: 'PSM',
    contentId: 'PSM-CONVERSATION-FLOW',
    contentName: 'Conversation Flow After Hand-Raise',
    format: 'VIDEO',
    chunkIndex: 1,
    chunkHeading: 'Finding the Opening',
    timestampStart: 0,
    timestampEnd: 600,
    description:
      "What to listen for after a T2. Travis walks through how to identify the 'opening' — the specific thing the prospect already wants help with.",
    body:
      "After the T2 — the one-question reply — you're listening for the opening. The opening is the specific thing this person is already trying to do, already wants to do, and needs help with. Not something you pitch. Something they named.\n\nCommon openings: 'I've been meaning to X but haven't had time' (capacity problem — you can run X for them). 'Our [offer] used to sell like hotcakes and now it's flat' (positioning problem — you can reposition). 'I've got [asset] I've never really monetized' (underutilized asset problem — you can leverage it with them).\n\nOnce you hear an opening, your next message is short. Name the opening. Propose one specific next step — usually a 30-minute call. Don't oversell. You're the chooser, not the seller.",
    linkUrl: 'https://big-mojo.mykajabi.com/products/psm/conversation-flow?t=0',
    links: [
      { conceptSlug: 'COFFEE_DATE_MODEL', depth: 5, role: 'primary_teaching' },
      { conceptSlug: 'BOTTOM_DOLLAR_TRUTH_SERUM', depth: 4, role: 'applied_example' },
      { conceptSlug: 'NEEDINESS_ELIMINATION', depth: 3, role: 'applied_example' },
    ],
  },
];

export async function seedSampleContent() {
  await ensureBeamContext();

  // Parse the real Beamer sample (embedded at build time)
  const { file: beamerFile } = parseChunkedMarkdown(BEAMER_SAMPLE_MARKDOWN);

  let ingestedReal = 0;
  const realSourceIds: string[] = [];

  if (beamerFile) {
    for (const chunk of beamerFile.chunks) {
      const row = await Sources.upsert(['contentId', 'chunkIndex'], {
        contextSlug: 'BEAM',
        contentId: beamerFile.contentId,
        contentName: beamerFile.contentName,
        format: beamerFile.type,
        chunkIndex: chunk.chunkIndex,
        chunkHeading: chunk.chunkHeading,
        timestampStart: chunk.timestampStart,
        timestampEnd: chunk.timestampEnd,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        description: chunk.description,
        body: chunk.body,
        bodyHash: chunk.bodyHash,
        linkUrl: chunk.linkUrl ?? undefined,
      });
      realSourceIds.push(row.id);
      ingestedReal += 1;
    }

    // Auto-link the Beamer chunks to the Coffee Date Model and Giving Funnel concepts
    // (since the Beamer sample is primarily about partnership coffee dates).
    if (realSourceIds.length > 0) {
      await db.batch(
        ...realSourceIds.flatMap((sid) => [
          ConceptSources.upsert('linkKey', {
            linkKey: conceptSourceLinkKey('COFFEE_DATE_MODEL', sid),
            conceptSlug: 'COFFEE_DATE_MODEL',
            sourceId: sid,
            depth: 5,
            role: 'primary_teaching',
            extract: 'Coffee dates for partnerships — the foundational training.',
          }),
          ConceptSources.upsert('linkKey', {
            linkKey: conceptSourceLinkKey('GIVING_FUNNEL', sid),
            conceptSlug: 'GIVING_FUNNEL',
            sourceId: sid,
            depth: 4,
            role: 'applied_example',
          }),
        ])
      );
    }
  }

  // Seed synthetic chunks
  let ingestedSynthetic = 0;
  for (const sc of SYNTHETIC_CHUNKS) {
    const row = await Sources.upsert(['contentId', 'chunkIndex'], {
      contextSlug: sc.contextSlug,
      contentId: sc.contentId,
      contentName: sc.contentName,
      format: sc.format,
      chunkIndex: sc.chunkIndex,
      chunkHeading: sc.chunkHeading,
      timestampStart: sc.timestampStart,
      timestampEnd: sc.timestampEnd,
      pageStart: null,
      pageEnd: null,
      description: sc.description,
      body: sc.body,
      bodyHash: sha256(sc.body),
      linkUrl: sc.linkUrl,
    });
    ingestedSynthetic += 1;

    // Link concepts
    for (const link of sc.links) {
      await ConceptSources.upsert('linkKey', {
        linkKey: conceptSourceLinkKey(link.conceptSlug, row.id),
        conceptSlug: link.conceptSlug,
        sourceId: row.id,
        depth: link.depth,
        role: link.role,
      });
    }
  }

  return { ingestedReal, ingestedSynthetic };
}
