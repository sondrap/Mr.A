import { auth, db } from '@mindstudio-ai/agent';
import { Users } from '../tables/users';
import { AccessGrants } from '../tables/access_grants';
import { normalizeEmail } from '../common/normalizeEmail';

// Admin-only: list users with their access state for the Users tab.
export async function listUsers(input: { searchEmail?: string } = {}) {
  auth.requireRole('admin');

  const search = input.searchEmail?.trim().toLowerCase() ?? '';

  const [allUsers, allGrants] = await db.batch(
    Users.sortBy((u) => u.updated_at).reverse(),
    AccessGrants.toArray()
  );

  const grantByEmail = new Map(allGrants.map((g) => [normalizeEmail(g.email), g]));

  const users = allUsers
    .filter((u) => {
      if (!search) return true;
      return u.email?.toLowerCase().includes(search);
    })
    .slice(0, 500)
    .map((u) => {
      const email = u.email ?? '';
      const grant = grantByEmail.get(normalizeEmail(email));
      return {
        id: u.id,
        email,
        displayName: u.displayName,
        roles: u.roles ?? ['free'],
        grantedBy: grant?.grantedBy ?? null,
        grantedAt: grant?.created_at ?? null,
        grantNote: grant?.note ?? null,
        grantRevoked: grant?.revoked ?? false,
        lastActiveAt: u.updated_at,
        createdAt: u.created_at,
      };
    });

  return { users };
}
