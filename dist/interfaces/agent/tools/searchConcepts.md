# searchConcepts

Fuzzy search across Travis's concept catalog by name, alias, or description.

## When to use

- The student asks "what is [thing]?" or "what's [framework]?" — use this first to find the concept.
- The student uses a term you're not certain about (maybe Travis vocabulary, maybe a student's own term) — search to see what maps.
- You need strategic context before answering — find the relevant concept(s) first.

## When NOT to use

- If the student is asking how to *do* something (like "how do I write a T1?"), use `searchSkills` instead. Skills are actions; concepts are ideas.
- If the student already named a specific concept clearly (e.g. "tell me about the Giving FUNnel"), use `getConcept` directly with the slug.

## Parameters

- `query` (required): Natural-language search string. Use the student's exact words when possible.
- `tags` (optional): Array of category tags to filter by (e.g. `['outreach']`, `['psychology']`). Rarely useful unless you're narrowing very broad searches.
- `limit` (optional): Default 5.

## Returned

Array of concepts with slug, name, summary (first line of description, ≤280 chars), tags, and aliases. Pick the best match and call `getConcept(slug)` for full detail.

## Tips

- Batch with related calls: if the student asks about "my outreach strategy," search for multiple relevant concepts in the same turn (`searchConcepts('T1')`, `searchConcepts('cold email')`, `searchConcepts('hand raiser')`) rather than one per turn.
- If search returns nothing relevant, that's a signal the library doesn't cover this — acknowledge honestly and call `flagKnowledgeGap`.
