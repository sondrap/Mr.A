---
name: Visual Identity
description: How MRA looks, feels, and composes across every surface. Establishes the editorial-on-asphalt aesthetic, surface stacking rules, the grain system, and screen-level direction for the major views.
---

# MRA Visual Identity

MRA looks like a tool for people doing real work, not another AI chatbot. The aesthetic sits between Kinfolk magazine, a 2024-era LLM chat surface, and the back office of a 20-year direct-response shop. Editorial typography on near-black surfaces, with a single disciplined spark of red, and a warm-cream "Paper" surface that earns its place only where a student's own written work lives.

~~~
The existing Delphi-based product (the previous version of "Mr. A") looks generic and empty. MRA's entire visual identity is a deliberate move away from that. The two biggest structural shifts: (1) chat uses editorial prose with no bubble for the assistant's reply, not iMessage-style matched bubbles; (2) the workflow walkthrough uses a tonal shift between Asphalt (instructional canvas) and Paper (student's drafted artifact) as its primary compositional move.
~~~

## Three core principles

**1. Editorial, not card-heavy.**
Hierarchy comes from typography, spacing, and rules — not from nested cards and shadows. Dashboards are tables with metadata-as-texture, not grids of tiles. Chat replies are prose on the canvas, not bubbles. Workflow steps are numbered rails, not step cards.

**2. Graphite on Asphalt.**
Elevation is communicated by tonal stepping (Asphalt → Ironwood → Gunmetal) combined with `1px solid Graphite` borders. Shadows are banned on dark surfaces except for floating popovers and drag-lift states. When a surface needs to feel lifted, step it up a rung and add a border.

**3. Grain kills the screen.**
A warm-cream noise overlay sits above the entire app, `mix-blend-mode: screen`, `pointer-events: none`. It's what gives Asphalt its "room" quality instead of flat OLED black. Paper surfaces get a different grain recipe (multiply-blended warm-brown fiber) so they read as letterhead, not as a beige div.

## Surface inventory

The legitimate elevation path is **Asphalt → Ironwood → Gunmetal**. Never nest Gunmetal inside Gunmetal. Paper is contextual, not thematic — it appears when a surface represents a student's own written work or a printed deliverable, never as a light-mode alternative.

| Surface | Color | Where it lives |
|---|---|---|
| **Asphalt** | `#0B0B0C` | App canvas. Top-level background behind everything. Login, dashboard, chat, workflow center canvas. Grain overlay active. |
| **Ironwood** | `#141416` | First elevation. Left nav rail, right panels, modal backdrops, dropdown menus, card containers inside Asphalt. |
| **Gunmetal** | `#1C1C1F` | Second elevation. Text inputs, chat composer, user chat messages, buttons in default state, cards nested inside Ironwood. |
| **Graphite** | `#27272B` | Not a surface — used only as `1px solid` border/divider color on dark surfaces. |
| **Paper** | `#F2EDE3` | Artifact panels (workflow side panel with student's drafted output), long-form editable documents, exportable deliverables, printed receipts/confirmations. Paper grain overlay active. Text on Paper is Coal. |
| **Newsprint** | `#E6DFD0` | Divider rules on Paper surfaces. Nested sections within Paper. |

Never put Asphalt inside Paper or Paper inside Asphalt without a hard Graphite or Newsprint rule separating them. The tonal shift must be intentional and announced.

## Spacing, radius, borders, shadows

**Spacing scale (px):** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Use these exclusively. The moment someone introduces a `20px` value the system drifts.

~~~
Expose as CSS variables: `--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;`
~~~

**Radius scale (px):** `0 · 2 · 4 · 8`. That's it. Most components are 2px or 4px. 8px is reserved for modals and large cards. No 12px, no pill buttons, no fully-rounded avatars.

~~~
`--radius-none: 0; --radius-sm: 2px; --radius-md: 4px; --radius-lg: 8px;`
~~~

**Borders.** `1px solid Graphite` on dark surfaces. `1px solid Newsprint` on Paper surfaces. Never mix widths. Never use a colored border for emphasis — if you need emphasis, change the inner surface color or the text weight.

**Shadows.** Banned on dark surfaces except floating popovers (`0 8px 32px rgba(0,0,0,0.4)`) and drag-lift. Skeleton loaders are flat Graphite blocks at low opacity — no animated shimmer sweep, ever.

## The grain system

A fixed noise overlay sits above the entire app at `z-index: 1`, below all content. Content lives at `z-index: 2+`.

~~~
Asphalt grain (dark surfaces, site-wide):

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.87  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: screen;
  opacity: 0.4;
}
```

The `feColorMatrix` tints the noise warm cream (rgba ~0.95/0.93/0.87) rather than neutral gray — this is what gives Asphalt its "room" quality instead of flat OLED black.

Paper grain (Paper surfaces, letterhead feel):

```css
.surface-paper { position: relative; }
.surface-paper::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.30  0 0 0 0 0.22  0 0 0 0.25 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>");
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.15;
}
```

Paper content must sit at `z-index: 1+` inside the container.

Safari fallback (test specifically on iOS Safari and macOS Safari 17+):

```css
@supports not (mix-blend-mode: screen) {
  body::before { opacity: 0.08; mix-blend-mode: normal; }
}
```
~~~

## The red discipline

Mojo Red is the only brand accent. Its power comes from scarcity. Rule of thumb: if a viewport has more than one Mojo Red element visible, demote one to Clay, Bone White, or remove it. The primary CTA, the active workflow step, the M monogram, the citation reference numbers — those are the canonical uses. Nothing else.

## Imagery

No gradient meshes, no 3D renders, no Spline scenes. Those are the current AI-app trope and reading that design language would immediately collapse MRA into the category of products it's competing against.

Two permitted kinds of imagery:

**Editorial documentary photography** (sparingly — login, major empty states, marketing only). Black-and-white or heavily desaturated. Weathered hands working, worn notebooks, a coffee cup next to a typewriter, folded letters, tractor gauges. Natural light, high grain, slightly underexposed. Never posed, never glossy office stock.

**Editorial line illustration** (in-app accents). Single-weight line drawings in Bone White or Mojo Red on Asphalt. The style of old almanac spot illustrations or *New Yorker* section bugs. Travis vernacular — a crockpot, a coffee cup with steam, a tractor silhouette, a handshake, an envelope, a folded letter. Used at small sizes (80–160px) as empty-state anchors and as section-divider ornaments in long workflows. Generated per-screen on demand, not pre-baked into a shared library.

## Screen-level direction

### Login

Full-bleed Asphalt with grain. `MRA` wordmark (Tanker, Bone White) top-left, small. Main stage is a split: left two-thirds holds a Hero Display headline in Travis voice (`GET TO WORK.` or similar — direct, not "Welcome"), supporting Prose copy below, and a compact auth form in a Gunmetal card with Mojo Red CTA. Right third holds a single editorial black-and-white photograph, full-bleed, no scrim, floating technical metadata in Mono Detail in a corner (`MR. A · v1.0`).

The 6-digit verification code input is the critical moment. Six individual Gunmetal boxes, 56px square, Switzer 24px weight 600, Mojo Red border on the active box. Auto-advance between digits. Auto-submit on paste. No layout shift when success or error state renders.

~~~
Auth method: email + 6-digit code only. SMS is technically available on the platform but invasive for this audience (paying agency owners and adults); email is the right choice.
~~~

### Project Dashboard

No card grid. An editorial table/list layout. Projects are rows with:
- Editorial Subhead (Montagu Slab 22/500) for the project title
- A `Label` all-caps metadata line: `04 THREADS · 2 WORKFLOWS · UPDATED 3H AGO · COFFEE-DATES`
- Thin 1px Graphite rule between each row
- A small Tanker-set counter in the header (`03 PROJECTS`) instead of generic "Projects (3)"
- `+ NEW PROJECT` as a Mojo Red outlined button in the header, not filled — the filled red is reserved for primary progress-moving actions inside a project

Each row is clickable and lifts only by shifting background to Ironwood on hover. No shadow, no scale.

### Chat
See the canonical pattern in `references/chat-pattern.html`. The asymmetry between the user message (flat utilitarian Gunmetal container, right-aligned, 75% max-width) and Mr. A's reply (editorial prose on the canvas, no bubble, M monogram + `MR. A` label above) is the entire point.

Source citation chips appear below the assistant's message, rendered in Geist Mono, formatted as `01 · COFFEE DATES WORKSHOP · 14:22`. They fade in *after* streaming completes — never during — to prevent layout shift.

~~~
Streaming implementation gotchas:
- Render Mr. A's reply in Prose (Montagu Slab 18px, line-height 1.55) with `min-height` reserved for the message container so layout does not shift as tokens arrive.
- Source chips are rendered into a pre-allocated container with `opacity: 0` during streaming, transitioned to `opacity: 1` on `onToken` completion.
- Never let sources or the composer push each other around.
- User message and composer both use Gunmetal with Graphite border, 4px radius.
- Inline emphasis in Mr. A's body = Mojo Red, weight 500, not italic. Cap at one per reply.
- The meta row above the reply is simply `MR. A` in Label style (Dust color), next to the 32px Mojo Red M monogram square. No subtitle, no 'responding as' framing.
~~~

### Workflow Walkthrough

Three-column layout.

**Left column (step rail, ~200px):** Numbered steps `01 · 02 · 03 · 04 · 05 · 06` in `Label` style. Current step has Mojo Red accent. Completed steps show a Brass checkmark. Upcoming steps in Smoke. The rail is Ironwood, vertical Graphite rule on its right edge.

**Center column (canvas, flexible):** Asphalt canvas with grain active. Editorial Headline for the step title, Prose instructional content, inline form inputs in Gunmetal. Action buttons at the bottom in a sticky bar: `BACK` (outlined, Bone White) and `CONTINUE` (filled, Mojo Red).

**Right column (artifact panel, ~40% on desktop):** Paper surface (`#F2EDE3`) with Paper grain active. This is where the student's drafted output lives — their niche statement, their T1 email, their outreach script. Text is Coal. The artifact panel is editable inline. Hard `1px solid Graphite` vertical rule separates center from right. No shadow. The tonal shift between center (Asphalt) and right (Paper) is the most striking compositional move in the app.

