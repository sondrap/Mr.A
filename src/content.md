---
name: Content Library
description: How Travis's content is modeled, ingested, and served. Four-layer ontology (North Stars, Concepts, Skills, Contexts) over raw source chunks, with a citation system that traces every answer back to its source.
---

# Content Library

MRA's intelligence comes from a structured library of Travis's content. 20+ years of courses, workshops, coaching calls, and writeups, already chunked with YAML frontmatter. The library is organized as a four-layer ontology on top of the raw source chunks.

## The four layers

**North Stars** — big-picture outcomes every Travis teaching ladders up to. Small, stable set (currently 4): Serve No Master, Acquire & Leverage Assets, Protect Your Time & Energy, Adopt Investor Mindset. Concepts are tagged to one or more North Stars.

**Concepts** — the frameworks and ideas Travis teaches: the Giving FUNnel, Hero Auction, CD³ Formula, 5 Ps, BFOT, Coffee Date Model, Escape from Hell / Entrance into Heaven, and so on. Each concept tags to one or more North Stars.

**Skills** — the capabilities a student puts into practice: Writing a T1 Handraiser Email, Running a Facebook Group Auction, Setting Up a Partner Waiting List. Each skill uses one or more Concepts. Workflow steps map one-to-one to Skills.

**Contexts** — the courses and programs where Travis teaches this material: CDODC, CDODU, BDTS, PSM, 2PG, Royalty Rockstars, 24HFA. Every source chunk belongs to a Context.

Then below these four semantic layers:

**Sources** — the raw YAML-chunked content. Every chunk belongs to one Context. Chunks link to Concepts (many-to-many, with a depth rating) so that retrieval can find primary teachings vs applied examples vs passing mentions.

~~~
Why four layers instead of two (concepts + sources):

- Skills vs concepts is the workflow/chat distinction. A workflow step teaches or runs a skill. The skill uses concepts. Mr. A's coaching inside a step pulls concepts. Conflating skills and concepts collapses that.
- North Stars give Mr. A a way to anchor "why does this matter." Four rows, big semantic payoff.
- Contexts were implicit in source chunks (as `parent_content_name`). Promoting them to a first-class layer gives us richer citations, per-course filtering, and a clean place for course metadata.

The cost of four layers is modest: four small curated tables + the existing sources table. Worth it.
~~~

## Scope of ingestion (what MRA builds vs what you already have)

MRA's ingestion pipeline imports chunks that are **already in the YAML-chunked format** — it does not chunk raw transcripts or PDFs itself. Chunking happens upstream in the user's existing ETL process (SimplyAI / manual / other tooling), which produces the markdown files MRA ingests.

This is the right division of labor:
- **Upstream ETL (outside MRA):** raw transcripts / PDFs / Kajabi exports → YAML-chunked markdown files with the format described below.
- **MRA ingestion (inside MRA):** YAML-chunked markdown files → rows in `sources` + `concept_sources`.

~~~
Automated chunking of raw content is a roadmap item (`Live Content Pipeline`) — watched sources, differential ingestion, auto-chunking from Kajabi directly. For v1, the user's existing ETL output is the input to MRA's ingestion pipeline.
~~~

**ETL handoff spec:** The exact file format, chunking rules, and metadata MRA's ingestion pipeline expects is documented in `src/references/etl-handoff.md`. That document is the contract your upstream ETL should target. If your ETL produces files matching that spec, MRA ingests them cleanly without fallback logic.

## What metadata we use and what we ignore

The YAML chunk format has a lot of fields. MRA uses some and ignores others. Keeping the column for ignored fields is fine (backward compat, future flexibility), but the build should not invest in UI or retrieval logic for them.

**Used (load-bearing):**
- `content_id`, `content_name` — used for citations and the stable source ID
- `inventory_parent_content_id` / `inventory_parent_content_name` — resolves the Context
- `type` / `format_tag` — determines whether UI shows timestamps vs page numbers
- `link_live` — the "open in Kajabi" link
- Video timestamps (`00:00:06 - 00:05:52` in the chunk heading) — essential for citations
- Chunk heading — shown in the source side panel
- Chunk `Description` — shown in the source side panel, helps the concept-linker
- Chunk body (transcript text) — the actual content, used for retrieval and concept linking

