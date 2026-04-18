---
name: ETL → MRA Ingestion Handoff
description: The exact file format, chunking rules, and required metadata that MRA's ingestion pipeline expects. Use this to configure your upstream ETL so its output plugs directly into MRA.
---

# ETL → MRA Ingestion Handoff

This document is the contract between your upstream ETL (SimplyAI, manual chunking, or whatever tooling you use to transform Travis's raw content) and MRA's ingestion pipeline. If your ETL produces files that match this spec, MRA ingests them cleanly with no fallbacks, no warnings, and no missing citations.

The spec below is intentionally narrow: it lists only what MRA actually uses. Any extra metadata your ETL wants to include can stay in the files — MRA will simply ignore it. Adding noise to the files is safe; missing required fields is not.

## How to submit files to MRA

At scale (1500+ files, 15k-45k chunks), MRA's ingestion pipeline is driven by a REST API, not manual upload. Your ETL calls these endpoints with an admin API key.

### Authentication

Generate an API key in the MRA admin console (`ADMIN → API Keys → Create Key`). The key is shown once; store it in your ETL's environment. All ingestion endpoints require:

```
Authorization: Bearer sk_your_admin_key_here
```

### Endpoints

**Ingest a single file**
```
POST https://{your-app}.msagent.ai/_/api/ingest/source
Content-Type: application/json
Authorization: Bearer sk_...

{
  "filename": "BEAM-M02.md",
  "content": "---\ncontent_id: \"BEAM-M02\"\n..."
}
```

Response (fast, <1s):
```
{
  "jobId": "job_abc123",
  "fileId": "BEAM-M02",
  "chunksParsed": 12,
  "chunksIngested": 12,
  "errors": [],
  "conceptLinkingStatus": "queued"
}
```

The file is parsed synchronously and `sources` rows are upserted immediately. Concept-linking runs async in the background; poll the status endpoint if you care when it's done.

**Batch ingest**
```
POST https://{your-app}.msagent.ai/_/api/ingest/batch
Content-Type: application/json
Authorization: Bearer sk_...

{
  "files": [
    { "filename": "BEAM-M02.md", "content": "..." },
    { "filename": "BEAM-M03.md", "content": "..." }
  ]
}
```

Max 50 files per request. Response is a per-file result array.

**Check ingestion status**
```
GET https://{your-app}.msagent.ai/_/api/ingest/status/:jobId
Authorization: Bearer sk_...
```

Returns current state of the ingestion job including concept-linking progress, any per-chunk errors, and surfaced candidate concepts.

**Manage contexts**
```
GET  https://{your-app}.msagent.ai/_/api/contexts
POST https://{your-app}.msagent.ai/_/api/contexts
```

Use `POST /_/api/contexts` to declare a new Context before ingesting files that reference it. Body:
```
{ "id": "BEAM", "name": "Beamer 2.0", "description": "...", "aliases": ["beamer", "BEAM"] }
```

### Keeping content in sync over time

Content evolves. Transcripts get corrected. Videos get re-chunked. Courses get retired. The sync endpoints below let your ETL reconcile MRA's state with your local ETL output incrementally.

**Replace all chunks for a file (use this for re-chunked content)**
```
POST https://{your-app}.msagent.ai/_/api/ingest/sync-file
Content-Type: application/json
Authorization: Bearer sk_...

{
  "filename": "BEAM-M02.md",
  "content": "---\ncontent_id: \"BEAM-M02\"\n..."
}
```

Same body shape as `/_/api/ingest/source`, but first deletes all existing chunks for the file's `content_id` (and their concept links), then ingests fresh. Use this when a file has been re-chunked or substantially restructured. For simple content edits (same chunks, updated bodies), the regular `/_/api/ingest/source` is fine.

**Delete all chunks for a file**
```
DELETE https://{your-app}.msagent.ai/_/api/sources/:contentId
Authorization: Bearer sk_...
```

Removes all chunks for `:contentId` (e.g. `BEAM-M02`) and cascades to their `concept_sources` links. Use when retiring a file.

**Delete a single chunk**
```
DELETE https://{your-app}.msagent.ai/_/api/sources/:sourceId
Authorization: Bearer sk_...
```

Removes one specific chunk by its stable ID (e.g. `BEAM-M02-07`). Cascades to its concept links.

**Get the content manifest (for diffing)**
```
GET https://{your-app}.msagent.ai/_/api/sources/manifest
Authorization: Bearer sk_...
```

Returns a lightweight listing of every `content_id` in MRA with chunk count, body-hash summary, and last-updated timestamp. Your ETL compares this to its local state and only re-posts what changed.

```json
{
  "generatedAt": "2026-04-17T10:00:00Z",
  "totalSources": 28472,
  "files": {
    "BEAM-M02": { "chunks": 12, "hash": "sha256:abc...", "lastUpdated": "2026-04-10T14:22:00Z" }
  }
}
```

### The canonical sync pattern

Run this on a schedule or after a content drop:

```
1. manifest = GET /_/api/sources/manifest
2. For each file in your local ETL output:
     compute local hash (sha256 of canonicalized chunk bodies + metadata)
     if file not in manifest OR local hash differs from manifest hash:
        POST /_/api/ingest/sync-file with the full file content
3. For each content_id in the manifest but NOT in your local ETL output:
     DELETE /_/api/sources/:contentId
```

Idempotent. Safe to retry. Partial failures don't corrupt state.

**Computing the local hash to match MRA's manifest hash:**
For each file, concatenate the chunk bodies in chunk-index order with a `\n---\n` separator, sha256 the result. The MRA side computes the hash the same way on ingest. (If your ETL's computed hash doesn't match exactly, that just means a sync-file runs — no correctness risk, just slightly more work than necessary.)


### Scale and rate limits

- A full 1500-file ingestion (~30k chunks) takes **30-90 minutes** on Haiku-class models for concept-linking
- Concept-linking runs 10-20 parallel task agents inside the platform; you do not need to parallelize from your side
- API requests are rate-limited to a sensible per-key ceiling; the ETL should use the batch endpoint when possible and back off on 429 responses
- Ingestion is idempotent (upsert on stable ID), so re-running after a partial failure is safe

### Companion CLI

For ad-hoc ingestion from a local machine, a small CLI wrapper is published as `@mra/ingest`:

```bash
export MRA_URL=https://{your-app}.msagent.ai
export MRA_API_KEY=sk_...
npx @mra/ingest ./path/to/chunks/
```

Walks the directory, POSTs each `.md` file to `/_/api/ingest/source`, handles retries and rate limiting, reports results. Source for the CLI lives alongside MRA; it is not required — any HTTP client works.

### Ingestion UI (for spot fixes only)

The admin console's Content tab also accepts drag-and-drop upload of individual files for ad-hoc testing. This is the right tool for fixing a single bad chunk, not for bulk work. For everything else, use the API.


## File layout

One markdown file per unit of content. A "unit of content" is whatever granularity your ETL produces — typically one video, one workshop session, one document, or one coaching call. A single video with multiple segments is one file with many chunks.

- One file = one Travis content asset
- One file contains N chunks (one per meaningful segment of the asset)
- Files are placed in a directory that the admin points MRA at during ingestion
- Filename is cosmetic; the stable identifier lives inside the file. Suggested pattern: `{content_id}.md` (e.g. `BEAM-M02.md`).

## File structure

Every file has two parts: a single YAML frontmatter block at the top describing the whole asset, then one or more chunk sections in the body.

```
---
<file-level frontmatter — REQUIRED fields below>
---

## Chunk 1: 00:00:06 - 00:05:52 | Starting Coffee Dates for Partnerships
**Description:** Travis opens the training by polling attendees...
**Source Link:** https://big-mojo.mykajabi.com/products/beamer/...

[full transcript or document text for this chunk]

---

## Chunk 2: 00:05:52 - 00:11:23 | Market-Driven Marketing Strategies
**Description:** ...
**Source Link:** https://big-mojo.mykajabi.com/...

[full text of this chunk]

---

[additional chunks follow the same pattern]
```

## File-level frontmatter (YAML)

The YAML block at the top of the file describes the whole asset. MRA uses a small, specific set of fields — extras are ignored.

### Required fields

These must be present and non-empty. Missing any of these blocks the file from ingesting:

| Field | Type | Purpose |
|---|---|---|
| `content_id` | string | Stable unique identifier for this asset. Used as the prefix of every chunk's source ID. Kebab/snake/screaming-snake all fine; keep it consistent and stable across re-ingestion. |
| `content_name` | string | Human-readable name of the asset. Appears in citation chips. |
| `inventory_parent_content_id` | string | The Context this asset belongs to (the course/program ID). Must match a context `id` in MRA's ontology (e.g. `CDODU`, `PSM`, `BDTS`, `CDODC`). If your parent ID doesn't map to a known Context, the file is rejected with a clear error. |
| `type` | enum | What kind of asset this is. One of: `VIDEO` / `DOCUMENT` / `LESSON` / `WORKSHOP` / `COACHING_CALL`. Determines whether UI shows timestamps or page numbers. |

### Optional (preserved, not required)

Include these when available; leave them out when not:

| Field | Type | Purpose |
|---|---|---|
| `inventory_parent_content_name` | string | Human-readable Context name. Cosmetic — MRA reads this from its own Context table, but having it in the file helps humans skim. |
| `link_live` | string (URL) | Default Kajabi URL for the asset. Per-chunk `Source Link` overrides this; include at the file level as a fallback so MRA can use it if a chunk omits its own link. |
| `video_duration` | string (`HH:MM:SS`) | For videos. Only used to sanity-check that chunk timestamps don't exceed duration. Not surfaced in UI. |

### Ignored but allowed

Fine to include (no error, no warning), but MRA does not read them:

- `topic`, `subtopic`
- `keywords`
- `context` (the YAML-level field — confusing because it's unrelated to our Context table)
- `platform`
- `creation_date`
- `format_tag`
- Any other field your ETL wants to preserve

The concept layer inside MRA supersedes topics, subtopics, keywords, and format tags. Including them in files is fine and forward-compat, but they don't drive behavior.

## Chunk structure

Each chunk is a markdown `## Chunk N: ...` heading followed by a short metadata block and the chunk body, separated from the next chunk by a horizontal rule (`---`) or simply a new `## Chunk N+1:` heading.

### The chunk heading line

This single line is load-bearing. Parse format:

```
## Chunk {index}: {locator} | {title}
```

- `{index}` — sequential integer starting at 1, restart per file. Combined with `content_id` to form the stable source ID (`{content_id}-{index}` padded to 2 digits, e.g. `BEAM-M02-01`).
- `{locator}` — depends on asset `type`:
  - For `VIDEO`: a timestamp range `HH:MM:SS - HH:MM:SS` (e.g. `00:05:52 - 00:11:23`). Seconds precision required; hours optional for short videos.
  - For `DOCUMENT`: a page range `p. {start}` or `p. {start}-{end}` (e.g. `p. 4-6`). Single page is fine as `p. 4`.
  - For `LESSON`, `WORKSHOP`, `COACHING_CALL`: use the timestamp format if audio/video timing exists, otherwise omit the locator (the parser accepts missing locators — just don't emit a blank `|`).
- `{title}` — human-readable section title. Shown in the source side panel when a student clicks a citation.

Examples:
```
## Chunk 1: 00:00:06 - 00:05:52 | Starting Coffee Dates for Partnerships
## Chunk 7: 01:42:15 - 01:48:30 | Avoiding Wallet Wreckers
## Chunk 3: p. 12-14 | The T1 Template
## Chunk 1: Draft Offer Structure    (no locator — only acceptable for non-timed assets)
```

### Chunk metadata block (two specific lines)

Right after the `## Chunk N:` heading, two specific bolded-key lines can appear. Order doesn't matter; both are optional per-chunk as long as they resolve somehow:

- `**Description:** {one-sentence summary of the chunk's content}` — surfaced in the source side panel when a student clicks a citation. Also passed to the concept-linker task agent to help it understand the chunk without re-reading the full body. If missing, MRA derives a description from the body at ingest time (lower quality, but works).
- `**Source Link:** {URL}` — the Kajabi (or equivalent) URL to this exact chunk. **Strongly recommended to include a timestamp fragment** (e.g. `?t=352` for 5:52, or `#t=14:22`) so clicking "OPEN AT 14:22" in MRA's source side panel takes the student directly to the exact moment in the video, not just the course page. Kajabi supports `?t=seconds` in its video player URLs. Falls back to the file-level `link_live` if the per-chunk `Source Link` is omitted, but the per-chunk version is what should carry the timestamp fragment. Why this matters: Mr. A's job when recommending content is to point students to specific moments, not generic courses. Saying "go watch Beamer" is useless; saying "go watch *Fast Action Plan* at 14:22" is actionable — and clicking the citation should open that exact moment with no further seeking. That only works if the Source Link includes a timestamp fragment.

Other bolded-key lines your ETL emits (`**Format:**`, `**Part of:**`, etc.) are accepted and ignored. No need to strip them out.

### Chunk body

Everything between the metadata lines and the next `## Chunk N+1:` heading (or end of file, or `---` separator) is the chunk body. This is the primary retrieval target — what Mr. A searches, what gets passed to the concept-linker, what gets shown in the source side panel.

Body is markdown. Preserve:
- Paragraph breaks
- Travis's actual language, ums, asides, digressions
- Speaker labels if present (`Travis:`, `Attendee:`)
- Inline emphasis if the transcriber used it

Do not preserve in the body:
- Timestamps inside the body text (e.g. `[14:22]` inline markers) — strip these or keep them, MRA is fine either way, but they add noise for retrieval.
- Transcription confidence markers like `[inaudible]` — safe to keep.

**Target chunk length: 500–2000 words.** Shorter is fine (a quick aside can be its own chunk if it contains a distinct idea). Longer than 2000 words means the chunk is covering too many ideas — split it. Splitting should happen at natural transitions (topic shift, Q&A boundary, new section heading), not at arbitrary word counts.

### Chunk separator

Chunks are separated by a horizontal rule on its own line:

```
---
```

This is optional but recommended — makes the file more readable. The parser also accepts files where chunks are separated only by a new `## Chunk N+1:` heading with no `---`.

## What MRA does with each chunk at ingest

For reference, so your ETL choices make sense:

1. Parse the `## Chunk N: ...` heading → extract `chunkIndex`, locator, `chunkHeading`.
2. Parse the two metadata lines → extract `description`, `linkUrl`.
3. Everything else under the heading becomes `body`.
4. Compute stable ID: `{content_id}-{chunkIndex:02}` → e.g. `BEAM-M02-01`.
5. Resolve `contextId` from `inventory_parent_content_id` against the ontology (reject if no match).
6. Resolve `format` from `type` (reject if not in enum).
7. Upsert into `sources` on `(contentId, chunkIndex)`.
8. After source upsert, run the concept-linker task agent on the chunk → writes rows to `concept_sources`.
9. Concept-linker may also surface new-concept candidates — these go to the admin review queue.

## Minimum viable example file

A complete, ingestable file with only the required fields:

```
---
content_id: "BEAM-M02"
content_name: "Fast Action Plan"
inventory_parent_content_id: "BEAM"
type: "VIDEO"
---

## Chunk 1: 00:00:06 - 00:05:52 | Starting Coffee Dates for Partnerships
**Description:** Travis opens the training with a poll on attendees' partnership experience, then frames the session around the T3 system.
**Source Link:** https://big-mojo.mykajabi.com/products/beamer/lessons/fast-action-plan?t=6

[transcript body here]

---

## Chunk 2: 00:05:52 - 00:11:23 | Market-Driven Marketing Strategies
**Description:** Travis walks through letting-the-market-write-your-marketing, contrasting it with guessing your way into a niche.
**Source Link:** https://big-mojo.mykajabi.com/products/beamer/lessons/fast-action-plan?t=352

[transcript body here]
```

That file will ingest cleanly, produce two rows in `sources` (`BEAM-M02-01` and `BEAM-M02-02`), get linked to concepts automatically, and every citation will resolve correctly.

## Required Context IDs (must match one of these)

Your `inventory_parent_content_id` must match one of the Context IDs in MRA's ontology. Current v1 list:

- `CDODC` — Coffee Dates on Demand Course
- `CDODU` — Coffee Dates on Demand University
- `BDTS` — Bottom Dollar Truth Serum
- `THREE_WAYS_5K` — 3 Ways to Make $5K in 5 Days (alias `3W5K`)
- `TWO_PAGE_GOOGLE` — 2-Page Google Doc Cash Machine (alias `2PG`)
- `HOPM` — Hopper Millions
- `PSM` — Phoneless Sales Machine
- `B2P` — Bugatti 2-Page Cash Machine
- `ENP` — Email Newsletter Purchase
- `TWENTY_FOUR_HFA` — 24-Hour Flash Auction (alias `24HFA`)
- `ROYALTY_ROCKSTARS` — Royalty Rockstars community

If your ETL is chunking content from a course not in this list (Beamer, for example, was the sample you sent but there's no `BEAM` context yet), either:
1. Add a new Context row to the ontology before ingesting, or
2. Use `inventory_parent_content_id: "UNCATEGORIZED"` — the file still ingests but its citations will show `UNCATEGORIZED` until you reclassify.

~~~
Adding a Context is a small operation in the admin console (or via the ontology JSON file). Takes about 30 seconds. MRA also accepts any of the Context `aliases` as the parent ID (so `inventory_parent_content_id: "coffee dates on demand university"` resolves to CDODU).
~~~

## Error handling at ingest

If a chunk fails to parse, MRA logs a specific error with file, chunk index, and reason — and keeps going with the rest of the file. A file with 50 chunks where chunk 23 is malformed ingests 49 chunks successfully and flags chunk 23 in the ingestion report.

Common errors you'll see in the report:
- `invalid_yaml_frontmatter` — the `---` frontmatter block can't be parsed
- `missing_required_field:{field}` — a required file-level field is missing
- `unknown_context:{id}` — `inventory_parent_content_id` doesn't match any Context or alias
- `invalid_type:{value}` — `type` isn't one of the allowed enum values
- `malformed_chunk_heading` — a `## Chunk N:` line couldn't be parsed
- `duplicate_chunk_index` — two chunks in the same file have the same index

Re-ingesting after fixing an error is idempotent (upsert on stable ID), so you can iterate: run, fix, re-run.

## Summary of what to change in your ETL

If you've been producing files in the format you sent earlier, here's the tight list:

- **Keep:** content_id, content_name, inventory_parent_content_id, inventory_parent_content_name, type, link_live, the `## Chunk N: HH:MM:SS - HH:MM:SS | Title` heading format, `**Description:**`, `**Source Link:**`, the transcript body.
- **Drop-or-keep (doesn't matter):** topic, subtopic, keywords, format_tag, platform, creation_date, video_duration. MRA ignores them.
- **Ensure:** `inventory_parent_content_id` always maps to one of the Context IDs listed above. Add Contexts before ingesting content that doesn't fit the current 11.
- **Target:** 500-2000 word chunks, split at natural transitions.
- **Sanity check:** every chunk has a `**Description:**` line (optional but strongly recommended — makes citations richer and concept linking better).

The format you were already using is ~95% compatible. The main tightening is (1) ensuring the `inventory_parent_content_id` maps to a known Context, and (2) dropping or at least not relying on the keyword/topic metadata, since the concept layer replaces it.
