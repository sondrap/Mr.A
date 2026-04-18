import { auth } from '@mindstudio-ai/agent';
import { Users } from './tables/users';

// Student-facing toggle: opt out of in-chat offering recommendations.
// Honored by Mr. A at runtime — when true, the agent does not call the offering-recommendation tool.
export async function setRecommendationsOptOut(input: { optOut: boolean }) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  await Users.update(auth.userId, { recommendationsOptOut: input.optOut });
  return { optOut: input.optOut };
}
