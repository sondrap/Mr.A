---
name: Community Marketplace
type: roadmap
status: not-started
description: Vetted community experts offer mentorship and tapper services inside MRA. Mr. A suggests the right person at the right moment. Bookings and commission handled end-to-end.
requires: [offerings-catalog.md]
effort: large
---

Travis's community has more talent than Travis can personally offer. There are experienced operators who will mentor newer students for a fee. There are skilled tappers who will help experienced students run campaigns. Right now all of this matchmaking happens on Skool, in DMs, over coffee dates — it's invisible to the product and none of the value is captured.

Community Marketplace turns that into a first-class surface inside MRA. Experts apply to be listed. Admin vets them. Their profiles are surfaced to students by Mr. A at the right moment (and browsable directly). Students book sessions or engagements. MRA handles payment capture, commission, and delivery workflow.

## What it looks like

### Community member types

Two kinds of sellers in v1:

**Mentors.** Experienced operators who offer paid 1:1 mentorship on specific topics. They set their rates (hourly, package, or retainer), their specialty areas, their availability windows. Examples: "Jamie: $500/hr for partnership strategy coaching, takes 2 new clients/month." "Ben: $3K flat for a 4-week campaign review engagement."

**Tappers.** Less-experienced community members available for hire to help run campaigns — writing T1 emails at scale, setting up Skool groups, doing prospect research, handling email inboxes. Lower price point, higher volume. Examples: "Maria: $40/hr for cold outreach execution, 15 hrs/week available." "Kyle: $60/hr for Skool group management, currently has 2 client slots."

These might be the same person in different modes (a good operator teaches AND does), but each listing is a distinct offering.

### Profile pages

Each community member's profile lives at `/community/:slug` and has:
- Name, avatar, short bio in Mr. A's voice (two to three sentences)
- Role(s): `MENTOR` / `TAPPER` badges in Label style
- Specialty tags — which concepts and skills they're expert in (tied to the content library's ontology so matching is structural)
- Services offered: a list of distinct engagements with rates, duration, description, availability
- Sample of work — case studies, before/afters, campaigns they've run (with client permission)
- Testimonials from past MRA students they've worked with
- Booking calendar or inquiry form (depending on the service type)
- `VETTED ON` date + `VETTED BY` admin name (trust signal, always visible)

Unvetted profiles don't surface anywhere. Vetting is a real admin workflow, not a toggle.

### Admin vetting workflow

A community member applies via a form: their background, experience, proposed services, rates, samples. The application enters an admin review queue. Admin reviews, may schedule a vetting call, approves or rejects. Approved profiles go live. Admin can revoke vetting at any time — the profile stays in the database (audit trail) but stops surfacing to students.

Admin has full visibility: a Community tab in the admin console showing all applications, all vetted profiles, engagement counts per profile, student feedback, cancellations, and lifetime earnings per profile.

### Mr. A tools and behavior

Two new tools available to Mr. A:

- `findMentor(topic?, budget?)` — returns vetted mentors matching the topic. Sorted by specialty fit + recent engagement success.
- `findTapper(skill?, budget?, availability?)` — returns vetted tappers matching the skill and availability window.

**When Mr. A uses these:**

- Student is clearly in over their head on a strategic question that would take multiple coaching sessions to untangle → suggest a mentor. "You've been circling on this launch strategy for three threads now. Travis has a couple of mentors in the community who specialize in exactly this — want me to show you?"
- Experienced student is running something real and says "I need hands to help me do this at scale" or similar → suggest tappers. "Sounds like a T1 rollout of 50+ partners. Kyle does this kind of execution — $60/hr, 10 hrs/week slot open. Want the details?"

Same guardrails as Offerings Catalog:
- At most one community-member recommendation per thread unless the student asks for more
- Grounded in the actual conversation — Mr. A doesn't force the match
- Reviewer agent checks the recommendation's appropriateness
- Rate-limited per admin config
- Student opt-out respected absolutely

**In-chat rendering:** a community-member card on Paper surface inline in the chat message. Shows: member name, avatar, role badge, specialty, relevant service with rate, `VIEW PROFILE →` button to their full page, `BOOK NOW →` button for direct booking if service allows.

