---
name: Live Content Pipeline
type: roadmap
status: not-started
description: When Travis publishes new training, it flows into MRA automatically — no manual ingestion, no admin steps, no library that falls behind.
requires: [full-library-ingestion.md]
effort: medium
---

Once the full library is in, the new problem is keeping it current. Travis teaches constantly — new workshops, new modules, new coaching calls. Right now each new piece of content requires an admin to notice it, run it through the ETL, and manually trigger ingestion. That's not sustainable when Travis is publishing several times a month. The Live Content Pipeline watches for new content and keeps the library fresh without anyone having to remember to do it.

## What's already in v1

The v1 launch ships the sync primitives this automation builds on: `POST /_/api/ingest/sync-file`, `DELETE /_/api/sources/:contentId`, `GET /_/api/sources/manifest`, and a `bodyHash` column on every source. With these, the ETL can already run continuous diff-sync manually (nightly cron, on-demand after a content drop). This roadmap item eliminates the manual trigger — watched sources, webhook-driven updates, automatic reconciliation.


## What it looks like

**Source monitoring configuration (admin):**
- The admin can configure one or more watched sources: a Google Drive folder, a watched S3 bucket, or a webhook endpoint the ETL calls when it has new chunks ready
- Each source has a polling schedule (default: every 4 hours) or can fire on-demand via webhook
- A freshness status indicator in the admin console header: `LIBRARY LAST UPDATED · 2H AGO · 3 NEW CHUNKS THIS WEEK`

**When new content arrives:**
- Only new or modified chunks are processed — no full re-run
- New concepts surfaced by fresh content go to the Concept Review queue as always
- Newly ingested chunks are flagged with a `NEW` badge in any source list for 7 days
- Admin gets an optional email digest summarizing what came in: "3 new chunks from BEM Workshop, 1 concept candidate: reverse RFP"

**For the student:**
- Nothing changes in the UI
- The empty-state chat prompt can surface a `NEW IN THE LIBRARY` chip when fresh content has been added recently: "Travis just added new training on [topic] — ask about it."

## Key details

- Monitoring is opt-in and configured per-source — Travis's team controls the pipeline
- Priority flag: admins can mark a source directory as `HIGH PRIORITY`, which triggers immediate extraction instead of waiting for the next poll cycle
- If a chunk is re-ingested with changed content, concept-source links are re-evaluated and updated
- Ingestion failures are surfaced in the admin console and don't silently drop chunks

~~~
Technical: a cron job polls configured source directories, compares file modification times or checksums against `ingestion_jobs` history, and queues only changed files for processing. Webhook option: the user's ETL POSTs to a `/webhooks/content` endpoint when new chunks are ready; MRA queues the new files for ingestion. Rate-limit the extraction queue so a large batch of new content doesn't spike model costs in a single hour — process up to N chunks per run cycle.
~~~