**Ignored (kept in schema for forward compat but not used in retrieval or UI):**
- `keywords` — superseded by concept linking
- `topic` / `subtopic` — superseded by Concepts + Contexts
- `flavor_tag` (motivational / strategic / practical / mindset) — nice but not load-bearing
- `creation_date`, `video_duration`, `platform`, `context` (the YAML field, unrelated to our Context layer)

The concept layer does the organizing work that keywords + topics used to do, and does it better (a chunk is linked to N concepts at depths 1-5, vs a flat keyword tag).

## The chunk format

Travis's content is already YAML-chunked. A typical chunk looks like this:

```
---
content_id: "BEAM-M02"
content_name: "Fast Action Plan"
inventory_parent_content_id: "BEAM"
inventory_parent_content_name: "BEAMER 2.0"
topic: "PARTNERING"
subtopic: "JV_PARTNERSHIPS"
type: "VIDEO"
context: "TRANSCRIPT"
platform: "KAJABI"
creation_date: 2026-02-13
video_duration: "3:55:49"
link_live: "https://big-mojo.mykajabi.com/products/beamer/..."
format_tag: "LESSON"
keywords: ["COFFEE DATES", "COLD OUTREACH", "PARTNERS"]
description: >
  Comprehensive training on Travis Sago's T3 system for creating
  revenue-sharing partnerships with established businesses...
---

## Chunk 1: 00:00:06 - 00:05:52 | Starting Coffee Dates for Partnerships
...
[transcript body]
```

One file contains many chunks. The `inventory_parent_content_id` maps to our Context table (e.g. `BEAM` → the Beamer Context).

## Tables

### north_stars

| Field | Type | Notes |
|---|---|---|
| id | string | User-controlled, SCREAMING_SNAKE_CASE (e.g. `SERVE_NO_MASTER`) |
| name | string | Display name |
| description | string | One to two paragraphs |
| aliases | string[] | Phrases students or Travis might use for this North Star |

### concepts

| Field | Type | Notes |
|---|---|---|
| id | string | SCREAMING_SNAKE_CASE (e.g. `GIVING_FUNNEL`) |
| name | string | Display name |
| description | string | The concept explanation. One to two paragraphs. |
| northStarIds | string[] | Array of North Star IDs this concept serves |
| aliases | string[] | Phrases, turns-of-speech, Travis's vernacular |
| essence | string | Optional. Markdown with "What it is" and "When to use" sections, used by Mr. A as coaching context. |
| flavor | enum | `philosophical` / `tactical` / `both` |
| tags | string[] | Category tags: `outreach`, `psychology`, `offer`, `partnership`, `mindset` |

### skills

| Field | Type | Notes |
|---|---|---|
| id | string | SCREAMING_SNAKE_CASE (e.g. `WRITE_T1_HANDRAISER_EMAIL`) |
| name | string | Display name |
| description | string | What the student does. One to two paragraphs. |
| conceptIds | string[] | Array of Concept IDs this skill uses |
| aliases | string[] | Phrases students use to ask about doing this skill |

### contexts

| Field | Type | Notes |
|---|---|---|
| id | string | SCREAMING_SNAKE_CASE (e.g. `CDODC`, `PSM`) |
| name | string | Full display name (e.g. "Coffee Dates on Demand Course (CDODC)") |
| description | string | What the course/program covers |
| aliases | string[] | Alternate names Travis uses |
| kajabiProductSlug | string | Optional. For linking to the source on Kajabi |

### sources
One row per chunk. Only the load-bearing fields get dedicated columns; the rest are ignored.

| Field | Type | Notes |
|---|---|---|
| id | string | Stable ID: `{contentId}-{chunkIndex}` (e.g. `BEAM-M02-01`) |
| contextId | string | Foreign key to `contexts.id` |
| contentId | string | Inner content identifier from YAML (e.g. `BEAM-M02`) |
| contentName | string | Inner content name (e.g. "Fast Action Plan") |
| format | string | `VIDEO` / `DOCUMENT` / `LESSON` / `WORKSHOP` / `COACHING_CALL` |
| chunkIndex | number | Position within the file |
| chunkHeading | string | The inline `##` heading (e.g. "Starting Coffee Dates for Partnerships") |
| timestampStart | number \| null | Seconds, for video chunks. Null for documents. |
| timestampEnd | number \| null | Seconds, for video chunks. Null for documents. |
| pageStart | number \| null | Page number, for document chunks. Null for video. |
| description | string | The pre-written chunk description from the markdown body |
| body | string | Full text of the chunk — the main retrieval target |
| bodyHash | string | sha256 of body at ingest time, used for change detection and the manifest endpoint |
| linkUrl | string | Kajabi URL to the original content |

