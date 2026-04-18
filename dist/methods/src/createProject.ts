import { auth, db } from '@mindstudio-ai/agent';
import { Projects } from './tables/projects';

// Create a new project. Free-tier users are allowed to have projects (with the niche workflow only);
// paid students can have multiple with full workflows.
export async function createProject(input: {
  name: string;
  partnerName?: string;
  niche?: string;
}) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const name = input.name?.trim();
  if (!name) throw new Error('Project name is required.');

  const project = await Projects.push({
    userId: auth.userId,
    name,
    partnerName: input.partnerName?.trim() || undefined,
    niche: input.niche?.trim() || undefined,
    status: 'active',
    lastActivityAt: db.now(),
  });

  return { project };
}
