---
name: Mr. A for the Community
type: roadmap
status: not-started
description: Mr. A shows up in Travis's Skool group — where students already spend their time — answering questions, citing sources, and pointing back to MRA for the deep work.
requires: [mvp.md]
effort: medium
---

Travis's paid students live in his Skool group. That's where they ask questions, share wins, get stuck, and interact with Travis and each other. Right now, MRA lives at a separate URL they have to consciously navigate to. Mr. A for the Community brings the brain to where the students already are — a Skool bot that responds to questions in the community with the same cited, concept-grounded answers they get in MRA chat, and links back to MRA for the workflows and deeper work.

## What it looks like

**In Travis's Skool group:**
Students can mention `@MrA` in any Skool post or comment. Mr. A responds as a bot reply — same focused coaching voice as in-app, same cited answers, same framework-grounded coaching. The reply includes a citation (sourced from the concept library) and, where relevant, a direct link: "want to run the full Coffee Dates workflow? open it in MRA →"

Mr. A doesn't answer everything — he stays in his lane. Marketing frameworks, outreach questions, Travis-specific processes. He says clearly when a question is outside his scope and redirects to the human coaches or to Travis.

**For admins:**
- A Skool integration panel in the admin console — connect the Skool group via API token, configure which classrooms or channels Mr. A is active in, set a rate limit (max N responses per hour to avoid flooding the community)
- An option to restrict Mr. A to specific types of posts (e.g., only respond when a post is tagged `QUESTION`) to keep the bot from being noisy
- A log of all bot responses in the admin console — admins can review what Mr. A said and flag anything that needs a correction

**The hand-off to MRA:**
When Mr. A answers a question in Skool, he almost always ends with a thread-specific prompt: "if you're ready to run the Coffee Dates workflow for this, it's waiting for you in MRA." That CTA is how the community bot drives deeper engagement in the full product.

## Key details

- The Skool bot uses the same concept library and Mr. A agent as the web app — same voice, same sources, same citations. It's not a separate or lower-quality AI.
- Students who are already MRA users can optionally link their Skool account to MRA — when they do, asking Mr. A a question in Skool can pre-populate a project-scoped thread in MRA for them to continue
- The bot is deliberately limited in output length on Skool — 2-3 paragraphs maximum, with a link to MRA for the full response. Skool is not the place for a 1000-word coaching essay.
- Mr. A is explicit in every Skool reply that he's the AI trained on Travis's content, not Travis himself

~~~
Technical: Skool has a developer API (in beta) that supports bot accounts. The bot listens for @mentions via webhook, calls the MRA backend agent with the question and any available context (the post thread), and posts the response back to Skool via the API. The same MRA agent interface is used — the Skool bot is another interface on the same backend methods. Rate limiting and the response log are admin-configured and stored in a `bot_responses` table.
~~~
