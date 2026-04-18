---
name: Partner Pipeline View
type: roadmap
status: not-started
description: One view across every active prospect — where they are in the process, what the last touchpoint was, and what needs to happen next.
requires: [mvp.md]
effort: medium
---

A serious student running Travis's process has 8-15 prospects in motion at once. Right now, those prospects live inside individual projects, each with their own workflow run, artifact set, and chat threads. The student has to open each project to remember where they left off. The Partner Pipeline View gives them a single command center — every partner, every status, every next action, in one place.

## What it looks like

A new top-level view in the left rail: `PIPELINE`. Available to students and admins.

**The pipeline table:**
A dense editorial table — Switzer everywhere, Mono Detail for dates and IDs. Each row is a prospect/partner from an active project. Columns:

- `PARTNER` — company or person name. Clicking the row opens the project.
- `NICHE` — the student's niche for this partnership
- `STAGE` — a Label-style badge showing the current workflow stage: `NICHE · RESEARCHING · OUTREACH · COFFEE DATE · OFFER · LAUNCH · CLOSED · STALLED`
- `LAST ACTIVITY` — relative time (Mono Detail) since the last artifact edit, workflow step, or chat message in this project
- `NEXT ACTION` — a plain-text one-liner the student has written for themselves (editable inline from this view). E.g. "Send T2 follow-up by Thursday."
- `NOTES` — a quick-note field, also editable inline

**Stage logic:**
Stage is auto-computed from the project's workflow state — which step the Coffee Dates run is on, whether a Partner Launch workflow has been started, etc. Students can also manually override the stage if they're managing a partner relationship that didn't go through the workflow.

**Filtering and sorting:**
- Filter by stage (show only OUTREACH, show only STALLED)
- Sort by last activity (oldest first = most overdue at the top)
- Filter to show only partners with no activity in 7+ days

**Quick actions from the pipeline:**
- Right side of each row: a small `OPEN` button and a `+ NOTE` action
- A `NEW PARTNER` button that creates a new project and starts the Coffee Dates workflow

## Key details

- `STALLED` is auto-flagged when a project has had no activity in 10+ days. A subtle Rust dot appears on the row.
- The Next Action field is stored per-project and also surfaces in the project detail Overview tab
- Students can use the pipeline as their daily standup with Mr. A: open the pipeline, ask "what should I focus on today?", and Mr. A reads the pipeline data and recommends a priority order
- On mobile, the pipeline collapses to a single-column card stack showing partner name, stage badge, and next action

~~~
Technical: the pipeline view queries all projects for the current user, joined with their workflow_runs (to compute stage), and last_activity (max of updated_at across workflow_runs, artifacts, and conversations for each project). Stage computation is a derived value — a simple function over the workflow run state JSON. Next Action and Notes are new fields on the `projects` table: `nextAction TEXT, pipelineNotes TEXT`. The stale flag is client-computed from last_activity.
~~~
