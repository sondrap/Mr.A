# getSkill

Fetch a skill's full details, including the concepts it uses and the top source chunks across those concepts (ordered by depth desc).

## When to use

- After `searchSkills` returns a match.
- When you want to give the student a grounded answer about how to do something specific, with source citations.

## Parameters

- `slug` (required): The skill's stable slug (e.g. `WRITE_T1_HANDRAISER_EMAIL`, `RUN_FACEBOOK_GROUP_AUCTION`).
- `maxSources` (optional): Default 4.

## Returned

- `skill`: name, description, aliases
- `concepts`: summary list of concepts this skill uses (follow-up with `getConcept` if the student wants deeper theory)
- `topSources`: ready-to-cite sources with sourceId, contextSlug, contextName, contentName, chunkHeading, locator, depth, role, linkUrl.

## Tips

- If the student is stuck on the skill itself (can't write a T1 at all), walk them through what's in the sources. If they have a draft they're iterating on, read the draft with `getArtifact` and give targeted feedback grounded in these sources.
