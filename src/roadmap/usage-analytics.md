---
name: Campaign Intelligence Dashboard
type: roadmap
status: not-started
description: Two dashboards — one for operators and one for the content owner — that reveal what students are asking, where they stall, what's selling, and what's not. Real signal to improve the product, the curriculum, and the offerings mix.
requires: [mvp.md]
effort: large
---

Right now the admin console shows headcounts — how many approved students, how many active in the last 7 days. That's operations data. What MRA's two audiences actually need to know is different:

**Travis (content owner) needs to know:** what are students asking me about that I haven't recorded yet? Which of my frameworks are landing, which are neglected? What are students stuck on? Which offerings are selling, which aren't? What's the curriculum gap I should close this quarter?

**Operators (admins) need to know:** where in the product are students dropping off? Which workflow steps are breaking? Is Mr. A behaving? Are recommendations pushy or well-landed? Is ingestion healthy? Are knowledge gaps being resolved?

Two dashboards. Overlapping metrics but different primary views, curated for each audience.

## What it looks like

A new `ANALYTICS` tab in the admin console, with a switcher at the top: `CONTENT OWNER VIEW` / `OPERATOR VIEW`. Both require admin role; there's no separate "content-owner" role in v1 (Travis and his team are admins). The toggle just re-renders the page with a different metric set foregrounded.

### Content Owner view (Travis's dashboard)

**The curriculum gap panel (the most important thing on this page).** Clustered Knowledge Gaps from chat — what are students asking that the library doesn't answer? Each cluster shows the normalized tag, count of students asking, a sample verbatim question, and a `Draft recording brief` action that generates a one-page brief summarizing what Travis could record to close the gap. This is the single clearest signal of what to teach next.

**Concept heat map.** Which of Travis's frameworks are being searched and cited? Ranked list by chat mention + workflow coaching frequency, 30-day trend indicator. The top concepts are what students are actively working with; the bottom reveals what's underutilized or too obscure. Click a concept to see which sources Mr. A cited for it and how often each.

**Content freshness.** How recently was each Context (CDODU, PSM, BDTS, etc.) ingested? Which ones are overdue for a refresh based on student activity? When Travis re-records something, does student engagement with that Context spike?

**Offering performance (when the Offerings Catalog ships).** For each offering: recommendations made, click-throughs, conversions (from payment-webhook close-the-loop data), dollar volume attributed. Shows which offerings Mr. A is landing well, which are getting recommended but not clicked (bad fit? bad price?), which are converting (the winners to double down on).

**Student success stories.** Students whose chat sessions contain language matching success signals ("I got a yes," "sent my T1," "closed my first partner") — auto-surfaced with a link to their project. Travis sees who's winning, can reach out personally.

### Operator view (admin's dashboard)

**Workflow completion funnel.** For each workflow, a Tanker-set completion rate, then a step-by-step funnel — how many students started, how many reached each step, how many completed. Steps where students drop off sharply are flagged with a Rust indicator. Clicking shows the distribution of how long students spend on it and a sample of what artifacts they produced.

**Mr. A quality monitor.** Adversarial review verdicts aggregated: pass rate, revise rate, surface-issues rate. Trend over time. Outliers where a specific workflow step keeps failing review gets flagged — either the prompt is bad, the model is off, or the reviewer is miscalibrated. Knowledge gap rate (gaps flagged per 100 chat turns) as a trust signal.

**Artifact quality signal.** How many artifacts are being created? How many are being edited (as opposed to generated-and-abandoned)? Artifacts that students edit heavily are concepts they're actively working with. Artifacts sitting unedited post-generation are likely too generic or the wrong step.

**Ingestion health.** Number of sources, number of concept_sources links, candidate concepts in review queue, open knowledge gaps unresolved after 30 days. A single score: library coverage health.

**Per-student detail.** Each student's activity summary — last active, which workflows they've started/completed, number of artifacts, chat threads. Clicking a student opens a read-only project view; admins can see their work without editing.

### Cohort reporting (shared across both views)

Filter analytics by signup-date cohort. The newest cohort's workflow completion rate is the most important leading indicator of onboarding success.

## Key details

- Analytics are aggregated and anonymized in reporting views; per-student detail requires clicking into a specific student.
- Data retention: analytics events kept for 12 months rolling.
- Export: admins can download a CSV of any table for further analysis.
- The `CONTENT OWNER VIEW` label is explicit — Travis sees what's his, not what's operational noise. When Travis opens the dashboard, the curriculum gap panel is the first thing he reads.
- Conversation-level analytics (chat questions, topics, Mr. A responses, sources cited) live in this dashboard, clustered and searchable. Admin can spot-check "what did students ask about cold email this month?" in one query.
- All charts use the MRA chart vocabulary: Tanker-set hero numbers, single trend line in Clay, Mojo Red fill at 20% opacity, no axis labels.

~~~
Technical: analytics are powered by a lightweight event table — `analytics_events(userId, eventType, metadata JSON, createdAt)`. Event types include:
- `workflow_step_started` / `workflow_step_completed`
- `artifact_created` / `artifact_edited` / `artifact_exported`
- `chat_message_sent` / `chat_reply_streamed`
- `concept_searched` / `concept_cited` / `source_opened`
- `offering_recommended` / `offering_clicked` / `offering_converted` (from the payment webhook close-the-loop)
- `knowledge_gap_flagged` / `knowledge_gap_resolved`
- `review_verdict` (pass/revise/surface_issues)

Events fire as background writes — no blocking. Daily aggregates materialized to keep query times fast as the table grows.

The content-owner vs operator view is just a UI-level query filter; the underlying table is one table. This means if Travis and admins want to diff their views, they can.

Question clustering for conversation analytics uses the same normalized-tag system as knowledge_gaps, extended to cover all chat questions (not just grounded-failure ones). A small task agent tags each message with a topic label server-side, cheap Haiku-class model.
~~~

## Why this matters

Travis has been building and selling for 20 years without this signal. Every time he records a course or designs a workflow, he's guessing at what students need based on what shows up in coaching calls and Facebook comments. MRA is the first system that records every student question, every stumble, every artifact, every purchase. That data is the most valuable thing about MRA — for Travis's own business, not just the product.

The content-owner view is how that value becomes visible.
