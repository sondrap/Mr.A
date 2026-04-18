import { auth, db } from '@mindstudio-ai/agent';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from '../common/normalizeEmail';
import { applyRevokeToExistingUser } from '../common/promoteAccess';

// API endpoint: POST /_/api/access/revoke
//
// Called by the payment system on refund or chargeback.
export async function revokeAccessWebhook(input: {
  email: string;
  reason?: string;
  _request?: unknown;
}) {
  auth.requireRole('admin');

  const email = normalizeEmail(input.email);
  if (!email) throw new Error('email is required');

  const grant = await AccessGrants.findOne((g) => g.email === email);
  if (!grant) {
    return { revoked: true, email, userDemoted: false, note: 'No grant existed.' };
  }

  await AccessGrants.update(grant.id, {
    revoked: true,
    revokedAt: db.now(),
    revokedReason: input.reason ?? 'webhook',
  });

  const { demoted } = await applyRevokeToExistingUser(email);

  return {
    revoked: true,
    email,
    userDemoted: demoted,
  };
}
