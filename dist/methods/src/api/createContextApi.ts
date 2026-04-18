import { auth } from '@mindstudio-ai/agent';
import { Contexts } from '../tables/contexts';

// API endpoint: POST /_/api/contexts
//
// Register a new context (e.g. BEAM before ingesting Beamer material).
export async function createContextApi(input: {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  kajabiProductSlug?: string;
  _request?: unknown;
}) {
  auth.requireRole('admin');

  if (!input.id) throw new Error('id is required');
  if (!input.name) throw new Error('name is required');

  const normalizedSlug = input.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  const existing = await Contexts.findOne((c) => c.slug === normalizedSlug);
  if (existing) return { context: existing, alreadyExisted: true };

  const context = await Contexts.push({
    slug: normalizedSlug,
    name: input.name,
    description: input.description ?? '',
    aliases: input.aliases ?? [],
    kajabiProductSlug: input.kajabiProductSlug,
  });

  return { context, alreadyExisted: false };
}
