# getConcept

Fetch a concept's full details: description, linked North Stars (strategic framing), linked Skills (what you do with it), and top source chunks ordered by depth.

## When to use

- After `searchConcepts` returns a match — get the full picture.
- When the student explicitly names a concept and you want full context + source citations.
- When you need to cite a specific teaching — the returned `topSources` have context, timestamp, and link metadata ready for citation chips.

## Parameters

- `slug` (required): The concept's stable slug (e.g. `GIVING_FUNNEL`, `COFFEE_DATE_MODEL`, `CD3_FORMULA`). Get this from a prior `searchConcepts` call.
- `maxSources` (optional): Default 3. How many top source chunks to return. Use 1-2 for quick references, 3-5 for deep explanations.

## Returned

- `concept`: full description + essence + aliases
- `northStars`: which strategic outcomes this concept serves
- `linkedSkills`: skills that use this concept (useful to offer "want to run the workflow on this?")
- `topSources`: source chunks with `sourceId`, `contextSlug`, `contextName`, `contentName`, `chunkHeading`, `locator` (like "14:22"), `depth`, `role`, `linkUrl`. Use these in citations.

## Presenting to the student

When you cite a source, direct the student to the specific moment, not just the course: "go watch *Fast Action Plan* in Beamer at 14:22 — it's about a five-minute stretch." Include the citation markers `[1]`, `[2]` in your reply text — the frontend renders them as clickable chips.
