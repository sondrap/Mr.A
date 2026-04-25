# getSource

Fetch a specific source chunk's full body and metadata, plus the concepts it teaches.

## When to use

- When you need the **full transcript body** to quote Travis's exact words verbatim — not just to know what a chunk teaches.
- When `getConcept`'s `topSources[].extract` strings (the linker's summary of how a chunk teaches the concept) aren't specific enough.

## When NOT to use

- For "what is X" or "explain X" questions, `getConcept` alone usually suffices — its `topSources` array gives you everything needed for citations (sourceId, contextName, contentName, locator, linkUrl) plus the linker's `extract`. **Do not chain `getSource` calls just to read more.** That's slow and rarely necessary.
- For broad searches — use `searchSources` instead.

## ALWAYS batch parallel calls

If you need 3 source bodies, call `getSource` **3 times in the same turn** (parallel). Sequential calls compound latency and make the student wait.

## Parameters

- `id` (required): Source chunk ID (system UUID returned by searchSources).

## Returned

Full source object with: body (full text), chunkHeading, description, locator (formatted), timestampStart/End, pageStart/End, linkUrl, contextSlug/Name, contentName, plus `relatedConcepts` array.

## Tips

- Use the `relatedConcepts` to offer the student additional threads to pull — "this chunk also teaches [other concept], want me to pull that?"
- When citing this source in your reply, include the `locator` in the prose so the student can navigate even without clicking the chip: "go watch *Fast Action Plan* at 14:22."
