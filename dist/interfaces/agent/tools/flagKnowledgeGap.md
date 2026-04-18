# flagKnowledgeGap

Log a question you couldn't ground in Travis's library. This is the feedback loop that turns "I don't know" into actionable signal — admins see these clustered by topic and use them to prioritize what content to add next.

## When to use

- You searched concepts, skills, and sources — nothing relevant came back — and the student is asking something Travis's library should cover but doesn't.
- The student asks about a topic outside Travis's scope (e.g. Python, tax law, nutrition). Flag it anyway so admin sees these patterns, but also tell the student the library doesn't cover it.

## When NOT to use

- Don't flag normal questions you answered successfully.
- Don't flag questions where you found *adjacent* material (give the student the adjacent stuff instead).
- Don't spam it — one flag per unanswerable question is enough.

## Parameters

- `question` (required): The student's question, verbatim.
- `searchQueries` (required): An array of the queries you tried. Helps admin see what retrieval paths came up empty.
- `projectId` (optional): If the thread is project-scoped, include it.
- `conversationId` (optional): The chat thread ID.

## Returned

- `{ flagged: true, gapId }` — acknowledgment only.

## Tips

- Be honest with the student. "I don't have this specifically in Travis's library — I've flagged it so the team can see what's missing. In the meantime, here's something adjacent that might help: [cite what you did find]."
- This tool doesn't replace answering — it's in *addition* to giving the student whatever you can.