~~~
The source `id` is user-controlled (`{contentId}-{chunkIndex}`) so re-ingestion is idempotent. On ingestion we upsert on `(contentId, chunkIndex)`. System columns (`created_at`, `updated_at`, `last_updated_by`) are added by the platform automatically.

`bodyHash` is computed at ingest time (sha256 of the chunk body) and powers the manifest endpoint, letting the ETL diff its local state against what's live without downloading every chunk body.

Fields like `topic`, `subtopic`, `keywords`, `flavorTag`, `creationDate`, `videoDuration`, `platform` are intentionally NOT stored. The concept layer supersedes them, and carrying columns we don't use adds noise to the schema.
~~~

### concept_sources

Many-to-many link between concepts and sources.

| Field | Type | Notes |
|---|---|---|
| conceptId | string | FK to `concepts.id` |
| sourceId | string | FK to `sources.id` |
| depth | number | 1-5. 5 = primary teaching. 3 = applied example. 1 = passing reference. |
| role | enum | `primary_teaching` / `applied_example` / `reference_mention` |
| extract | string | Optional ~50-200 char snippet showing the concept in action |

## Seed data (v1 ontology)

The initial ontology ships in the app. It lives in `dist/methods/.scenarios/_seed/ontology.json` (generated from `.remy-intake/ontology-seed.json`) and is loaded by the ingestion pipeline on first run.

### North Stars (4)

- `SERVE_NO_MASTER` — Serve No Master: sustainable autonomy through passive revenue
- `ACQUIRE_AND_LEVERAGE_ASSETS` — Acquire & Leverage Assets: underutilized assets deployed across partners
- `PROTECT_TIME_AND_ENERGY` — Protect Your Time & Energy: ruthless prioritization of finite resources
- `ADOPT_INVESTOR_MINDSET` — Adopt Investor Mindset: treating time/energy/creativity as capital

### Concepts (16)

Giving FUNnel, Neediness Elimination, Hero Auction, Losing Bidders Goldmine, CD³ Formula, 5 Ps of Pre-Selling, Bottom Dollar Truth Serum, Buying Frenzy Offer Tool (BFOT), 2-Page Google Doc Cash Machine, Escape from Hell / Entrance into Heaven, Coffee Date Model, Newsletter Acquisition Strategy, Partner Promotion Interview, Old Playbook vs New Playbook, Community as an Asset, Offer Domino.

### Skills (16)

Building Targeted Prospect Lists, Creating Irresistible Fantasy Auctions, Running a Facebook Group Auction, Following Up with Losing Bidders, Scoring an Offer with CD³, Writing a T1 Handraiser Email, Creating a Microwave Offer in a Google Doc, Using the BFOT Worksheet, Applying Truth Serum Questioning, Pre-Selling with the 5 Ps, Purchasing an Email Newsletter, Setting Up a Partner Waiting List, Delivering Value Before Selling (Sampling), Setting Up Cold Email Infrastructure, Researching Partners, Making Offers.

### Contexts (11)

CDODC (Coffee Dates on Demand Course), CDODU (Coffee Dates on Demand University), BDTS (Bottom Dollar Truth Serum), 3W5K (3 Ways to Make $5K in 5 Days), 2PG (2-Page Google Doc Cash Machine), HOPM (Hopper Millions), PSM (Phoneless Sales Machine), B2P (Bugatti 2-Page Cash Machine), ENP (Email Newsletter Purchase), 24HFA (24-Hour Flash Auction), Royalty Rockstars.

~~~
Several seed entries have empty descriptions or aliases (COMMUNITY_AS_ASSET, OFFER_DOMINO, RESEARCHING_PARTNERS, MAKING_OFFERS, SETUP_COLD_EMAIL_INFRASTRUCTURE). On first admin login, MRA surfaces a "Complete the ontology" queue in the admin console showing these gaps so the user can fill them in directly. The app ships usable; the ontology tightens over time.

The user's uploaded JSON also contains two duplicate `MAKING_OFFERS` entries. The ingestion seed loader dedupes on `id` (last write wins) and logs a warning.
~~~

## Ingestion entry points

Ingestion runs the same pipeline regardless of how files arrive. There are three entry points:

