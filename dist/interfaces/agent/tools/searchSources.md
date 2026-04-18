# searchSources

Full-text search directly over raw source chunks (Travis's transcripts and documents). Use when concept/skill-level retrieval is too indirect.

## When to use

- Student asks for a specific Travis quote or phrasing they remember ("didn't Travis say something about the 'wallet wreckers'?" → searchSources("wallet wreckers")).
- Student asks about a specific timestamp or course section.
- You already have a concept/skill context and want to drill deeper into the exact teaching moments.

## When NOT to use

- As a first move for "what is X" questions — start with `searchConcepts`.
- For "how do I X" questions — start with `searchSkills`.
- For broad strategic framing — start with `listNorthStars`.

## Parameters

- `query` (required): The specific phrase or concept name to search for.
- `contextSlug` (optional): Restrict to a specific course (e.g. `CDODU`, `PSM`). Useful when the student says "show me the part of Beamer about X."
- `conceptSlug` (optional): Restrict to sources already linked to a specific concept.
- `limit` (optional): Default 5.

## Returned

Array of matching source chunks with `sourceId`, `contextSlug`, `contextName`, `contentName`, `chunkHeading`, `description`, `locator`, `linkUrl`, `bodyPreview` (320 chars). Follow up with `getSource(id)` for the full body.
