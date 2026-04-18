---
name: Mojo Results Accelerator
description: AI-powered coaching and execution platform for Travis Sago's paid students. Three surfaces (chat, workflows, projects) over one concept library.
---

# Mojo Results Accelerator

Mojo Results Accelerator (MRA, informally "Mr. A") is an AI product built on 20+ years of Travis Sago's licensed marketing content. It's the working partner Travis's paid students open to get real work done: plan a campaign, reach out to a partner, iterate on copy, get coached through a conversation in flight.

The previous version of this product was a conversational chatbot that answered questions about Travis's world. It worked well enough for newcomers, but experienced students hit a wall. They wanted the AI to actually *do* things: "write the campaign for me," "draft the outreach," "walk me through the steps." MRA is the answer. Three surfaces, one shared brain.

~~~
This is the third attempt at productizing Travis's content. Previous attempts:
1. chatbotbuilder.ai with 12M words in Google Sheets/Docs — too slow, librarian-style.
2. delphi.ai with raw 12M-word brain — OK for newcomers, fell flat for experienced students who wanted execution.
3. delphi.ai with YAML-chunked structured content — better, but still didn't cross the chasm to tactical execution.

MRA is architected specifically to close that gap. The content is now organized by concept (not by course), workflows produce concrete artifacts, and the chat cites sources. The architecture is also meant to support spin-off tools: the concept library is the "loaf of bread," and different future products can be "slices" of it.
~~~

## Who uses it

The audience is Travis Sago's paying students: marketing agency owners, coaches, course creators, and small business operators. Roughly 500 people in Travis's main paid group, with a broader list of ~1000 active followers. They are adults running real businesses and paying four-figure sums for a year of access. They expect a real tool, not a toy.

## Roles

- **student** — paid-tier access. Full use of all surfaces (chat, all workflows, projects, artifacts). This is the default role for anyone on the admin-managed allowlist.
- **free** — signed up but not on the allowlist. Can use exactly one workflow (Validate Your Niche) and nothing else. No chat. Sees everything else as locked with a `PAID ACCESS` tag.
- **admin** — manages the allowlist (grant/revoke access), can view all users and their activity, can run ingestion, can see usage stats. Can also use the app as a student.

~~~
Role assignment:
- New signups get the `free` role automatically.
- When an admin adds an email to the allowlist, any existing user with that email is promoted to `student`; when a new signup's email matches the allowlist, they're assigned `student` on first login.
- `admin` is assigned manually through the dashboard or directly in the database. This is a small-team app; there will be a handful of admins (Travis, the app owner, maybe a VA).
- Removing an email from the allowlist demotes that user from `student` back to `free`.
~~~

## The three surfaces

### 1. Mr. A Chat — the advisor

The conversational front door. A student types a question, pastes a draft, describes a situation. Mr. A responds as himself — a focused AI coaching partner fluent in Travis's frameworks and vocabulary — with specific, sourced answers. Every reply that references Travis's content carries citation chips the student can click to see the source chunk (with course, video, timestamp, and link).

