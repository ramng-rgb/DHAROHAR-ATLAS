---
name: Dharohar Atlas Design System
description: Lamp-Lit Sandstone Monograph for Indian Heritage Preservation
colors:
  bg-dark: "#090D16"
  surface-card: "#141A26"
  surface-elevated: "#1A1510"
  gold-leaf: "#D4AF37"
  gold-glow: "#F3C649"
  terracotta: "#C85A32"
  terracotta-light: "#E07A5F"
  sandstone: "#D8C3A5"
  sandstone-warm: "#EFE6D8"
  text-primary: "#F6F1E9"
  text-secondary: "#D8C3A5"
  text-muted: "#A89F91"
  border-subtle: "rgba(212, 175, 55, 0.22)"
  border-accent: "rgba(212, 175, 55, 0.5)"
typography:
  display:
    fontFamily: "Cinzel, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Cinzel, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0em"
  title:
    fontFamily: "Cinzel, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.01em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-compact:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.gold-leaf}"
    textColor: "{colors.bg-dark}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.gold-glow}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
---

# Design System: Dharohar Atlas

## Overview

**Creative North Star: "The Lamp-Lit Sandstone Monograph"**

Dharohar Atlas renders India's subterranean stepwells, sun temples, and palm-leaf manuscripts not as sterile SaaS dashboards or generic tourism directories, but as an authoritative archaeological monograph illuminated by warm temple lamp-light. Deep basalt stone backgrounds (`#090D16`) anchor the viewport, echoing subterranean stepwell depths and shaded temple corridors. Warm sandstone tones (`#D8C3A5`, `#EFE6D8`) render architectural descriptions and translations with natural warmth. Genuine gold leaf (`#D4AF37`) and terracotta (`#C85A32`, `#E07A5F`) serve as disciplined accents for active coordinates, epigraphic citations, and architectural hotspots.

**Key Characteristics:**
- **Monumental Architectural Typography:** Inscriptional serifs (`Cinzel`) for monument titles and scholarly headings paired with modern, legible humanist typography (`DM Sans`) and native Indic glyphs (`Noto Sans Devanagari`, `Noto Sans Gujarati`).
- **Tactile Archaeological Depth:** Tonal layering with fine golden jaali filigree borders (`rgba(212, 175, 55, 0.22)`) rather than noisy drop-shadows or generic gray lines.
- **Academic Restraint:** Solid typographic authority—zero generic gradient text, zero thick side-accent borders (`border-l-4`), zero tacky bounce easing.
- **Themed Browser Surfaces:** Custom illuminated gold selection (`::selection`), sculpted stone scrollbars, and warm amber keyboard focus rings across all viewports.

## Colors

The palette draws directly from carved Dholpur sandstone, oxidized copper-plate grants, and lamp-lit stepwell chambers.

### Primary
- **Gold Leaf Accent** (`#D4AF37` / `#F3C649` hover): Active controls, compass waypoints, verified citations, and photogrammetric mesh calipers. Never exceeds 10% of any viewport.

### Secondary
- **Terracotta Hearth** (`#C85A32` at rest, `#E07A5F` for accessible high-contrast text on dark backgrounds): Archaeological site markers, excavation trench highlights, and danger/caution alerts.

### Neutral
- **Deep Obsidian Stone** (`#090D16`): Primary background across desktop, canvas margins, and mobile shells.
- **Basalt Surface** (`#141A26`): Card containers, inspector drawers, and floating geospatial overlays.
- **Aged Parchment Card** (`#1A1510`): Archival document panels and modal dialogs.
- **Parchment White Text** (`#F6F1E9`): Primary headings and high-contrast transcription text (≥ 11:1 on `#090D16`).
- **Warm Sandstone Text** (`#D8C3A5`): Secondary descriptions, metadata rows, and epigraphic notes (≥ 7:1 on `#090D16`).
- **Muted Stone Text** (`#A89F91`): Timestamps, coordinate labels, and footnote attributions (≥ 4.5:1 on `#090D16`).

### Named Rules
**The Rarity Rule.** The Gold Leaf accent is used on ≤10% of any screen surface. Its value comes from guiding focus to verified knowledge.

## Typography

**Display & Headline:** `Cinzel, Georgia, serif`
**Body & UI:** `DM Sans, system-ui, sans-serif`
**Indic Manuscripts:** `Noto Sans Devanagari`, `Noto Sans Gujarati`
**Telemetry & Coordinates:** `ui-monospace, SFMono-Regular, Menlo, monospace`

