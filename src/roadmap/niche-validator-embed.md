---
name: Niche Validator Widget
type: roadmap
status: not-started
description: The free-tier workflow becomes a self-contained embeddable tool — deployable on Travis's sales page, his Skool group, or anywhere he teaches.
requires: [mvp.md]
effort: small
---

The Validate Your Niche workflow is already MRA's best free-tier hook. It's genuinely useful — students get a polished niche doc they didn't have before — and it puts the product in their hands without a sales page. Right now, to use it, someone has to sign up for MRA, create an account, navigate the locked shell, and find the workflow. The Niche Validator Widget removes all that friction. One `<script>` tag, and the workflow can live directly on Travis's sales page, his Skool welcome post, his email campaigns, anywhere he teaches.

## What it looks like

**The embedded widget:**
A compact, self-contained UI — single text area with a simple prompt, a `VALIDATE MY NICHE →` button, and a Paper-surface output panel that appears after generation. The aesthetic is unmistakably MRA: Asphalt surface, Tanker wordmark, grain, Mojo Red CTA. It looks like a product, not a contact form.

The student types their niche description, hits the button, and within seconds gets their draft niche doc rendered in the Paper panel — specific, sourced, formatted. Below the output: a `Save this & get the full roadmap →` CTA that deep-links to MRA's signup page with their niche pre-populated.

**For Travis:**
A widget configuration panel in the admin console. Travis generates an embed code (a `<script>` tag + a `<div>`) that he pastes wherever he wants. He can configure:
- The headline text above the widget
- The CTA copy and destination URL
- Whether the output panel shows the full niche doc or just a teaser

**The conversion hook:**
When a user clicks `Save this & get the full roadmap →`, they're taken to MRA's signup page with their niche text passed as a URL parameter. After signup, their niche doc is pre-populated into a new project. The free tier delivers the niche doc immediately — paid tier unlocks the next five steps.

## Key details

- The widget works without authentication — it calls an unauthenticated public endpoint that runs the niche validation task agent
- Rate-limited to prevent abuse: one generation per IP address per 24 hours
- If the visitor is already an MRA student (identified by a session cookie), the widget connects to their account and saves the artifact directly
- The widget respects the host page's scroll behavior — it doesn't inject full-page overlays

~~~
Technical: a new public endpoint `/api/widget/validate-niche` that accepts a niche description and returns a streaming niche doc. No auth required. The widget is a self-contained JS bundle (no framework dependencies) that can be embedded with a single script tag. The bundle handles the UI, makes the streaming call, and renders the Paper-surface output panel. Admin generates embed codes via the admin console — the code includes the widget's configuration as data attributes on the div. Rate limiting by IP via the platform's built-in rate limiting or a simple `widget_usage` table.
~~~
