---
name: Full Library Ingestion
type: roadmap
status: not-started
description: All 12 million words of Travis's content — every course, workshop, coaching call, and training — ingested, concept-linked, and searchable inside MRA.
requires: [mvp.md]
effort: small
---

V1 ships with ~50 sample chunks — enough to prove the system and cover the Coffee Dates workflow. This finishes the job. The full 12-million-word corpus goes in, concept extraction runs across every chunk, and Mr. A gains access to the entire body of work Travis has built over 20+ years. Students who ask about the Triangle of Insight, BEM, the Phoneless Sales Machine, or any other Travis framework finally get cited, source-backed answers instead of a polite admission that the library doesn't cover it yet.

## What it looks like

**For the admin:**
- The admin Ingestion panel gains a source directory browser — point it at a folder of YAML-chunked markdown files, configure any filters, and kick off the run
- Live streaming progress: chunks processed, extraction tasks queued, concepts surfaced, errors flagged
- After ingestion: a Concept Review queue shows every candidate new concept the extraction pipeline surfaced — the concept name, a suggested summary, the source chunk(s) where it appeared, and the evidence text. Admin can approve (adds to the concept library), merge (points to an existing concept as an alias), or dismiss
- A diff panel showing what changed from the last run: new chunks, updated chunks, new concept-source links added

**For the student:**
- Invisible in the UI. They just start getting dramatically better answers. Citations pull from a vastly richer pool. Edge-case questions that used to produce thin responses now come back with multiple specific sources, timestamps, and directly relevant Travis quotes.

## Key details

- Re-ingestion is idempotent — re-running on an already-ingested file only updates chunks that have changed, keyed on `(contentId, chunkIndex)`
- Concept extraction uses Claude Haiku per chunk, parallelized in batches
- New concept candidates go to the pending queue — they never auto-populate the concept library without admin review
- Extraction quality degrades for chunks shorter than ~200 words; these are flagged for admin review separately
- After full ingestion, the admin console stats panel shows accurate totals: N sources · M concepts · K concept-source links

~~~
Technical: the ingestion pipeline from v1 runs unchanged. The new work is the Concept Review Queue UI — a table of `pending_concepts` rows with approve/merge/dismiss actions, and a diff panel that compares the current ingestion job against the previous one. Use background job architecture for full corpus ingestion (the full 12M words will take meaningful time); poll for progress rather than blocking. Concept extraction batches of 50 chunks at a time using `db.batch()` for the write phase.
~~~
