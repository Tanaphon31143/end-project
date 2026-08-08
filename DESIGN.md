---
name: School Command Center
description: A clear, calm visual system for managing school information.
colors:
  canvas: "#fafafa"
  surface: "#ffffff"
  ink: "#000000"
  muted-ink: "#666666"
  action-hover: "#383838"
  quiet-hover: "#f2f2f2"
  quiet-border: "#ebebeb"
  dark-canvas: "#000000"
  dark-ink: "#ededed"
typography:
  display:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "48px"
    letterSpacing: "-2.4px"
  body:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "32px"
  label:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  heading-mobile:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "32px"
    fontWeight: 650
    lineHeight: "35px"
  body-small:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  meta:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
  form-label:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "20px"
  footnote:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
  mono:
    fontFamily: "Consolas, monospace"
    fontSize: "0.9em"
rounded:
  check: "4px"
  code: "6px"
  control: "10px"
  mark: "12px"
  card: "20px"
  mobile-card: "16px"
  pill: "128px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "60px"
  page: "120px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
---

# Design System: School Command Center

## Overview

**Creative North Star: "The Clear School Command Center"**

The current system is intentionally quiet and direct: a white surface, black ink, restrained gray supporting text, and generous space make the first action obvious. It feels like a focused control room for school work rather than a decorative marketing surface.

The visual language is built around clarity at a glance. SF Thonburi gives Thai labels a friendly, contemporary voice; short content blocks, strong left alignment, and a small set of pill-shaped actions keep navigation and decisions easy to scan. The light theme is the primary expression, with the existing dark-mode fallback treated as a secondary system state.

**Key Characteristics:**
- White-first canvas with high-contrast black anchors
- Calm, generous spacing and left-aligned content
- SF Thonburi for interface text and Consolas for code-like inline labels
- Rounded pill actions with restrained hover changes
- Minimal decoration; hierarchy comes from type, spacing, and contrast

## Colors

The palette is monochrome and white-led, using black for decisive actions and gray only for supporting information.

### Primary
- **Command Black** ({colors.ink}): Use for primary actions and the strongest text hierarchy.

### Neutral
- **Quiet Canvas** ({colors.canvas}): The light page background.
- **Clean Surface** ({colors.surface}): The main content surface.
- **Muted Ink** ({colors.muted-ink}): Supporting copy and secondary information.
- **Quiet Border** ({colors.quiet-border}): Secondary control borders and subtle separation.
- **Action Hover Gray** ({colors.action-hover}): Hover state for primary actions.
- **Quiet Hover** ({colors.quiet-hover}): Hover state for secondary actions.

### Named Rules
**The White-First Rule.** Keep the visual field predominantly white; black is reserved for hierarchy and action rather than decoration.

## Typography

**Display Font:** SF Thonburi (with Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif fallback)
**Body Font:** SF Thonburi (with Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif fallback)
**Label/Mono Font:** Consolas for code-like labels

**Character:** Friendly, contemporary, and highly legible. SF Thonburi's Thai letterforms give the school workspace a more intentional voice while keeping dense labels and form instructions easy to scan.

### Hierarchy
- **Display** (600, 40px, 48px; -2.4px tracking): Primary page or hero heading; reduce to 32px / 40px on narrow screens.
- **Body** (400, 18px, 32px): Explanatory copy, capped around 440px in the current composition.
- **Label** (500, 14px, 20px): Action labels and compact interface controls.
- **Mono** (400, 0.9em, inherited line-height): Inline code or system identifiers.

### Named Rules
**The One Clear Heading Rule.** Give each surface one dominant heading before introducing supporting copy or actions.

## Layout

The current composition uses a centered, full-height page with a single content column capped at 800px. The main region is vertically spacious, left-aligned, and padded at 120px 60px on larger screens. Intro content is stacked with a 24px gap; action groups sit below with a 16px gap between controls.

At widths below 600px, page padding contracts to 48px 24px, the intro gap becomes 16px, and the heading scales to 32px / 40px. Preserve the single-column reading order and avoid horizontal overflow.

## Elevation & Depth

The system is flat by default. It does not use a shadow vocabulary; depth comes from the white surface against the light canvas, black-versus-gray hierarchy, spacing, and subtle borders on secondary controls.

### Named Rules
**The Flat Command Rule.** Do not add shadows to create importance; use position, contrast, and whitespace to signal what matters.

## Shapes

Actions use a generous pill silhouette with a 128px radius. Inline code uses a small 6px radius and a faint current-color background tint. The overall form language is soft at interaction points but otherwise plain and rectangular, keeping the interface legible and calm.

## Components

### Buttons
- **Shape:** Fully rounded pill (128px), 40px high.
- **Primary:** Black background with canvas-colored text, 0 16px horizontal padding, and an 8px icon-to-label gap when an icon is present.
- **Hover / Focus:** Primary shifts to action-hover gray; retain a visible keyboard focus treatment when extending the system.
- **Secondary:** White surface with a quiet border; hover shifts to quiet-hover and removes the border emphasis.

### Cards / Containers
- **Current status:** No reusable card component is implemented yet.
- **Guidance:** Prefer white surfaces and spacing before introducing borders or shadows.

### Inputs / Fields
- **Current status:** No input component is implemented yet.

### Navigation
- **Current status:** No reusable navigation component is implemented yet.

## Do's and Don'ts

### Do:
- **Do** preserve a white-first canvas and black primary hierarchy.
- **Do** use generous spacing to separate school information areas.
- **Do** keep controls short, clearly labeled, and easy to scan.
- **Do** use SF Thonburi for interface text and Consolas only for code-like content.
- **Do** maintain the narrow-screen padding and heading reduction pattern.

### Don't:
- **Don't** introduce bright accent colors without an explicit brand decision.
- **Don't** rely on shadows, gradients, or decoration to communicate hierarchy.
- **Don't** use dense multi-column layouts where a clear school workflow can remain single-column.
- **Don't** turn every piece of supporting information into a high-contrast action.
