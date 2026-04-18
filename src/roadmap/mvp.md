---
name: The v1 Launch
type: roadmap
status: in-progress
description: Everything needed to ship MRA v1 — auth, three surfaces (chat, workflows, projects), voice input/output in chat, the Coffee Dates + Giving Funnel workflow end-to-end, and the free-tier niche lead magnet.
requires: []
effort: large
---

The first working version of Mojo Results Accelerator. Students log in, land on a real working product, chat with Mr. A grounded in Travis's content with citations, walk through the Coffee Dates + Giving Funnel workflow end-to-end, and end up with concrete artifacts they can use: a niche doc, a partner prospect list, an attraction video outline, a Skool group setup plan, and a T1/T2/T3 outreach pack.

Free-tier users get one genuinely useful piece of the app — the Validate Your Niche workflow, unlocked standalone as a lead magnet — and see everything else tastefully locked with a `PAID ACCESS` tag and a link to Travis's sales page.

Admins can grant and revoke paid access from an admin console, run content ingestion, and see basic usage stats.

~~~
Scope of v1:

Auth & access
- Email + 6-digit code login
- Three roles: `student`, `free`, `admin`
- Allowlist (access_grants table) driven by two paths: admin manually adding an email, OR the external payment system POSTing to `/_/api/access/grant`
- Inbound access webhooks: `POST /_/api/access/grant` and `POST /_/api/access/revoke` — see `src/references/access-webhook.md`
- Email match on signup or login auto-promotes to `student`
- First-signup onboarding modal (3 slides)

Data model
- users (auth) · access_grants
- Four-layer ontology: north_stars · concepts · skills · contexts · sources · concept_sources
- Student work: projects · workflow_runs · artifacts · conversations · ingestion_jobs
- Quality: reviews (adversarial review outcomes for artifacts and concept links)

Adversarial review
- Artifact review on every workflow step output: generator → reviewer (different model family when possible) → pass / revise / surface_issues
- Concept-link review on every ingested chunk's proposed links before DB write
- Candidate-concept review before landing in admin queue
- `reviews` table stores outcomes for debugging, tuning, admin visibility
- Per-workflow review toggle in admin for debugging/cost control
- Explicit non-goals: chat replies, tool calls, and admin operations do NOT go through review

Grounding (content-only)
- Mr. A Chat has NO web tools — no searchGoogle, no scrapeUrl, no URL fetching
- Every substantive answer must be grounded in a source chunk returned by retrieval tools
- When no source is found, Mr. A says so honestly and calls `flagKnowledgeGap`
- `knowledge_gaps` table logs question + search attempts + normalized tag
- Admin console Content tab shows a Knowledge Gaps panel (clustered by normalized tag) for admin review
- The one scope exception: the Research Partners workflow step has web tools available to its task agent for finding real companies — this is scoped to that single step, not a chat capability

Content
- Seeded full v1 ontology (4 North Stars, 16 Concepts, 16 Skills, 11 Contexts) from the uploaded JSON
- Dev scenario seeds ~30-50 sample chunks (mix of real Beamer sample + synthetic chunks covering v1 workflow concepts)
- Concept linking pipeline working, parallelized (10-20 agents in flight)
- Admin-facing "Complete the ontology" queue for seed entries with empty descriptions
- Admin-facing "Candidate concepts" review queue surfaced by the linker

Ingestion API (required for 1500+ file scale)
- `POST /_/api/ingest/source` (single file, idempotent upsert)
- `POST /_/api/ingest/batch` (up to 50 files per request)
- `POST /_/api/ingest/sync-file` (replace all chunks for a re-chunked file)
- `DELETE /_/api/sources/:contentId` (retire a whole file)
- `DELETE /_/api/sources/:sourceId` (drop a single chunk)
- `GET /_/api/sources/manifest` (body-hash listing for ETL diff-sync)
- `GET /_/api/ingest/status/:jobId` (poll progress)
- `POST /_/api/contexts` / `GET /_/api/contexts` (programmatic Context management)
- Admin API key generation, revocation, masking in the admin console
- Admin UI drag-and-drop (ad-hoc spot fixes) uses the same backend

Chat
- Agent interface (Mr. A, Claude Sonnet) with full tool access: searchConcepts, getConcept, searchSources, getSource, listProjectArtifacts, getArtifact, saveArtifactDraft
- Per-user thread history, project-scoped threads
- Streaming with citation chips pre-allocated
- Source side panel (click a chip to see the full source with Kajabi link)
- Voice input (mic button → transcribeAudio → composer)
- Voice output (speaker button on each reply → textToSpeech playback, with optional auto-play)
- Mobile-first voice UX with enlarged mic tap target

Workflows
- Coffee Dates + Giving Funnel (6 steps, end-to-end)
- Validate Your Niche (standalone, free-tier accessible)
- Each step produces a concrete artifact on a Paper surface

Projects
- Project dashboard with editorial table layout
- Project detail with Overview/Workflows/Chat/Artifacts tabs
- Artifacts full-page view on Paper surface

Admin
- Admin console: stats hero + four tabs (Users, Content, API Keys, Ontology)
- Users tab: grant / revoke access, search/filter
- Content tab: ingestion job list, drag-drop, library stats, candidate-concept queue
- API Keys tab: generate, revoke, view last-used
- Ontology tab: view and edit all four layers

Scenarios (required for every app)
- empty_student: brand-new paid student with no projects, to test the empty states and onboarding
- active_student_midworkflow: student mid-Coffee-Dates workflow, two projects, some artifacts, several chat threads
- free_tier_user: `free` role, one project with only the niche workflow, sees the locked state everywhere else
- admin_view: admin with access to the console, some approved users, some ingestion history

Not in v1 (explicit deferrals)
- Payment processing (the user is building a separate payment system that will POST to MRA's access-grant webhook when checkouts complete)
- Additional workflows beyond Coffee Dates + Giving Funnel and Validate Niche
- Full 12M-word content ingestion (v1 dev seed is ~30-50 chunks; real content arrives via API post-build)
- Live Content Pipeline (watched sources, differential ingestion)
- Smart Lead / Skool API integrations (checklists only, no automation)
- Public API for spin-off tools (the ingestion API is admin-only in v1)
- Team / multi-admin collaboration
- Mobile native app
~~~

## How we'll know it's done

A student can sign up, go through the Validate Your Niche workflow, produce a polished niche doc, click through the locked sections to see what paid unlocks, and (if paid) continue through the Coffee Dates + Giving Funnel workflow all the way to an outreach pack they'd actually send. Along the way, they can open Mr. A Chat at any point and get cited, concept-grounded answers. The whole experience feels like a premium product — the editorial-on-asphalt aesthetic holds up, no layout shift during streaming, no generic AI-chatbot vibes.

Travis himself can look at it and say "yeah, this is better than Delphi." That's the bar.
