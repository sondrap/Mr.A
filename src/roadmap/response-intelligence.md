---
name: Response Intelligence
type: roadmap
status: not-started
description: Paste in a partner's reply and Mr. A reads the signal, categorizes the response, and drafts your next message — inside the project where all the context lives.
requires: [mvp.md]
effort: medium
---

The hardest moment in the Coffee Dates process isn't sending the T1 email. It's when someone writes back and you're not sure what to do with it. Travis's framework has clear signals — a T2 ready response looks different from a polite brush-off, which looks different from a genuine objection. But reading those signals correctly under the pressure of an actual reply is where students most often freeze or overreact. Response Intelligence makes that moment structured instead of anxious.

## What it looks like

Inside any project's Chat tab, a student can paste a partner's incoming reply into a dedicated **Response** input — distinct from the main chat composer. It's a larger text area with a `READ THIS REPLY →` action button in Mojo Red.

**When a student submits a reply:**
Mr. A does three things in sequence, shown as streaming steps in the canvas:

1. **Reads the signal.** Categorizes the response using Travis's framework: `T2 READY` (they're interested, ask the one question), `SOFT OBJECTION` (need to address a hesitation), `NOT NOW` (timing issue, may revisit), `NOT INTERESTED` (move on), `ALREADY HAS A SOLUTION` (a different kind of conversation), or `STRONG YES` (move to the close). The category displays as a Label badge above the analysis.

2. **Interprets the signal.** 2-3 prose sentences explaining what Travis's framework says about this kind of response and why — with citations. For a T2 Ready response, Mr. A cites the T2 framework source and explains what the prospect's reply signals about their situation.

3. **Drafts the reply.** A concrete suggested message the student can send. Shown in a Paper panel alongside the analysis. Editable inline. Based on the signal category — a T2 reply gets the one-question follow-up, a soft objection reply gets a reframe, etc.

The student can accept the draft, regenerate with a different angle, or open the full chat to go deeper.

**The conversation log artifact:**
Every response the student submits (and the analysis + draft reply) is appended to the project's conversation log artifact for this partner. The student builds a documented history of the exchange — what came in, what signal it carried, what was sent back. This replaces the running copy-paste mess students currently manage in their notes.

## Key details

- The Response Intelligence input is contextually aware — when submitting a response, Mr. A already has access to the project's niche doc, prospect profile, and conversation log, so the draft reply is tailored to this specific partner, not generic
- Students can submit multiple responses in sequence (pasting the whole thread) and Mr. A reads the conversation arc, not just the latest message
- Signal categories are editable — the student can correct Mr. A's categorization, and the correction trains the next draft
- Works across all workflows — not just Coffee Dates. If a student is running a BEM campaign and gets a reply to an email, the same interface handles it.

~~~
Technical: the `READ THIS REPLY` action calls a backend method that runs a focused task agent with the reply text, the project context (niche doc, prospect profile, conversation log), and the T1/T2/T3 + relevant concepts loaded. The agent returns structured output: `{ category: "T2_READY", analysis: "...", draftReply: "...", citations: [...] }`. The frontend renders the category as a badge, the analysis as streaming prose, and the draft reply in a Paper panel. Appending to the conversation log artifact is a write to the existing artifact via `saveArtifactDraft`.
~~~