**1. Admin API (primary path for real content).** Admins have an API key; the ETL posts files directly.
- `POST /_/api/ingest/source` — single file, body is the markdown content. Returns immediately once the file is parsed and sources are upserted; concept-linking runs async.
- `POST /_/api/ingest/batch` — array of files (max 50 per request) for drops of new content.
- `GET /_/api/ingest/status/:jobId` — poll an ingestion job's progress (total chunks, processed, errors, new-concept candidates).
- `POST /_/api/contexts` / `GET /_/api/contexts` — programmatic Context management so the ETL can declare new Contexts (like `BEAM`) before posting content for them.

**2. Admin UI drag-and-drop (ad-hoc path for spot fixes).** The admin console's Ingestion panel accepts drag-and-drop of one or many files for manual testing, fixing a bad chunk, or small updates. Runs the same backend as the API.

**3. Dev scenarios (build/test path).** Scenarios seed a curated sample directly into the database for development. Not used in production.

~~~
At scale (1500+ files, 15k-45k chunks), the API is the only realistic path. The CLI companion `npx mra-ingest <dir>` walks a directory and POSTs each file with retry and rate-limit handling. Admin API keys are generated from the admin console.

Concept-linking runs in parallel (10-20 task agents in flight per ingestion job). Full-library ingestion of 30k chunks takes ~30-90 minutes on Haiku-class models and costs tens to low hundreds of dollars in model fees total.
~~~

## Keeping content in sync

Content evolves. Travis updates courses, transcripts get corrected, files get re-chunked, assets get retired. MRA's ingestion primitives are designed for continuous sync, not one-shot imports.

### The three change cases

1. **A chunk's content changes** (transcription fix, description rewrite). Re-posting the file via `/_/api/ingest/source` handles this — stable IDs mean upsert, not duplicate.
2. **A file is re-chunked** (Travis re-records a video; chunk 5 becomes chunk 6; 19 chunks becomes 22). Requires replacing all chunks for that `content_id`, not just upserting. Use `/_/api/ingest/sync-file`.
3. **Content is retired** (a course is pulled, a chunk is merged away). Requires explicit deletion. Use `DELETE /_/api/sources/:contentId` or `/_/api/sources/:sourceId`.

### Sync endpoints

**`POST /_/api/ingest/sync-file`** — "replace all chunks for this content_id with the new version." Same body shape as `/_/api/ingest/source`, but first deletes all existing chunks for the file's `content_id` (and their `concept_sources` links), then ingests fresh. Right call for re-chunked files.

**`DELETE /_/api/sources/:contentId`** — remove all chunks for a content_id. Cascades to `concept_sources`. Use when retiring a file entirely.

**`DELETE /_/api/sources/:sourceId`** — remove one specific chunk (e.g. `BEAM-M02-07`). Cascades to its `concept_sources`.

**`GET /_/api/sources/manifest`** — returns a lightweight listing of every `content_id` in MRA with the count of chunks and a body-hash summary. Lets the ETL diff against its local state and only re-post what changed. Response shape:

```json
{
  "generatedAt": "2026-04-17T10:00:00Z",
  "totalSources": 28472,
  "files": {
    "BEAM-M02": { "chunks": 12, "hash": "sha256:abc123...", "lastUpdated": "2026-04-10T14:22:00Z" },
    "CDODU-W3":  { "chunks": 8,  "hash": "sha256:def456...", "lastUpdated": "2026-03-28T09:15:00Z" }
  }
}
```

The `hash` is an aggregate sha256 over the file's chunk bodies + metadata in a stable order. Equality means nothing changed; inequality means the ETL should re-post the file via `sync-file`.

### Body hash column

