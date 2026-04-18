import { db } from '@mindstudio-ai/agent';

// Allowlist of emails granted paid access. Two source paths:
//   1. Admin manually adds (grantedBy = 'admin')
//   2. Payment system webhook POSTs to /_/api/access/grant (grantedBy = 'payment_system')
// New users whose email matches an active grant are auto-promoted to `student` on login.
interface AccessGrant {
  email: string;                       // normalized lowercased
  plan: 'full' | 'free';
  grantedBy: 'admin' | 'payment_system';
  grantedByUserId?: string | null;     // the admin user id, or null for webhook
  note?: string;                       // order id, transaction id, comp reason, etc
  revoked: boolean;
  revokedAt?: number | null;
  revokedReason?: string | null;
}

export const AccessGrants = db.defineTable<AccessGrant>('access_grants', {
  unique: [['email']],
  defaults: {
    plan: 'full',
    grantedBy: 'admin',
    revoked: false,
  },
});
