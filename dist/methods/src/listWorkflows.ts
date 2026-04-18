import { auth } from '@mindstudio-ai/agent';

// Static catalog of workflows available in v1. Returned with lock state computed from the caller's role.
// Frontend uses this to render the workflows section of the left rail + the workflow catalog.
export async function listWorkflows() {
  auth.requireRole('student', 'free', 'admin');

  const isPaid = auth.hasRole('student', 'admin');

  const workflows = [
    {
      slug: 'validate-niche',
      name: 'Validate Your Niche',
      shortName: 'Niche Validator',
      description:
        'Sharpen who you serve. Not "people" — something specific enough that you can see the ' +
        'partners, the offers, and the money that already moves in that market.',
      totalSteps: 1,
      unlocked: true,                               // Always unlocked, even for free tier
      accentLabel: isPaid ? 'ALL STUDENTS' : 'FREE ACCESS',
    },
    {
      slug: 'coffee-dates-giving-funnel',
      name: 'Coffee Dates + Giving Funnel',
      shortName: 'Coffee Dates',
      description:
        'The full end-to-end for finding and landing joint-venture partners. Six steps from niche ' +
        'to first yes — prospect research, attraction video, Skool setup, T1/T2/T3 outreach, and ' +
        'response iteration.',
      totalSteps: 6,
      unlocked: isPaid,
      accentLabel: isPaid ? null : 'PAID ACCESS',
    },
  ];

  return { workflows };
}