Every `sources` row carries a `bodyHash` column (sha256 of the chunk's body at ingest time). This surfaces in the manifest and in the admin console, letting operators see at a glance when a chunk was last updated and detect silent corruption.

### The canonical sync pattern

The ETL runs this on a schedule (nightly, hourly, whatever fits) or on-demand after a content drop:

```
1. manifest = GET /_/api/sources/manifest
2. for each file in ETL's local output:
     compute hash locally
     if file not in manifest OR hash differs:
        POST /_/api/ingest/sync-file (with full file contents)
3. for each content_id in manifest but not in ETL's local output:
     DELETE /_/api/sources/:contentId
```

Idempotent. Running twice back-to-back does nothing the second time. Partial failures are safe to retry.

~~~
The fully-automated version — watched Drive folder, Kajabi webhook on publish, zero-touch sync — is the `Live Content Pipeline` roadmap item. V1 ships the sync primitives (sync-file, delete, manifest). Automation on top is post-MVP.
~~~


## Ingestion pipeline

Admin-triggered. Input: the ontology JSON (loaded once from the seed file) plus a directory of Markdown files with the YAML chunk format. Output: populated `north_stars`, `concepts`, `skills`, `contexts`, `sources`, and `concept_sources` tables.

### Phase 1 — Ontology seed (first run only, and any manual re-seed)

Load the ontology JSON. Upsert each North Star, Concept, Skill, and Context row. This is idempotent and admin-re-runnable.

### Phase 2 — Source import

Parse each markdown file. For each chunk:
1. Resolve the Context by `inventory_parent_content_id` (match against the ontology's context IDs, with alias fallback).
2. Upsert a row in `sources`, keyed on `id = {contentId}-{chunkIndex}`.

Stable keying means re-runs are idempotent.

### Phase 3 — Concept linking

For each newly ingested source chunk, run a task agent that:
1. Reads the chunk's text, description, and keywords.
2. Considers the full concept list (loaded from the DB) as candidates.
3. Identifies which concepts this chunk teaches, at what depth, in what role.
4. Optionally surfaces candidate new concepts the admin should consider adding.

The task agent writes `concept_sources` rows for each link. New concept candidates go to a review queue (surfaced in the admin console).

~~~
Model for concept linking: look up the current best-fit model via `askMindStudioSdk` during build. Each chunk is ~500-2000 words so extraction is cheap and parallelizable. Use `db.batch()` to write many `concept_sources` rows at once.

Structured output example for the task:
{
  links: [
    { conceptId: "GIVING_FUNNEL", depth: 5, role: "primary_teaching", extract: "..." },
    { conceptId: "COFFEE_DATE_MODEL", depth: 3, role: "applied_example", extract: "..." }
  ],
  candidate_new_concepts: [
    { suggestedId: "REVERSE_RFP", suggestedName: "Reverse RFP", evidence: "..." }
  ]
}
~~~

## Retrieval at runtime

Mr. A's tools (defined in full in `interfaces/agent.md`):

- `searchConcepts(query, tags?)` — fuzzy search concepts across name, aliases, description. Returns top 5 with summary.
- `getConcept(id)` — full concept details including linked North Stars, linked Skills, and top 3 source chunks by depth.
- `searchSkills(query)` — fuzzy search skills. Returns top 5 with which concepts each uses.
- `getSkill(id)` — full skill details including linked Concepts and top 3 source chunks across those concepts.
- `searchSources(query, contextFilter?, conceptFilter?)` — full-text search over source bodies, filterable by context or concept.
- `getSource(id)` — full source body with all metadata.
- `listNorthStars()` — returns all four, used occasionally for framing.

These are batchable via `db.batch()`. A typical chat turn is: `searchConcepts` → `getConcept(top)` → parallel `searchSources(within that concept's linked sources)` — all in one network round-trip.

## Citation format in UI

When Mr. A quotes or paraphrases from a source, the frontend renders a citation chip:

`01 · CONTEXT NAME · CONTENT NAME · LOCATOR`

Where:
- `01` is the reference number (sequential within the message). Color: Mojo Red.
- `CONTEXT NAME` is `context.name` short form (e.g. `CDODU`, `PSM`) in UPPERCASE. Color: Dust.
- `CONTENT NAME` is `source.contentName` truncated if long (e.g. `FAST ACTION PLAN`). Color: Dust.
- `LOCATOR` is the timestamp as `MM:SS` / `HH:MM:SS`, or page number. Color: Dust.

Clicking a chip opens a side panel with the full source body, the Context header, links to the Kajabi source, and the Concepts this chunk teaches. From the panel the student can jump to the source in Travis's actual course.

## V1 ingestion scope

For the initial build:
- Seed the full ontology (4 North Stars + 16 Concepts + 16 Skills + 11 Contexts) from the uploaded JSON
- Ingest ~30-50 representative source chunks covering Coffee Dates / Giving Funnel / Beamer / BFOT / PSM material (the dev scenario seeds a hand-curated subset)
- Run concept linking on those chunks
- Verify the retrieval tools return sensible results before opening the app to students

The app's architecture supports full 12M-word ingestion; running the full pipeline is a post-MVP roadmap item (`Full Library Ingestion`) because it's a curation-heavy job that needs admin review of extracted concept candidates.
