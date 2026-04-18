import { auth } from '@mindstudio-ai/agent';
import { Artifacts } from './tables/artifacts';
import { Projects } from './tables/projects';

// Agent tool + artifact full-page view: fetch an artifact's full content + review metadata.
export async function getArtifact(input: { id: string }) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const artifact = await Artifacts.get(input.id);
  if (!artifact) throw new Error('Artifact not found.');

  const project = await Projects.get(artifact.projectId);
  if (!project) throw new Error('Artifact not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Artifact not found.');
  }

  return { artifact };
}