On mobile (<768px): the three columns collapse to a single flow. Step rail becomes a horizontal scrolling pip at the top. Center and artifact stack vertically with the artifact panel appearing below the canvas after the student's first input.

### Admin Console

Dense data, tight spacing, Switzer everywhere, Mono Detail for IDs and emails. The admin sees the list of approved students as a table — rows with email, plan (FULL / FREE), granted date, last active, action buttons. Header has a Hero Display count (`147 APPROVED`) and supporting metrics in UI Body (`12 active last 24h · 3 new this week`). Mojo Red appears exactly once per viewport, on the critical action (`GRANT ACCESS` or `REVOKE`).

### Free Tier Experience

A free user (signed up but not on the allowlist) sees the dashboard with the `Validate Your Niche` workflow unlocked and everything else visibly present-but-locked. Locked items are Smoke-on-Ironwood with a small Mono Detail `PAID ACCESS` tag. A persistent Ironwood strip at the bottom of the screen offers `JOIN THE FULL PROGRAM →` linking to Travis's sales page. The lock is honest: they can see what they're missing, and what they have is genuinely useful (a completed niche doc is a real artifact).

## Moodboard references

These live in the designer's internal library and don't have public URLs. Kept here as annotated notes for the coding agent and future designers.

**Locomotive agency (atmospheric photography hero).** Full-bleed moody photograph as hero, typography floating over without scrim, technical corner metadata as brand signal, halftone texture overlay. Lift: the login photo treatment, the `MR. A · v1.0` metadata corner, confident typography over imagery.

