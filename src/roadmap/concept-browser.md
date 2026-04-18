---
name: The Concept Browser
type: roadmap
status: not-started
description: A reference library where students can explore every Travis concept, see exactly where it's taught, and open a conversation with that concept already loaded as context.
requires: [full-library-ingestion.md]
effort: medium
---

Conversation is the right interface for working through a live problem. But sometimes a student wants to read — to understand a concept fully before they apply it, or to verify that they remember it correctly. The Concept Browser surfaces the library as a first-class destination. Every framework Travis has ever named, organized, tagged, and linked to its sources. Browse by topic. Read the essence. See the ranked source list. Start a conversation with one click.

## What it looks like

A new top-level section in the left rail: `LIBRARY`. Available to student and admin roles only — free tier sees it locked with a `PAID ACCESS` tag.

**Browse view:** An editorial layout of all concepts grouped by tag — `OUTREACH · PARTNERSHIP · PSYCHOLOGY · OFFER · MINDSET`. Each concept displays as an Ironwood row with the concept name in Editorial Subhead, a flavor indicator (`TACTICAL` / `PHILOSOPHICAL` / `BOTH`) in Label badge, and the opening line of its summary in Dust. Filterable by tag. Full-text searchable across concept names, aliases, and summaries.

**Concept detail page:**
- Editorial Headline at the top: the concept name
- The summary in Prose — Travis voice, typically 2-4 sentences
- An "Essence" block: what this concept is and when to use it, in two short sections
- A "Travis says" section: 2-4 direct-quote phrasings in italic Montagu Slab, each with a citation chip pointing to the source
- A ranked source list: every place Travis has taught this concept, ordered by depth. Each row shows course name, chunk heading, timestamp, depth indicator (Brass dots 1-5), and role label (`PRIMARY TEACHING / APPLIED EXAMPLE / REFERENCE MENTION`). Clicking any row expands the source body inline.
- A `DISCUSS WITH MR. A →` button in Mojo Red that opens a new thread with the concept pre-loaded as context: "I want to go deeper on [concept name]."

**Student bookmarks:** A star icon on every concept card and detail page. Bookmarked concepts surface as a pinned section at the top of the Library browse view — the student's personal reference shelf.

## Key details

- If a student is inside a project when they click `DISCUSS WITH MR. A`, the new thread is project-scoped
- Concept aliases are searchable — searching "hand-raiser" finds `T1 Email`, "tier one" also finds it
- The depth rating is visual (Brass dots) and also text-described for clarity — depth 5 = "this source is where Travis teaches it most directly"
- The Library is indexed and searchable across all sources, not just concepts — students can also search raw source text and jump directly to any chunk

~~~
Technical: the browse view queries the `concepts` table grouped by tag. The detail page queries `concepts` joined with `concept_sources` joined with `sources`, ordered by `depth desc`. Bookmarks are a `user_concept_bookmarks(userId, conceptId, createdAt)` junction table. The `DISCUSS WITH MR. A` button passes `conceptSlug` as a seed parameter when opening a new agent conversation; the agent's system context prepends the concept details.
~~~
