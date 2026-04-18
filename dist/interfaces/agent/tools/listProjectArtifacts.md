# listProjectArtifacts

List the artifacts in the current project.

## When to use

- Only when the thread is project-scoped and the student references their own work ("my niche doc," "the T1 I drafted," "the prospect list").
- Before `getArtifact` to find the right one.

## When NOT to use

- In global chat threads (no project context).
- If the student is asking generic questions that don't reference their work.

## Parameters

- `projectId` (required): The ID of the project this thread belongs to. Available in the thread metadata — if you don't have it, the thread is probably not project-scoped.

## Returned

Array of artifacts with id, type, title, version, reviewVerdict, updatedAt, bodyPreview.

## Tips

- The preview is only 200 chars. Use `getArtifact(id)` to read the full content before giving feedback.
- Artifact types: `niche_doc`, `prospect_list`, `attraction_video`, `skool_setup`, `outreach_pack`, `conversation_log`, `notes`, `custom`. Match on type when the student says "my niche doc" etc.