### Community directory

A `COMMUNITY` tab in the left rail (visible to all paid students). Editorial table layout same as the projects dashboard — profiles as rows, no card grid:
- Avatar (small, square)
- Name in Editorial Subhead
- Label-style metadata: `MENTOR · PARTNERSHIP STRATEGY · $500/HR · 2 SLOTS OPEN`
- Short bio in Prose, one line truncated
- Thin 1px Graphite rule between rows

Filters at the top: role type (mentor/tapper/both), specialty, rate range, availability. Search by name or specialty. Clicking a row opens the full profile page.

### Booking flow

When a student books a mentor or tapper:
1. Student sees service details + available slots (calendar-integrated, or request-based depending on service)
2. Student requests / books → a `booking` record is created with `pending` status
3. Community member gets notified (email + in-app) and accepts or declines within a window
4. On acceptance, payment is captured through the platform (using the payment system that's already connected to MRA for access grants, or through a separate checkout flow)
5. MRA takes commission (configurable, default 15%), community member gets the rest
6. Session happens, service is delivered
7. After delivery, student leaves a review. Review feeds into the community member's profile

Cancellations, disputes, refunds: all handled through the admin console with clear audit trails.

### Commission model

MRA takes a percentage of every transaction. Configurable per-admin, default 15%. Commission is deducted automatically before payout. Community members see a dashboard with: lifetime earnings, current pending bookings, MRA fees paid, expected payout date.

This is the first place MRA generates revenue from community activity beyond the access fee, and it aligns incentives: MRA wants community members to succeed, community members know MRA will only surface them when it's the right match (because false recommendations hurt both).

## Why a separate roadmap item (not just an extension of Offerings Catalog)

- **Different trust model.** Travis's own products are trusted by default. Community members need explicit vetting and can lose trust.
- **Different payment flow.** Offerings send students to an external URL. Marketplace captures payment inside MRA with commission split.
- **Different data model.** Community members are a new user type with profiles, availability, services, reviews. Offerings are a flat catalog.
- **Different guardrails.** Recommendation of community members carries reputational risk for those members AND for MRA. Gets more review.

Both items recommend things in chat; both have the same in-chat card pattern. But the mechanics are different enough that collapsing them would muddy both.

## Data model additions

- `community_members` — userId, slug, bio, roles[], specialtyConceptIds[], specialtySkillIds[], status (`applicant`|`vetted`|`revoked`), vettedAt, vettedBy, stripeAccountId (for payouts), commissionRate
- `community_services` — communityMemberId, name, description, type (`hourly`|`package`|`retainer`), rate, durationMinutes (for hourly), active
- `bookings` — studentId, communityMemberId, serviceId, status, requestedAt, confirmedAt, completedAt, cancelledAt, totalAmount, commissionAmount, payoutAmount
- `community_reviews` — bookingId, studentId, communityMemberId, rating, reviewText

## Why not v1

Three reasons:
1. Offerings Catalog comes first so the recommendation + in-chat-card pattern is proven before being extended to community members.
2. Payment handling through the platform (not just redirect URLs) is genuinely complex — split payments, payouts, tax handling. Needs its own design pass and probably a Stripe Connect or similar integration.
3. Vetting workflow and community-member onboarding is a meaningful admin UX project in its own right. Doing it quickly would produce a low-quality marketplace, which would damage trust both ways.

The right sequence: ship v1, prove Mr. A is trusted. Ship Offerings Catalog, prove recommendation behavior is tasteful. Then ship Community Marketplace with all the mechanics it deserves.

## Extends naturally

- **Partner Pipeline** roadmap: some community members could be listed as "available for partnerships" in addition to (or instead of) mentorship. The pipeline view shows them alongside external prospects.
- **Coach Mode** roadmap has the concept of coaches shadowing student work. Mentors in the marketplace are paid-public coaches; Coach Mode adds private team coaches. Data model should share.
- **The MRA API** roadmap: eventually community members could be exposed via API, letting external communities or partners surface Travis's vetted experts.
