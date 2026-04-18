import { db } from '@mindstudio-ai/agent';
import { Users } from '../tables/users';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from './normalizeEmail';

// Check whether a user's email matches an active (non-revoked) grant with plan 'full'.
// If yes, ensure their roles include 'student'. Idempotent — safe to call on every session check.
//
// Admin role is never auto-demoted; only the student/free role pair is managed here.
export async function promoteAccessForUser(userId: string): Promise<{
  promoted: boolean;
  demoted: boolean;
  newRoles: string[];
}> {
  const user = await Users.get(userId);
  if (!user || !user.email) {
    return { promoted: false, demoted: false, newRoles: user?.roles ?? [] };
  }

  const emailLower = normalizeEmail(user.email);
  const grant = await AccessGrants.findOne((g) => g.email === emailLower);

  const currentRoles = user.roles ?? [];
  const hasStudentRole = currentRoles.includes('student');
  const hasAdminRole = currentRoles.includes('admin');

  // Active grant: include 'student' role if missing.
  if (grant && grant.plan === 'full' && !grant.revoked) {
    if (!hasStudentRole) {
      const newRoles = Array.from(new Set([...currentRoles, 'student'].filter((r) => r !== 'free')));
      await Users.update(userId, { roles: newRoles });
      return { promoted: true, demoted: false, newRoles };
    }
    return { promoted: false, demoted: false, newRoles: currentRoles };
  }

  // No active grant: if user has student role but not admin, demote to free.
  if (hasStudentRole && !hasAdminRole) {
    const newRoles = currentRoles.filter((r) => r !== 'student');
    if (!newRoles.includes('free')) newRoles.push('free');
    await Users.update(userId, { roles: newRoles });
    return { promoted: false, demoted: true, newRoles };
  }

  // Ensure free role exists as baseline for any user with no elevated roles.
  if (!hasAdminRole && !hasStudentRole && !currentRoles.includes('free')) {
    const newRoles = [...currentRoles, 'free'];
    await Users.update(userId, { roles: newRoles });
    return { promoted: false, demoted: false, newRoles };
  }

  return { promoted: false, demoted: false, newRoles: currentRoles };
}

// Called after a grant is inserted/updated (via admin UI or payment webhook).
// Finds the user with that email (if they've already signed up) and promotes them immediately.
export async function applyGrantToExistingUser(email: string): Promise<{ promoted: boolean }> {
  const emailLower = normalizeEmail(email);
  const user = await Users.findOne((u) => u.email === emailLower);
  if (!user) return { promoted: false };
  const result = await promoteAccessForUser(user.id);
  return { promoted: result.promoted };
}

// Called after a grant is revoked. Finds the user and demotes if they're not also an admin.
export async function applyRevokeToExistingUser(email: string): Promise<{ demoted: boolean }> {
  const emailLower = normalizeEmail(email);
  const user = await Users.findOne((u) => u.email === emailLower);
  if (!user) return { demoted: false };
  const result = await promoteAccessForUser(user.id);
  return { demoted: result.demoted };
}
