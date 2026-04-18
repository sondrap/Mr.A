---
name: Phoneless Sales Machine
type: roadmap
status: not-started
description: Travis's foundational sell-without-calls framework as a fully guided workflow — every step from identifying the prospect to closing the deal entirely through text and email.
requires: [mvp.md]
effort: large
---

Travis built his business on a foundational belief: you should be able to close meaningful deals without ever getting on a call. The Phoneless Sales Machine is the framework that makes that real — a complete system for moving a prospect from cold to closed using only written communication. For students who find the Coffee Dates model too reliant on Zoom calls, or who are working in contexts where calls aren't the norm, this workflow is the alternative path. It also layers cleanly on top of Coffee Dates: once you've had the coffee date, the Phoneless Sales Machine is how you close.

Six steps. Same architecture as Coffee Dates. Same citation-grounded coaching at every step.

## What it looks like

**Step 1: Qualify the Play**
Not every deal is a phoneless deal. The student describes the prospect, the relationship, and the deal type. Mr. A applies Travis's qualifying criteria for when the phoneless approach works — and when it doesn't. Output: a play qualification artifact — a one-paragraph assessment with a go/no-go recommendation and the reasoning.

**Step 2: Map the Conversation**
Before writing a single word, map the prospect's current state (Hell Island) and desired state (Heaven Island). What do they want? What's stopping them? What language are they already using to describe it? The student feeds in everything they know about the prospect. Mr. A helps structure the psychological map. Output: a prospect insight brief — Hell Island, Heaven Island, key phrases, and the gap you'll be bridging.

**Step 3: Write the Opening Move**
The first message in a phoneless close isn't a pitch — it's a question or a statement designed to get a response. Travis's T1 framework applied to the phoneless context. Mr. A drafts the opening message(s) tailored to the specific prospect profile. Output: opening message artifact — 1-3 message variants, each with a brief note on the strategic intent.

**Step 4: Anticipate the Conversation**
What will the prospect say back? What are the likely objections, questions, or pivots? The student works through the decision tree with Mr. A. Output: a conversation map artifact — the likely paths the exchange could take, with prepared responses for each major branch.

**Step 5: Write the Close**
When it's time to make the offer or propose the next step, the phoneless close has a specific structure. Travis's close architecture applied to the student's specific context. Mr. A produces the closing message — direct, specific, with a clear ask. Output: the close message artifact, editable inline.

**Step 6: Run the Exchange**
The student sends the opening, comes back with what the prospect said, and works the conversation with Mr. A's help in real time. Same running workspace model as Coffee Dates Step 6 — paste the reply, get the next message drafted, repeat until closed or disqualified. Output: a running exchange log.

## Key details

- The workflow references and cross-links to the Coffee Dates workflow at several points — students who have already run Coffee Dates can import their prospect profile from that workflow
- Heavy reliance on Hell Island / Heaven Island and the T1/T2/T3 concept library — this workflow benefits enormously from full library ingestion
- The conversation map in Step 4 is an artifact type new to this workflow: a branching document (rendered as an expandable tree on Paper) with parent nodes (prospect responses) and child nodes (suggested replies)
- Phoneless close language is notably different from coffee date language — the coaching emphasis on this is explicit

~~~
Technical: same workflow architecture. New artifact types: `play_qualification`, `prospect_insight_brief`, `opening_messages`, `conversation_map` (JSON tree structure, rendered as expandable Paper panels), `close_message`. The conversation_map artifact is the most complex new type: a branching structure with editable nodes. Start simple (a flat list of branch scenarios, not a visual tree) and evolve from there.
~~~
