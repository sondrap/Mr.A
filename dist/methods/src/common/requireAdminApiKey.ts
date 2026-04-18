import { auth } from '@mindstudio-ai/agent';

// Gate for API-interface methods that require an admin API key.
// Uses the platform's api-key auth: the request's Bearer token resolves to a user,
// which must have the 'admin' role.
export function requireAdminApiKey(): void {
  auth.requireRole('admin');
}