This is what Delphi was, but much better: [source-cited]{Every AI reply carries 0+ citation chips showing which chunks of Travis's content the reply drew from. Clicking a chip opens a side panel with the full source excerpt (title, course, timestamp, body, link to the original Kajabi location). The chat UI pre-allocates space for citation chips so they never cause layout shift when they fade in after streaming completes.} answers, [thread history per user]{Each student has their own chat threads. Threads are persistent. A thread can optionally be tied to a project (see below) so that when the student opens the project tomorrow, the thread is there with full context.}, [artifact-aware]{The chat can reference artifacts (the student's saved drafts from workflows). If a student is working on an outreach email and asks "can you make this more direct?", Mr. A can see the artifact and propose edits.}, and [concept-grounded]{The chat's retrieval tools search the concept library first (normalized Travis concepts like T1/T2/T3, Hell Island, BEM) and then fetch specific source chunks where those concepts are taught. This produces dramatically more specific answers than dumping the whole 12M-word corpus into context.}.

Voice input and output are first-class in chat. Students can tap a mic to dictate their message (transcribed via `mindstudio.transcribeAudio()`) and tap a speaker icon on any of Mr. A's replies to hear it played back (via `mindstudio.textToSpeech()`). An optional auto-play mode reads each reply as it finishes streaming. The voice for Mr. A is a single consistent warm-neutral voice — not an affected Travis impression. See `interfaces/web.md` for the full UX.

### 2. Workflows — the tactical tools

Purpose-built, multi-step guided walkthroughs of Travis's specific processes. Each workflow:
- Asks the student the right questions one step at a time
- Pulls the relevant Travis concepts at each step (shown inline as coaching context)
- Produces a concrete artifact the student keeps (a niche doc, a prospect list, a T1 email, an outreach pack)
- Lets the student punch into Mr. A from inside any step if they get stuck

The first workflow is `Coffee Dates On Demand + The Giving Funnel` — the full end-to-end process for finding and landing joint-venture partners. Six steps, described below. One additional workflow (`Validate Your Niche`) is also part of v1 because it's the free-tier lead magnet — it's actually step 1 of the main workflow, exposed standalone.

### 3. Projects — the container
A project is a campaign or partner the student is working on. It holds:
- The workflow run(s) for that project
- The artifacts (drafts of emails, outreach, notes)
- The chat threads tied to it

So when Jamie comes back tomorrow to respond to Justin's reply, everything is organized around the Justin project. No flat lists of 40 chat threads and 60 artifacts with no context.

~~~
Data model at a glance:
- `users` (auth table) — email, roles, displayName, avatarUrl, onboardedAt
- `access_grants` — admin-managed allowlist. email, plan ('full'|'free'), grantedBy ('admin'|'payment_system'), grantedAt, notes, revoked
- `north_stars` — 4 stable rows. id, name, description, aliases[]
- `concepts` — Travis's frameworks. id, name, description, northStarIds[], aliases[], essence, flavor, tags[]
- `skills` — student capabilities. id, name, description, conceptIds[], aliases[]
- `contexts` — courses/programs. id, name, description, aliases[], kajabiProductSlug
- `sources` — YAML chunks. id, contextId, contentId, contentName, topic, subtopic, format, chunkIndex, chunkHeading, timestampStart/End, description, flavorTag, keywords[], body, bodyHash, linkUrl
- `concept_sources` — link table. conceptId, sourceId, depth (1-5), role, extract
- `projects` — userId, name, partnerName, niche, status, createdAt
- `workflow_runs` — userId, projectId, workflowSlug, status, currentStep, state (JSON)
- `artifacts` — userId, projectId, type, title, body, sourceWorkflowRunId, version
- `conversations` — wrapper around platform agent threads. userId, projectId, agentThreadId, title
- `reviews` — adversarial review outcomes. entityType, entityId, verdict, issues, suggestedRevisions, modelUsed, cost
- `knowledge_gaps` — flagged questions Mr. A couldn't ground. userId, question, searchQueries, projectId, normalizedTag, resolvedByAdmin, resolutionNote
- `ingestion_jobs` — admin-triggered. status, totalChunks, processedChunks, errors[]

The content library is a four-layer ontology (North Stars > Concepts > Skills > Contexts) on top of source chunks. See `content.md` for the full model.
~~~

## Workflows and the skill layer

Every workflow step maps one-to-one to a **Skill** in the content library. "Validate your niche" runs the Building Targeted Prospect Lists skill. "Write your cold outreach" runs Writing a T1 Handraiser Email. The step's coaching content is pulled from the Concepts that skill uses, and the source chunks linked to those concepts (ordered by depth).

This means the library and the workflow are the same thing from two angles: the library is the reference material, the workflow is an orchestrated guided walk through a skill that uses it. Adding a new workflow is largely the act of sequencing existing skills and adding any skill-specific orchestration (prompts, input shape, task agent setup).


## The Coffee Dates + Giving Funnel workflow

This is the v1 flagship workflow. Travis teaches it as the primary way a new student goes from "I just joined Travis's world" to "I have a JV partner and money is moving." It has six steps. Each step has a clear input, a concrete output (artifact), and embedded coaching drawn from Travis's concept library.

### Step 1: Validate your niche

**Input:** The student describes who they want to work with (their instinctive niche) in free text.

**Coaching:** Travis's rule — your niche can't be `people`, it has to be more defined than that. Mr. A pushes back on vague niches ("entrepreneurs," "businesses") and helps the student sharpen until they have a niche with three-plus programs, a visible market, and identifiable partner companies.

**Output:** A niche doc — a short artifact on Paper surface stating: "I help [specific type of business/person] with [specific problem]. Examples of companies/people already serving this market: A, B, C. Why this niche has cashflow: [1-2 sentences]."

~~~
This step runs a task agent: given the student's free-text description, Mr. A searches the concept library for relevant Travis teachings on niche selection, asks 1-3 targeted sharpening questions, then produces a draft niche doc. The student can edit the doc inline, regenerate, or accept. This is the only step available to the `free` role.
~~~

### Step 2: Research your partner list

**Input:** The niche doc from step 1.

**Coaching:** Go after 7-8 figure companies with three-plus products, not solopreneurs with a list of 500 (Travis's "training wheels" concept). Ideal partner profile: established but income has plateaued or dipped, has an existing customer list, has multiple products, has one identifiable decision-maker.

**Output:** A prospect list artifact — 10-15 candidate companies/people the student could reach out to. Each entry has: name, URL, what they sell, why they fit the niche, why they're a good fit (plateau signal, customer list size estimate, decision-maker name/role if findable), and a suggested angle.

~~~
This step runs a task agent that uses `searchGoogle`, `scrapeUrl`, and `searchGoogleNews` to research candidate partners. The agent looks for: course creators with 3+ programs, newsletter/YouTube/Substack creators with established audiences, sites with visible customer testimonials (indicating a customer list). It produces structured JSON with the list, which renders as an editable Paper-surface table.
~~~

### Step 3: Draft your attraction video

**Input:** The niche and partner list from steps 1-2.

**Coaching:** The attraction video is what brings T2 respondents into your Skool group for the Giving Funnel. It's short (5-10 min), direct, and gives one specific thing away (a framework, a teardown, a Loom walkthrough). Travis's rule: "give first, the market writes your marketing."

**Output:** A video outline artifact — title + hook + 3-5 bullet points + call to action. Optional: a script draft if the student wants to go deeper.

### Step 4: Set up your Skool group

**Input:** The niche from step 1.

**Coaching:** The Skool group is where prospects land after they raise their hand. Travis's guidance on group setup: name, description, welcome post template, first three pieces of free content to seed it.

**Output:** A Skool setup artifact — group name, description copy, welcome post, content plan for the first two weeks. Plus instructions for creating the group (we don't integrate with Skool's API; we produce a checklist of what to do over there).

### Step 5: Write your cold outreach (T1 → T2 → T3)

**Input:** The partner list from step 2.

**Coaching:** Travis's T1/T2/T3 framework.
- T1 is the hand-raiser email — short, one ask (reply-back or text), no link to a landing page.
- T2 is the one-question conversation — "can you tell me a little about your situation?"
- T3 is the short offer template — only written after you've seen what hand-raisers are saying.

**Output:** An outreach pack artifact — a T1 template (tailored to the niche), a T2 standard question, and a T3 skeleton. The student can customize per-partner. Plus a plan: send T1 to one partner, wait 48 hours, iterate based on responses.

~~~
This step produces three linked sub-artifacts. The T1 is the one the student will actually send first; the T2 and T3 are prepared for later. All three appear on the same Paper artifact panel as stacked sections. The student can copy each section individually.
~~~

### Step 6: Track conversations and iterate

**Input:** The outreach pack from step 5, plus incoming partner responses the student pastes in.

**Coaching:** When a partner responds, the real work starts. Ask the one question. Listen. Identify the opening (their $400K gap, their capacity constraint, their offer that's not selling). Then propose the next step.

**Output:** A conversation log artifact per partner — what was sent, what came back, what opening was identified, what the student proposed next. This lives in the project and is updated every time the student pastes a new reply or drafts a new response.

This step is less about producing a one-shot artifact and more about giving the student a running workspace. They come back daily, paste in a new reply, and Mr. A helps them craft the next message with full context from the concept library and the thread so far.

~~~
After step 6, the student has a working partnership pipeline. If they land a partner, they move into a different workflow (not in v1) for launch planning. For v1, step 6 is the end of the guided track; further coaching happens in Mr. A Chat inside the project.
~~~

## Auth and gating
Authentication is email + 6-digit code. No SMS. No social logins. No passwords. New users sign up by entering their email and verifying a code.

~~~
Email is chosen over SMS because the audience (paying agency owners, adults running businesses) perceives phone-number collection as invasive, and most of them will be using the app from desktop where email is more natural anyway. Platform supports both; we opt for email only.
~~~

Access is gated by an allowlist (`access_grants` table). There are two ways emails get onto the allowlist:

1. **An admin manually adds an email** in the admin console (comps, team members, testing, support cases).
2. **An external payment system POSTs a webhook** to `/_/api/access/grant` when a customer completes checkout.

MRA does not process payments, manage subscriptions, or talk to Kajabi. Payments live entirely in an external system the user is building separately. That payment system is responsible for telling MRA when someone has paid (via the grant webhook) and when someone should lose access (via the revoke webhook). See `src/references/access-webhook.md` for the full integration contract.

New user journey:
1. Hit the app for the first time.
2. Enter email, verify code.
3. Account created with role `free`.
4. Land on the dashboard. The Validate Your Niche workflow is unlocked. Everything else shows as locked with a `PAID ACCESS` tag.
5. If the email matches an entry in `access_grants`, the role is promoted to `student` on login and the full app unlocks.

The common path: the payment system POSTs the grant webhook the moment a customer pays. The customer then signs up with the same email (either later that day or weeks later — the grant is pre-recorded) and is promoted to `student` the moment they verify.

## Grounding: the content is the product

Mr. A, and every workflow-generated artifact, is strictly bounded by Travis's library. No general LLM knowledge about marketing. No web search from inside chat. No generic best-practice advice. If the library doesn't have it, Mr. A says so and logs the gap — he does not freelance.

This is what makes MRA different from a free LLM. Students are paying for Travis's 20 years of teaching made queryable, not another chatbot with opinions. The moment Mr. A starts paraphrasing generic internet wisdom, the product's trust collapses.

### The rule, stated three ways

- **For chat:** every substantive claim must be grounded in at least one source chunk returned by Mr. A's retrieval tools. No sources = no claim. Instead: acknowledge the gap, flag it, offer whatever adjacent content does exist.
- **For workflow coaching:** the concepts, rules, and guidance pulled into each workflow step come from the library. The coaching text IS sourced.
- **For workflow research steps:** one narrow exception. The partner-research step in Coffee Dates + Giving Funnel uses web tools (searchGoogle, scrapeUrl) because finding real external companies is an external-world operation, not a teaching question. The *criteria* for a good partner come from the library; the *list of candidates* comes from the web. This exception is scoped to that step and its task agent's tool list.

### Knowledge gaps table

Every time Mr. A or a workflow agent can't ground an answer, a row is written to `knowledge_gaps`:

- the user's question (verbatim, redacted of PII server-side)
- the queries Mr. A tried (searchConcepts query, searchSkills query, etc.)
- the empty tool results
- the project context if any
- a normalized question-type tag computed server-side so admins can see patterns
- the user ID (so repeat askers are visible)

Surfaces in the admin console's Content tab as `KNOWLEDGE GAPS · 47 THIS WEEK`. Clicking opens a clustered list (questions grouped by normalized tag) so admins can see: "13 students asked about cold email for SaaS this week and the library has nothing on that — Travis should record something, or we missed ingestion on a relevant chunk."

~~~
Table: `knowledge_gaps` — userId, question, searchQueries (JSON), projectId (nullable), normalizedTag, resolvedByAdmin (bool), resolutionNote, createdAt

Normalized tag generation: a small task agent reads the question + searches and assigns a short category label ("cold-email-saas", "partner-research-non-english-markets", "refund-handling"). Clusters similar gaps together so admins see patterns not individual data points. Runs async after the gap is logged; cheap Haiku-class model.
~~~


## Adversarial review

MRA uses adversarial review in the two places it matters most: **artifact generation** (what students get back from workflow steps) and **concept linking** (what the ingestion pipeline writes to the database). Not everywhere. Chat replies, tool calls, and administrative operations do not go through review — chat is already iterative, tools are deterministic, admin actions are deliberate.

### Artifact review (workflow steps)

After a workflow-step task agent generates an artifact (niche doc, prospect list, T1 email, outreach pack), a separate `reviewArtifact` agent reads the output and critiques it against:

- The source chunks the generator pulled — is the artifact actually grounded in Travis's teaching, or drifting?
- The skill's known rules (e.g. T1 emails: short, one ask, no link; niche docs: can't be "people," need 3+ programs)
- Output hygiene — no corporate vocabulary, no marketing fluff, matches Mr. A's voice

The reviewer returns a structured verdict:
- `pass` — artifact goes through to the student cleanly
- `revise` — artifact regenerates once with the critique injected as additional instructions
- `surface_issues` — artifact ships to the student but flags the concerns openly in the UI ("Mr. A flagged some concerns — see below")

Two consecutive fails (`revise` then fails review again) automatically becomes `surface_issues`. Better to be transparent than silently confident.

~~~
Model strategy: use a different provider for the reviewer than the generator where practical — avoids shared blind spots. If the generator is Claude Sonnet 4.6, the reviewer is GPT-5 (or Gemini 3). Whatever the best models are at build time; look up via `askMindStudioSdk`. Reviewer runs on the same `runTask` pattern as the generator but typically with a smaller model since critique is a lighter job than generation.

Review outcomes are stored in a `reviews` table (reviewedEntityId, entityType, verdict, issues[], suggestedRevisions, modelUsed, cost). Useful for debugging prompts, tuning over time, and giving the admin visibility into review quality.

Per-workflow review can be toggled off by admin for debugging or cost control. Default: on for every workflow step.
~~~

### Concept-link review (ingestion)

After the concept-linker agent proposes `concept_sources` links for a chunk, a cheap reviewer agent validates each link before it's written to the database. The chunk + the proposed link (conceptId, depth, role, extract) goes in; a pass/fail verdict comes out. Rejected links go to an admin queue rather than silently entering the database.

Candidate new-concept proposals also go through review before landing in the admin queue, so the admin isn't wading through obviously-wrong suggestions.

~~~
Ingestion review uses the same cheap Haiku-class model as the linker itself — the operation is small (read chunk, check a proposed link against it) and we're running it across tens of thousands of chunks. The cost delta is small; the quality delta on the `concept_sources` table is large.
~~~

### Where review does NOT run

- Chat replies — the student-in-loop is the adversarial process
- Tool calls and database reads — deterministic, nothing to critique
- Manual admin operations (grant access, edit ontology) — deliberate human actions
- Voice transcription / TTS — not generative in the hallucination sense


## Source citation system

Every assistant reply in Mr. A Chat, and every piece of coaching content inside a workflow step, cites its sources. Students have explicitly asked for this in the Delphi logs ("can you tell me from which training and the location you derived this message from") and it's the single biggest trust move in the app.

A citation has: `reference number`, `source title` (course/video name), and a locator (timestamp for videos, page for docs). Clicking a citation opens a side panel with the full source chunk and a link to the original Kajabi location.

~~~
Implementation: the agent's retrieval tools return sources along with their content. The agent includes inline markers like `[1]` or `[2]` in its reply text, and the frontend renders them as the citation chips. The chip's `01 · COFFEE DATES WORKSHOP · 14:22` format comes from `source.contentName` and a formatted timestamp from `source.timestampStart`. The click-to-expand panel shows the full `source.body` with course context.
~~~

## Content ingestion
Travis's content (~12M words) already exists in YAML-chunked form outside MRA. Ingestion imports those chunks into the `sources` table and links them to Concepts.

The ontology itself (North Stars, Concepts, Skills, Contexts) is seeded from a JSON file that ships with v1. The user's existing ontology work is the canonical source of truth — MRA does not invent its own taxonomy.

~~~
Ingestion has three phases:
1. Ontology seed — upsert North Stars, Concepts, Skills, Contexts from the JSON
2. Source import — parse YAML-chunked files, upsert rows in `sources` keyed on `(contentId, chunkIndex)`, resolving `contextId` from the chunk's parent content ID
3. Concept linking — a task agent reads each chunk and writes `concept_sources` rows with depth + role for every concept the chunk teaches

See `content.md` for the full schema and pipeline.

V1 scope:
- Seed the full ontology (4 North Stars, 16 Concepts, 16 Skills, 11 Contexts)
- Ingest ~30-50 representative chunks covering the Coffee Dates + Giving Funnel + related material
- The dev scenario seeds a curated subset so the app is fully usable without a real ingestion run
- Full 12M-word ingestion is a roadmap item (`Full Library Ingestion`)
~~~
