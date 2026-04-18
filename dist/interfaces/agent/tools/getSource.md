# getSource

Fetch a specific source chunk's full body and metadata, plus the concepts it teaches.

## When to use

- After `searchSources` / `searchConcepts` / `searchSkills` returns a chunk you want to read in full.
- When quoting Travis's exact words requires the full context around the quote.
- When preparing a detailed citation — the return includes `timestampStartFormatted` (like "14:22") ready for the source side panel.

## Parameters

- `id` (required): Source chunk ID (system UUID returned by searchSources).

## Returned

Full source object with: body (full text), chunkHeading, description, locator (formatted), timestampStart/End, pageStart/End, linkUrl, contextSlug/Name, contentName, plus `relatedConcepts` array.

## Tips

- Use the `relatedConcepts` to offer the student additional threads to pull — "this chunk also teaches [other concept], want me to pull that?"
- When citing this source in your reply, include the `locator` in the prose so the student can navigate even without clicking the chip: "go watch *Fast Action Plan* at 14:22."