### Hierarchy
- **Display** (Bold 700, 3rem–4.5rem, line-height 1.1, tracking -0.01em): Atlas hero titles and landmark designations. `text-wrap: balance`.
- **Headline** (Bold 700, 1.75rem–2.25rem, line-height 1.25): Major section titles and monument names. `text-wrap: balance`.
- **Title** (SemiBold 600, 1.125rem–1.35rem, line-height 1.35): Module titles, drawer headers, and journey waypoint markers.
- **Body** (Regular 400, 1rem / 16px, line-height 1.6, measure 60–75ch): Scholarly descriptions, narrative folklore, and folio translations. `text-wrap: pretty`.
- **Body Compact** (Regular 400 / Medium 500, 0.875rem / 14px, line-height 1.5): Inspector panels, transcription cards, and search result snippets.
- **Label & Metadata** (SemiBold 600, 0.75rem / 12px, line-height 1.4, tracking 0.05em, uppercase or tabular): Badges, coordinates, tags, and timeline metrics. Minimum functional text floor is strictly 11px.

### Named Rules
**The No-Gradient Rule.** Emphasis is established through weight, tracking, and optical scale—never through rainbow or gradient text.

## Layout

- **Operate Mode (Explorer & 3D Twin):** High-density, stable multi-pane workspace with fixed coordinate headers, collapsible inspection drawer, and full-viewport WebGL canvas.
- **Read Mode (Archive Folio Viewer):** 3-pane synchronized layout: Original Scan (left), Line Coordinates (center), Grounded Translation (right) with active line tracking.
- **Persuade Mode (Landing Page):** Balanced vertical rhythm with maximum 72rem (max-w-6xl) reading measures, centered architecture diagrams, and singular card hierarchies.
- **Responsive Adaptability:** On mobile viewports (< 768px), 3-pane workspaces collapse into tabbed segment controllers with sticky touch-accessible actions (≥ 44px hit targets).

## Elevation & Depth

Surfaces rely on tonal hierarchy and fine 1px golden filigree borders (`rgba(212, 175, 55, 0.22)`) rather than diffuse colored halos.

- **At-Rest Panels:** `border: 1px solid rgba(212, 175, 55, 0.22)`, background `#141A26` or `#1A1510`.
- **Elevated Drawers:** `box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.85)`, `border: 1px solid rgba(212, 175, 55, 0.35)`.
- **Interactive Hover:** Smooth border brightening to `rgba(212, 175, 55, 0.6)` with subtle exponential scale `scale(1.01)` using `cubic-bezier(0.16, 1, 0.3, 1)`.

## Shapes

- **Base Radius:** 10px (`rounded-xl`) for panels, dialogs, and cards.
- **Control Radius:** 8px (`rounded-lg`) for buttons, search inputs, and dropdown selectors.
- **Badge / Pill Radius:** 9999px (`rounded-full`) for status indicators and category tags.
- **Architectural Dividers:** Authentic Jaali motifs and tapered gradient borders (`linear-gradient(to right, transparent, rgba(212, 175, 55, 0.4), transparent)`).

## Components

### Buttons
- **Primary:** Gold Leaf `#D4AF37` background, Obsidian `#090D16` bold text, radius 8px, padding 10px 20px. Hover transitions to `#F3C649` with exponential deceleration.
- **Secondary / Ghost:** Transparent background, Sandstone `#EFE6D8` text, fine border `rgba(212, 175, 55, 0.35)`. Hover fills with `rgba(212, 175, 55, 0.1)`.

### Cards & Containers
- **Single Hierarchy:** Never nest a bordered card inside a bordered card container. Use subtle dividers, whitespace, or tonal tinting to delineate sub-items.
- **Padding:** 16px to 24px internal padding (`p-4` to `p-6`).

### Inputs & Search Bars
- **Background:** `#141A26` with 1px border `rgba(212, 175, 55, 0.3)`.
- **Focus:** `outline: none`, `border-color: #D4AF37`, `box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.25)`.

## Do's and Don'ts

### Do:
- **Do** use `Cinzel` for headings and `DM Sans` for body copy and UI elements.
- **Do** ensure all functional text is at least 11px (12px preferred).
- **Do** apply `text-wrap: balance` to headings and `text-wrap: pretty` to body text.
- **Do** use smooth exponential deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`) for transitions.
- **Do** maintain WCAG AA contrast (≥ 4.5:1 for body copy, ≥ 3:1 for large text).
- **Do** flatten card hierarchies using dividers rather than nesting bordered cards inside bordered cards.

### Don't:
- **Don't** use generic AI default fonts like Inter, Roboto, or Space Grotesk.
- **Don't** use gradient text (`bg-clip-text text-transparent`).
- **Don't** use thick colored side-borders (`border-l-4`, `border-l-2`).
- **Don't** use `animate-bounce` or elastic easing.
- **Don't** place kickers or eyebrow labels above headings.
- **Don't** nest bordered cards within bordered cards.
