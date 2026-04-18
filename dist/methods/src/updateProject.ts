import { auth, db } from '@mindstudio-ai/agent';
import { Projects } from './tables/projects';

// Update mutable project fields: name, partnerName, niche, status (archive/activate).
export async function updateProject(input: {
  projectId: string;
  name?: string;
  partnerName?: string;
  niche?: string;
  status?: 'active' | 'archived';
}) {
  auth.requireRole('student', 'free', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const project = await Projects.get(input.projectId);
  if (!project) throw new Error('Project not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Project not found.');
  }

  const patch: Record<string, unknown> = { lastActivityAt: db.now() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.partnerName !== undefined) patch.partnerName = input.partnerName.trim() || undefined;
  if (input.niche !== undefined) patch.niche = input.niche.trim() || undefined;
  if (input.status !== undefined) patch.status = input.status;

  const updated = await Projects.update(input.projectId, patch);
  return { project: updated };
}
