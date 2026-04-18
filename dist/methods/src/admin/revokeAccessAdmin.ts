import { auth, db } from '@mindstudio-ai/agent';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from '../common/normalizeEmail';
import { applyRevokeToExistingUser } from '../common/promoteAccess';

// Admin-only: revoke an access grant and demote the user back to 'free'.
export async function revokeAccessAdmin(input: { email: string; reason?: string }) {
  auth.requireRole('admin');

  const email = normalizeEmail(input.email);
  if (!email) throw new Error('Email is required.');

  const grant = await AccessGrants.findOne((g) => g.email === email);
  if (!grant) {
    throw new Error('No access grant found for that email.');
  }

  const updated = await AccessGrants.update(grant.id, {
    revoked: true,
    revokedAt: db.now(),
    revokedReason: input.reason ?? null,
  });

  await applyRevokeToExistingUser(email);

  return { grant: updated };
}
