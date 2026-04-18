---
name: Typography
type: design/typography
---

Four type families, each with one job. Tanker for big structural moments (hero, section openings). Montagu Slab for editorial reading and Mr. A's voice on the page. Switzer for everything utility. Geist Mono for source citations and technical references. All fonts load on the app shell, not per-route, so streaming chat never stutters waiting for a font file.

~~~
Font loading rules:
- Load all four fonts on the shell, not per-route. Chat streams Prose (Montagu Slab) into the viewport; you cannot wait for a font mid-stream.
- Use `font-display: swap` on all families.
- Provide system fallbacks: `Georgia, 'Times New Roman', serif` for Prose; `system-ui, sans-serif` for UI Body.
- Pre-connect to `api.fontshare.com` and `fonts.googleapis.com` / `fonts.gstatic.com` in the HTML head.
~~~

```typography
fonts:
  Tanker:
    src: https://api.fontshare.com/v2/css?f[]=tanker@400&display=swap
  Montagu Slab:
    src: https://fonts.googleapis.com/css2?family=Montagu+Slab:wght@400;500;600;700&display=swap
  Switzer:
    src: https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap
  Geist Mono:
    src: https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap

styles:
  Hero Display:
    font: Tanker
    size: 72px
    weight: 400
    letterSpacing: -0.01em
    lineHeight: 0.92
    case: UPPERCASE
    description: Login, marketing, empty-state hero moments only. Never below 48px.

  Section Display:
    font: Tanker
    size: 44px
    weight: 400
    letterSpacing: 0em
    lineHeight: 0.96
    case: UPPERCASE
    description: Big section titles, dashboard greetings, workflow canvas headers.

  Editorial Headline:
    font: Montagu Slab
    size: 32px
    weight: 600
    letterSpacing: -0.015em
    lineHeight: 1.15
    description: Mixed-case warm editorial headers. Chat greetings, lesson titles, workflow step names.

  Editorial Subhead:
    font: Montagu Slab
    size: 22px
    weight: 500
    letterSpacing: -0.01em
    lineHeight: 1.3
    description: Secondary editorial headers, project titles, workflow substep labels.

  Prose:
    font: Montagu Slab
    size: 18px
    weight: 400
    lineHeight: 1.55
    description: Long-form reading copy. AI assistant replies, coaching body text, instructional copy. The voice of Travis in print.

  UI Body:
    font: Switzer
    size: 15px
    weight: 400
    lineHeight: 1.55
    description: Default interface text. Form fields, buttons, nav items, user input, project metadata.

  UI Body Small:
    font: Switzer
    size: 13px
    weight: 500
    lineHeight: 1.45
    description: Compact UI. Tabs, secondary buttons, table cells, filter chips.

  Label:
    font: Switzer
    size: 11px
    weight: 600
    letterSpacing: 0.08em
    lineHeight: 1.2
    case: UPPERCASE
    description: All-caps structural labels. Section dividers, status pills, metadata categories. The editorial signature of the system.

  Caption:
    font: Switzer
    size: 12px
    weight: 400
    lineHeight: 1.4
    description: Timestamps, helper text, secondary metadata. Usually set in Dust.

  Mono Detail:
    font: Geist Mono
    size: 12px
    weight: 500
    letterSpacing: -0.01em
    description: Source citations, keyboard shortcuts, IDs, technical references. Never body copy.
```
