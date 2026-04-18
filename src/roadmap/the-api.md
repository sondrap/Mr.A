---
name: The MRA API
type: roadmap
status: not-started
description: The concept library and Mr. A as a documented public API — the foundation for spin-off tools, Travis's own integrations, and white-label coaching products.
requires: [full-library-ingestion.md]
effort: large
---

The concept library is the most valuable thing MRA has built. Travis's frameworks, organized, linked, searchable, and retrievable. Right now that value lives exclusively inside the MRA web app. The API opens it up. A Travis course page can embed a "Ask about this framework" chat widget. A standalone BEM Email Generator can be built on top of it. Travis's Ronin program can have its own branded coaching companion. A partner Travis sends leads to could embed a niche validator on their own site. The architecture was always meant to support this — the API makes it real.

## What it looks like

**Three API surfaces:**

**1. Concept Library API**
Read-only access to the concept library. Endpoints to search concepts, fetch a concept with its sources, and search raw source chunks. Returns structured JSON. This is the knowledge retrieval layer — any application that needs to surface Travis's frameworks can query it without building its own retrieval system.

**2. Agent API**
A conversational API endpoint that wraps Mr. A. Accepts a message (and optional thread ID for continuity), returns a streamed response in Mr. A's voice with citations. The caller can pass a system context hint to focus Mr. A on a specific workflow or topic area. This is what powers the embedded chat widget on any external page.

**3. Workflow API**
Start and advance workflow runs programmatically. An external tool can run the Validate Your Niche workflow via API — the same logic as the in-app workflow, without the MRA web UI. This is what makes mini-apps like a standalone BEM Email Generator possible.

**Developer experience:**
- A published API documentation page (outside the main app UI) — clean, readable, with example curl calls and code samples
- API keys generated from a new `API KEYS` section in the admin console — each key has a label, optional scope restriction, and usage stats
- Rate limits configurable per key
- Webhook support: callers can register a webhook to receive async workflow results instead of polling

**Example spin-off tools this enables:**
- A "Draft My BEM Email" page embedded on Travis's sales page — powered by the Workflow API
- A Travis Frameworks reference bot in his Skool group — powered by the Agent API
- A white-label "AI Marketing Coach" product Travis sells or licenses to his highest-tier students — built entirely on top of the MRA API

## Key details

- The API is authenticated via API keys — Bearer token in the Authorization header
- Each API key can be scoped to specific endpoints (Library only, Agent only, or Workflow only)
- Usage metering: every API call is logged against the key for billing and monitoring purposes
- The API is versioned from day one (`/v1/...`) — breaking changes require a new version
- Travis's own applications (the Niche Validator Widget, any future embeds) are first-party users of the API — the internal app is powered by the same endpoints, not a separate privileged path

~~~
Technical: expose the existing backend methods as documented REST endpoints via the platform's API interface. The Concept Library endpoints map directly to `searchConcepts`, `getConcept`, `searchSources`, `getSource`. The Agent endpoint creates an agent thread (or resumes an existing one) using `createAgentChatClient`. The Workflow endpoint maps to the existing workflow method calls. API key management: a new `api_keys(id, label, hashedKey, scopes[], usageCount, lastUsedAt, createdBy)` table. Key generation happens in the admin console; the raw key is shown once on creation and never stored in plaintext.
~~~
