import { auth, db } from '@mindstudio-ai/agent';
import { Users } from './tables/users';

// Mark the first-signup onboarding modal as seen so it doesn't show again.
// Optionally updates displayName if provided (e.g. from an onboarding form).
export async function completeOnboarding(input: { displayName?: string }) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const patch: { onboardedAt: number; displayName?: string } = {
    onboardedAt: db.now(),
  };
  if (input.displayName && input.displayName.trim().length > 0) {
    patch.displayName = input.displayName.trim();
  }

  const user = await Users.update(auth.userId, patch);
  return {
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles ?? [],
      displayName: user.displayName,
      onboardedAt: user.onboardedAt,
    },
  };
}
