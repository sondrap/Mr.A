---
name: Brand Assets
description: Canonical URLs for MRA's brand imagery. Reference these in code instead of hardcoding.
---

# Brand Assets

Three canonical images cover every context MRA appears in. Reference these URLs from a single constants file in the web interface (`src/interfaces/@brand/assets.ts`) so every surface uses the same source of truth.

## App icon (M monogram)

Square, 2048x2048. Bold red "M" monogram on Asphalt with atmospheric warm glow aligned to the grain aesthetic. Scales cleanly from 16px favicon up to 1024px high-res.

**URL:** `https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png`

**Where it's used:** browser favicon (all sizes via CDN `?w=` transforms), Apple touch icon, OS app switcher, PWA manifest.

~~~
Favicon link tags (in `index.html`):

```html
<link rel="icon" type="image/png" sizes="16x16"
  href="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png?w=32&fm=png">
<link rel="icon" type="image/png" sizes="32x32"
  href="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png?w=64&fm=png">
<link rel="apple-touch-icon" sizes="180x180"
  href="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png?w=360&fm=png">
<link rel="icon" sizes="512x512"
  href="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png?w=1024&fm=png">
```
~~~

**Important:** Do NOT use this PNG for the Mr. A monogram inside the chat UI or anywhere the M monogram appears as a component. AI-generated imagery has atmospheric glow baked in; it looks right at icon sizes but wrong in a 32px chat avatar. Render the Mr. A chat monogram at runtime using CSS per the `references/chat-pattern.html` wireframe (solid `#D4262C` background, Bone White "M" letterform, 2px radius square). The PNG is for OS-level and tab-level contexts only.

## Open Graph share image

4096x2150 native (1.9:1 OG aspect). Serve at 1200x630 for OG via CDN params.

A full-bleed black-and-white documentary photograph of a late-night copywriter's workbench: vintage typewriter, stacked worn letters and envelopes, steaming coffee, brass Edison lamp. Text overlays: `MOJO RESULTS ACCELERATOR` (Label) top-left, massive red `MRA` + `GET TO WORK.` center, `MR. A · v1.0` (Mono Detail) bottom-right. Red appears exactly once.

**URL (base):** `https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png`

**URL (serve-ready 1200x630):** `https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png?w=1200&h=630&fit=cover&fm=jpg&q=85`

~~~
OG / Twitter meta tags (in `index.html`):

```html
<meta property="og:image" content="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png?w=1200&h=630&fit=cover&fm=jpg&q=85">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Mojo Results Accelerator — Get to work">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png?w=1200&h=630&fit=cover&fm=jpg&q=85">
```
~~~

## Master wordmark

The user-provided master wordmark (MRA logo + full "MOJO RESULTS ACCELERATOR" name on black). Used for email signatures, marketing contexts, and full-lockup brand moments.

**URL:** `https://i.mscdn.ai/ef68baa1-6f80-4ec5-88f7-0d51d94e12c2_1776437942472.png`

## Constants file to create during build

```ts
// src/interfaces/@brand/assets.ts
export const BRAND_ASSETS = {
  appIcon: "https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5464865b-79d0-4d32-99fe-250f0c232737.png",
  ogImage: "https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png",
  ogImageServed: "https://i.mscdn.ai/c67801e6-77a9-48b2-9cc2-6bb5d3039ef8/generated-images/5b0d2033-b5d5-47ab-a224-35ac7dce5590.png?w=1200&h=630&fit=cover&fm=jpg&q=85",
  wordmarkLogo: "https://i.mscdn.ai/ef68baa1-6f80-4ec5-88f7-0d51d94e12c2_1776437942472.png",
} as const;
```
