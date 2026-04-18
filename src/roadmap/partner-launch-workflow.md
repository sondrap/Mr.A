---
name: Partner Launch Planner
type: roadmap
status: not-started
description: The chapter after Coffee Dates — when a partner says yes, this workflow plans the actual launch: promotion schedule, offer structure, revenue mechanics, and launch communications.
requires: [mvp.md]
effort: medium
---

Coffee Dates ends with a handshake. This is what comes next. Most students land their first partner and then freeze — they've never actually run a joint launch before, and Travis's coaching on launch mechanics is spread across multiple trainings. The Partner Launch Planner pulls it together into a guided workflow that takes a student from "we agreed to work together" to a live launch with a clear promotion schedule, a confirmed offer, and all the launch copy ready to send.

Four steps. Picks up where the Coffee Dates project leaves off.

## What it looks like

When a student completes the Coffee Dates workflow — or at any point when they have a confirmed partner — they can start a Partner Launch workflow inside the same project. The project already has the partner context: who they are, what their list looks like, what the student's niche is.

**Step 1: Design the Launch Offer**
What exactly is being offered to the partner's list? The student and Mr. A work through the offer structure: the product, the price point, the compelling reason to buy now, and the specific outcome being promised. Travis's offer design principles applied to a joint launch context. Output: a launch offer brief — offer name, mechanism, price, promise, and positioning.

**Step 2: Build the Promotion Plan**
How will the partner promote it? Email sequence, social, Skool post, Zoom call? How many touches over how many days? Travis's launch sequencing principles produce a concrete promotional calendar. Output: a promotion schedule artifact — a day-by-day plan with channel, content type, and the student's responsibility vs. the partner's responsibility clearly delineated.

**Step 3: Write the Launch Copy**
The actual emails and posts the partner will send. Mr. A drafts all promotional pieces based on the offer brief and the partner's known voice and audience. The student reviews and edits before passing them to the partner. Output: a launch copy pack — every promotional piece ready to hand off.

**Step 4: Set Up the Revenue Mechanics**
How does the money move? Affiliate link, revenue share agreement, or direct partnership? A checklist of the mechanical steps the student needs to complete before launch day, including what to confirm with the partner. Output: a launch mechanics checklist.

## Key details

- This workflow is designed to import context from the Coffee Dates workflow in the same project — the partner name, niche, and prospect profile pre-populate step inputs
- The promotion schedule is built as a structured artifact (date, channel, content type, owner) that can be exported as a plain-text document or copied for use in any project management tool
- Launch copy is written in the voice of the partner, not the student — Mr. A gets the partner's voice profile from the student before drafting
- The workflow links forward to the BEM workflow: if the launch goes well, the next play is often a BEM campaign to the same partner's list

~~~
Technical: same workflow architecture. This workflow gains a new data source: it can query the parent project's workflow_runs to import Coffee Dates output (niche doc, partner profile) as initial step context. New artifact types: `launch_offer_brief`, `promotion_schedule` (structured JSON rendered as an editable table), `launch_copy_pack` (array of copy pieces, each with channel/date/body), `launch_mechanics_checklist`.
~~~
