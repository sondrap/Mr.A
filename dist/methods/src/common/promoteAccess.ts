import { auth, db } from '@mindstudio-ai/agent';
import { Users } from '../tables/users';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from './normalizeEmail';

// Check whether a user's email matches an active (non-revoked) grant with plan 'full'.
// If yes, ensure their roles include 'student'. Idempotent — safe to call on every session check.
//
// Admin role is never auto-demoted; only the student/free role pair is managed here.
//
// Important: roles can live in two places — the platform session (`auth.roles`) and the
// users table (`user.roles`). When a request arrives with platform-level roles that aren't
// yet synced to the users table (e.g. role granted via `mindstudio-prod users set-role`,
// or test infrastructure setting session roles directly), we must merge the two sources
// before deciding the final set, otherwise we'd overwrite platform-level roles with stale
// table data.
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

  // Merge platform session roles into the stored user roles. Either source is authoritative.
  const sessionRoles = (auth.roles ?? []).filter((r) => r !== 'system');
  const storedRoles = user.roles ?? [];
  const currentRoles = Array.from(new Set([...storedRoles, ...sessionRoles]));
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

  // Final sync: if session roles include something the stored roles don't (e.g. platform-level
  // admin role granted via CLI or test infra), write the merged set so future requests see it.
  const storedSet = new Set(storedRoles);
  const merged = currentRoles;
  const hasNewRole = merged.some((r) => !storedSet.has(r));
  if (hasNewRole) {
    await Users.update(userId, { roles: merged });
    return { promoted: false, demoted: false, newRoles: merged };
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
