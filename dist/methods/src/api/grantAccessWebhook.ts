import { auth } from '@mindstudio-ai/agent';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from '../common/normalizeEmail';
import { applyGrantToExistingUser } from '../common/promoteAccess';

// API endpoint: POST /_/api/access/grant
//
// Called by the payment system when a customer completes checkout. Auth via admin API key.
// Idempotent on (email, plan).
export async function grantAccessWebhook(input: {
  email: string;
  plan?: 'full' | 'free';
  note?: string;
  _request?: unknown;
}) {
  auth.requireRole('admin');

  const email = normalizeEmail(input.email);
  if (!email) throw new Error('email is required');
  const plan = input.plan ?? 'full';

  const grant = await AccessGrants.upsert('email', {
    email,
    plan,
    grantedBy: 'payment_system',
    grantedByUserId: null,
    note: input.note ?? '',
    revoked: false,
    revokedAt: null,
    revokedReason: null,
  });

  const { promoted } = await applyGrantToExistingUser(email);

  return {
    granted: true,
    email,
    plan,
    userPromoted: promoted,
    accessGrantId: grant.id,
  };
}