**Dark minimal portfolio with metadata-as-texture layering.** Asymmetric header with project counts as subdued data points, hero copy scaled like body text without display bombast. Lift: the project dashboard layout — projects as rows with metadata like `04 THREADS · 2 WORKFLOWS · UPDATED 3H AGO` floating above/around the title. Don't use cards.

**Robinhood home screen (chartless chart + editorial hero number).** No axis labels on chart, single accent color used once per viewport, left-aligned hero value. Lift: the admin console. Editorial hero number in Tanker, supporting metrics in UI Body. Apply Mojo Red exactly once per viewport the way Robinhood uses lime.

**ChatGPT / Claude modern chat pattern.** User messages in bubbles, AI responses as raw prose on the canvas with no container, fading text during streaming as a load indicator. Lift: exactly the pattern in `references/chat-pattern.html`. This is what separates premium AI chat from Delphi-style iMessage-clone chat.

**Split-tone editorial card (Zero fasting explore article).** Two-tone layout divided into dark-content zone + light-accent zone, headline on one side, complementary content on the other. Lift: the workflow 3-column layout, specifically the Asphalt-to-Paper tonal shift between center canvas and right artifact panel.

## Implementation gotchas (do not skip)

1. **Load all four fonts on the shell, not per-route.** Chat streams Prose into the viewport; waiting for Montagu Slab mid-stream is a layout disaster. Pre-connect, `font-display: swap`, system fallbacks declared.

2. **Grain overlay must be `position: fixed` with `pointer-events: none`**, and use `mix-blend-mode: screen`. Test on macOS Safari and iOS Safari. Fall back to low-opacity `background-image` if blend modes misbehave.

3. **Streaming text needs `min-height` reservation.** Pre-allocate vertical space for the first sentence so the composer does not hop up and down while Travis is talking. The single worst thing the app can do is shift layout during streaming.

4. **No skeleton shimmer.** Stationary Graphite blocks at low opacity. Shimmer reads 2019 and collapses the editorial tone.

5. **Dark-mode only for v1.** Paper is context-specific, not a theme variant. Do not ship a light-mode toggle.

6. **Radius tokens must be enforced.** No `border-radius: 12px` in component code. Use the tokens.

7. **Red discipline linter.** Audit every screen: is there more than one Mojo Red element visible? Demote one.

8. **Verification code input** is the first impression. Six individual 56px Gunmetal boxes, Switzer 24/600, Mojo Red border on active, auto-advance, auto-submit on paste, no layout shift on success or error.

9. **Paper grain** uses `mix-blend-mode: multiply` with warm-brown noise — different recipe from Asphalt grain.

10. **Batch-load dashboard data.** When a student lands on the dashboard, fetch project summaries + recent activity + chat thread previews in one payload. Do not stream each card in with separate spinners. Show the full editorial table at once or not at all. The density is the brand.
