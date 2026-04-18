# getArtifact

Fetch an artifact's full content.

## When to use

- When the student references their artifact and you need to see it to give useful feedback.
- Before proposing edits — always read the current version first.
- When the student says "what do you think of my draft?" or "can you review this?"

## Parameters

- `id` (required): Artifact ID (system UUID).

## Returned

Full artifact with body (markdown or JSON string depending on type), version, reviewVerdict, reviewIssues, reviewSuggestions, citedSourceIds.

## Body format note

Artifacts produced by workflow steps are JSON (bodyFormat: 'json'). Parse the body as JSON to access structured fields (e.g. for an outreach pack: t1Email, t2Conversation, t3Skeleton). For markdown-format artifacts (notes, custom), the body is straight markdown.

## Tips

- If the artifact has `reviewVerdict === 'surface_issues'`, the generator flagged concerns. Acknowledge these honestly — don't pretend the artifact is clean.
- If you want to save an edited version, use `saveArtifactDraft` with the updated body.
