import { auth } from '@mindstudio-ai/agent';
import { Artifacts } from './tables/artifacts';
import { Projects } from './tables/projects';

// Agent tool + project detail: list all artifacts in a project.
// Mr. A uses this to discover what the student has already drafted so he can reference or edit them.
export async function listProjectArtifacts(input: { projectId: string }) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const project = await Projects.get(input.projectId);
  if (!project) throw new Error('Project not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Project not found.');
  }

  const artifacts = await Artifacts
    .filter((a) => a.projectId === input.projectId && !a.archived)
    .sortBy((a) => a.updated_at)
    .reverse();

  return {
    artifacts: artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      version: a.version,
      reviewVerdict: a.reviewVerdict ?? null,
      updatedAt: a.updated_at,
      bodyPreview: a.body.slice(0, 200),
    })),
  };
}
