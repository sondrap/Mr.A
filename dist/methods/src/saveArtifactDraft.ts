import { auth, db } from '@mindstudio-ai/agent';
import { Artifacts } from './tables/artifacts';
import { Projects } from './tables/projects';

// Agent tool + inline edit: save an updated body to an artifact.
// Increments the version counter. Clears the review verdict since the edit supersedes the last review.
export async function saveArtifactDraft(input: {
  id: string;
  body: string;
  title?: string;
}) {
  auth.requireRole('student', 'admin');
  if (!auth.userId) throw new Error('Not authenticated.');

  const artifact = await Artifacts.get(input.id);
  if (!artifact) throw new Error('Artifact not found.');

  const project = await Projects.get(artifact.projectId);
  if (!project) throw new Error('Artifact not found.');
  if (project.userId !== auth.userId && !auth.hasRole('admin')) {
    throw new Error('Artifact not found.');
  }

  const patch: Record<string, unknown> = {
    body: input.body,
    version: artifact.version + 1,
    // Edited = review concerns are no longer valid
    reviewVerdict: null,
    reviewIssues: [],
    reviewSuggestions: [],
  };
  if (input.title !== undefined) patch.title = input.title.trim();

  const updated = await Artifacts.update(input.id, patch);

  // Touch the project's last-activity
  await Projects.update(project.id, { lastActivityAt: db.now() });

  return { artifact: updated };
}
