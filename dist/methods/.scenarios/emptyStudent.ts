import { db } from '@mindstudio-ai/agent';
import { Users } from '../src/tables/users';
import { AccessGrants } from '../src/tables/access_grants';
import { seedOntology } from './_helpers/seedOntology';
import { seedSampleContent } from './_helpers/seedSampleContent';

// Scenario: brand-new paid student with nothing yet.
// Shows empty states everywhere — dashboard, workflows list, chat list.
// Good for testing the first-signup onboarding modal and the "start your first project" path.
export async function emptyStudent() {
  await seedOntology();
  await seedSampleContent();

  // Paid-tier test user
  const user = await Users.push({
    email: 'jamie.new@example.com',
    roles: ['student'],
    displayName: 'Jamie',
    recommendationsOptOut: false,
  });

  // An active grant so the promote-on-login loop sees them as paid
  await AccessGrants.upsert('email', {
    email: 'jamie.new@example.com',
    plan: 'full',
    grantedBy: 'admin',
    grantedByUserId: null,
    note: 'Seeded for empty-student scenario.',
    revoked: false,
    revokedAt: null,
    revokedReason: null,
  });

  return { userId: user.id };
}
