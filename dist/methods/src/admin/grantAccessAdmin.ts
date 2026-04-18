import { auth, db } from '@mindstudio-ai/agent';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from '../common/normalizeEmail';
import { applyGrantToExistingUser } from '../common/promoteAccess';

// Admin-only: add an email to the access allowlist from the admin console UI.
// If the user has already signed up, they're promoted immediately; otherwise the grant is
// pre-recorded and takes effect on their next login.
export async function grantAccessAdmin(input: {
  email: string;
  plan?: 'full' | 'free';
  note?: string;
}) {
  auth.requireRole('admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const email = normalizeEmail(input.email);
  if (!email) throw new Error('Email is required.');

  const grant = await AccessGrants.upsert('email', {
    email,
    plan: input.plan ?? 'full',
    grantedBy: 'admin',
    grantedByUserId: auth.userId,
    note: input.note ?? '',
    revoked: false,
    revokedAt: null,
    revokedReason: null,
  });

  await applyGrantToExistingUser(email);

  return { grant };
}
