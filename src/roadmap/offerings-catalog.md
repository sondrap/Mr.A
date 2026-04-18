---
name: Offerings Catalog
type: roadmap
status: not-started
description: Mr. A can recommend Travis's courses, coaching, and services at the exact moment a student needs them — tasteful, grounded, and measurable.
requires: [full-library-ingestion.md]
effort: medium
---

Students pay for MRA access, but Mr. A can also help them discover what to spend their next dollar on. When a student is struggling with something Travis teaches a whole course about, or when they'd clearly benefit from 1:1 coaching, Mr. A can say so — tastefully, grounded in the moment, with a clear path to buying.

Done right, this is one of the highest-leverage things MRA can do: the right offering suggested at the right moment converts. Done poorly, it poisons the trust Mr. A has built by grounding every answer in Travis's content.

## What it looks like

**An Offerings catalog managed in the admin console.** Each offering is a row with:
- Name, short description (Mr. A's voice), price, purchase URL
- Type: `course` / `coaching` / `service` / `done-for-you` / `community`
- When-to-recommend criteria — which concepts or skills it deepens, which situations it's right for ("struggling with offer conversion," "wants 1:1 on cold email," "has traffic but no sales")
- Tagged to specific concepts, skills, or North Stars so matching is structural, not prompt-based
- Active / inactive toggle (retire an offering without deleting the record)

**A new tool for Mr. A: `browseOfferings(topic?, skill?)`.** Returns matching offerings. Mr. A pulls this tool when the student is clearly stuck on something the library covers but where the student would benefit from deeper guidance than chat can provide — a full course, a coaching call, a done-for-you service.

**Recommendation behavior — grounded and restrained:**
- Not "buy this now" — more like: "you're three replies deep on offer structure and still circling. Travis has a course called *Big Ticket Email Mojo* that covers this end-to-end. if you want to go deep here, that's the one. otherwise I can keep working the angles with you."
- At most one recommendation per thread unless the student asks for more
- Only when the student is genuinely stuck, explicitly asks, or is working on something an offering clearly addresses
- Always shows *why* the recommendation fits ("this goes deeper on offer design, which is what you've been circling on")
- Never interrupts a productive conversation

**In-chat rendering:** when Mr. A recommends an offering, the chat renders a formatted card (Paper surface inline in the message — tonally distinct from the conversation, so it reads as a curated suggestion not ad copy). Card shows: offering name in Editorial Subhead, one-sentence description in Prose, price in Mono Detail, `LEARN MORE →` button that opens the URL in a new tab. The surrounding Mr. A prose explains why.

**Analytics (see the Campaign Intelligence Dashboard roadmap item for the admin-side view):**
- Every recommendation is logged (who, when, which offering, which thread, why)
- Click-throughs tracked via a redirect URL MRA owns (`/go/offering/:id` → 302 to the real URL)
- If the payment system webhook reports back on eventual purchase, we can close the conversion loop

## Key details

- This is NOT a shopping cart. MRA does not process payments. It's a recommendation + deep link.
- Offerings live in the admin console alongside Users, Content, Ontology. A fifth tab: `OFFERINGS`.
- Students see which offerings were recommended to them in their own thread history; they can revisit a recommendation later.
- A free-tier student can see offerings recommended to them, but only paid students can be *in a conversation where Mr. A recommends* (free tier has no chat access). That's fine — free tier is the funnel into paid, not the funnel into offerings.
- Admin can preview: "show me which offerings would match a student asking about X" — useful for tuning criteria.

## Extends naturally

- **Coach Mode** roadmap adds coaches as users. "Book a coaching call with Jamie" becomes a first-class offering type with calendar integration, not just a URL.
- **Partner Pipeline** roadmap has the concept of student-to-partner matching. Travis personally endorsing a partner becomes an offering type ("Travis will interview you in Royalty Rockstars — auction-style pricing").
- **The MRA API** roadmap item: once the API is public, other tools using the agent can also recommend offerings (with admin control over which offerings are exposed via which API keys).

## Guardrails — get these right or break trust

- **Grounding applies here too.** Mr. A does not invent rationale for why a student should buy something. The recommendation must match what Mr. A already saw in the conversation. The `browseOfferings` tool returns matches; Mr. A phrases the why in his own voice but based on the student's actual situation.
- **Reviewer agent checks offering recommendations** (tied to the adversarial review system in v1) — is this recommendation actually appropriate for what the student is stuck on, or does it feel forced?
- **Admin-visible audit.** Every recommendation is logged and inspectable. If anything starts feeling pushy, admin can spot it in the audit and tune criteria down.
- **Rate-limited.** No more than one recommendation per thread per 10 turns, configurable per-admin.
- **Student override.** A student can set "don't recommend products to me" in their profile; Mr. A respects it absolutely.

## Why not v1

Three reasons:
1. Trust first, monetization second. V1 needs to prove Mr. A is grounded and useful before adding anything that could feel salesy. A few weeks of clean behavior establishes the trust that makes recommendations land.
2. You need content ingested to build good "when to recommend" criteria. Matching offerings to concepts requires the library to be populated enough that concept queries return good results.
3. The payment system needs to exist first so purchases can be tracked end-to-end (offering recommended → clicked → purchased → access granted). Without that loop closed, conversion analytics is missing the most important number.

After v1 launches, real usage shows which offerings students would most benefit from knowing about, and the payment system's webhook provides the closing-the-loop signal.
