import { auth } from '@mindstudio-ai/agent';
import { Contexts } from '../tables/contexts';

// API endpoint: GET /_/api/contexts
//
// Returns all contexts so the ETL can check what's already registered before ingesting new content.
export async function listContextsApi(input: { _request?: unknown } = {}) {
  auth.requireRole('admin');
  const contexts = await Contexts.sortBy((c) => c.name);
  return { contexts };
}
