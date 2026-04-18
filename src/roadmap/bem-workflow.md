---
name: BEM Campaign Workflow
type: roadmap
status: not-started
description: Travis's Big Easy Money framework as a fully guided workflow — find the high-leverage opportunity hiding in an existing relationship, design the offer, and write the campaign.
requires: [mvp.md]
effort: large
---

The Coffee Dates workflow is about landing the partner. BEM is about what you do once you have one — or once you already have assets (a list, an existing relationship, a warm audience) and need to turn them into revenue efficiently. Travis's Big Easy Money framework is built on a core insight: most people are sitting on money they can't see because they're looking for complicated new strategies instead of the high-ROI play right in front of them. This workflow makes that principle executable.

Six steps. Each step produces a concrete artifact. Every coaching note cites its source.

## What it looks like

**Step 1: Find the Big Easy Money**
The student describes what they already have — an audience, a partner relationship, an existing product, a list that hasn't been mailed in a while. Mr. A applies Travis's BEM diagnostic: Where is the upside that's already there but not yet collected? What's the simplest, most direct path to revenue from existing assets? Output: a BEM opportunity brief — one focused opportunity with a concise thesis for why it's the play.

**Step 2: Profile the List**
Who are you talking to? What do they already know about you? What have they already bought? The student characterizes the list or audience they'll be working with. Output: a list profile artifact — size, relationship type, prior purchases, temperature, known pain points.

**Step 3: Design the Offer**
Travis's offer design principles applied to the BEM context: high-margin, few transactions needed, built on what the list already wants. Mr. A walks through the offer components and tests them against the BEM criteria. Output: an offer one-pager — the offer in plain language, the price point logic, and the delivery promise.

**Step 4: Write the Email Campaign**
The BEM email sequence — typically 3-5 emails that follow Travis's structure: diagnose the Hell Island state, point toward Heaven Island, present the offer with specific proof. Mr. A drafts each email with full coaching context on why each structural choice is made. Output: the email sequence artifact, each email on a separate Paper panel, editable inline.

**Step 5: Set Up the Mechanics**
Checklist-style: what does the student need to configure before sending? Order page, delivery mechanism, fulfillment plan. Mr. A produces a pre-launch checklist. Output: a launch mechanics artifact.

**Step 6: Launch, Watch, Iterate**
The student sends the campaign and comes back with results: open rates, reply rates, orders. Mr. A helps interpret the signal and plan the next move — another email, a follow-up offer, or a diagnosis of what to test next. Output: a running campaign log, updated after each send.

## Key details

- BEM is best suited to students who already have an audience or partner relationship — the workflow gates early with a qualifying question and redirects students who don't have the prerequisite assets to the Coffee Dates workflow first
- Email artifacts are produced in plain text (not HTML) so they can be pasted directly into any email tool
- The coaching context in each step draws heavily from the BEM/BEAMER content in the library; full library ingestion makes this workflow dramatically richer
- Mr. A actively pulls the Hell Island / Heaven Island concepts in Step 4 — the email structure is grounded in that framework

~~~
Technical: same workflow architecture as Coffee Dates. Each step is a backend method using `mindstudio.runTask()` or `stream()`. New artifact types: `bem_opportunity_brief`, `list_profile`, `offer_onepacer`, `email_sequence` (JSON array of emails with subject/body), `launch_checklist`. The email sequence artifact renders as a stacked set of Paper panels in the workflow artifact column, each expandable. Step 6 is open-ended like Coffee Dates Step 6 — a running workspace, not a one-shot artifact.
~~~
