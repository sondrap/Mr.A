import { auth } from '@mindstudio-ai/agent';
import { Users } from './tables/users';
import { promoteAccessForUser } from './common/promoteAccess';

// Fetch the current user with roles, profile fields, and the onboarding flag.
// Idempotently enforces the access allowlist: on every call, we check if the user's email
// is on the allowlist and promote them to 'student' if so. Safe to call on every frontend render.
//
// Returns null if unauthenticated (e.g. on the login page).
export async function getCurrentUser() {
  if (!auth.userId) {
    return { user: null };
  }

  // Auto-promote based on access_grants. No-op if already correct.
  await promoteAccessForUser(auth.userId);

  const user = await Users.get(auth.userId);
  if (!user) {
    return { user: null };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles ?? ['free'],
      displayName: user.displayName || firstNameFromEmail(user.email),
      avatarUrl: user.avatarUrl,
      onboardedAt: user.onboardedAt ?? null,
      recommendationsOptOut: user.recommendationsOptOut ?? false,
      createdAt: user.created_at,
    },
  };
}

// Cheap display-name fallback if the user hasn't set one. Handles emails like "jamie@acme.com".
function firstNameFromEmail(email: string | undefined): string {
  if (!email) return 'Friend';
  const local = email.split('@')[0] ?? '';
  // Strip numbers and common separators; title-case first chunk.
  const clean = local.replace(/[._+]/g, ' ').replace(/\d+/g, '').trim();
  const first = clean.split(/\s+/)[0] ?? '';
  if (!first) return 'Friend';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
