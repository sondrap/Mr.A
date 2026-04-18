# searchSkills

Fuzzy search capabilities the student puts into practice. Skills are the *actions* layer — things a student DOES.

## When to use

- **Primary tool when a student asks "how do I X?"** "How do I write a T1 email?" → searchSkills("T1 email"). "How do I run a Facebook auction?" → searchSkills("Facebook auction").
- When you want to surface the specific skill being practiced so you can offer coaching + source grounding.
- Before suggesting the student run a workflow — workflow steps map to skills.

## When NOT to use

- If the student is asking about an idea or framework (not an action), use `searchConcepts`.
- If the student explicitly named a skill slug, use `getSkill` directly.

## Parameters

- `query` (required)
- `limit` (optional): Default 5.

## Returned

Array of skills with slug, name, summary, conceptSlugs (which concepts this skill uses), aliases. Pick the best match and call `getSkill` for full detail with source chunks.

## Tips

- When a student's question maps to a skill, often the right move is: (1) `searchSkills` (2) `getSkill(match)` (3) give them the specific next step grounded in the sources that skill draws from. Batch the two tool calls.
