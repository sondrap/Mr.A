# saveArtifactDraft

Save an updated draft to an artifact. Increments the version counter and clears any prior review verdict (since the edit supersedes the last review).

## When to use

- ONLY when the student has explicitly agreed to save the revised version. Never save without confirmation.
- After a back-and-forth iteration where the student says "okay, save that" or "let's use this version."

## When NOT to use

- Don't save on every turn — that pollutes version history.
- Don't save if the student hasn't explicitly confirmed.

## Parameters

- `id` (required): Artifact ID.
- `body` (required): Updated body content.
- `title` (optional): Updated title.

## Returned

The updated artifact.

## Tips

- Before calling, briefly describe what you're saving: "okay, saving the updated T1 with the subject line change." Then call.
- If you're updating a JSON-format artifact, make sure the body is valid JSON matching the original shape. Don't lose structure.
