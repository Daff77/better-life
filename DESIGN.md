---
name: Better Life
description: Health, Nutrition & Habit Tracker mobile and web application with a Vialo-inspired editorial wellness aesthetic.
colors:
  primary: "#0e7a52"
  primary-dark: "#0b6b47"
  primary-light: "#e2f2ec"
  canvas: "#edf1ee"
  surface-card: "#fbfdfc"
  surface-card-2: "#f0f4f1"
  ink: "#121a16"
  ink-2: "#2e3a33"
  muted: "#56605a"
  line: "#e6eae7"
  line-2: "#d5dbd7"
  block-amber: "#f3b23c"
  block-green: "#0e7a52"
  block-ink: "#141c18"
  block-mist: "#dfe6e1"
  status-success: "#0e7a52"
  status-error: "#b92d26"
  status-warning: "#946000"
typography:
  display:
    fontFamily: "Urbanist, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Urbanist, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Urbanist, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Urbanist, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0em"
  caption:
    fontFamily: "Urbanist, sans-serif"
    fontSize: "0.78125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  2xl: "22px"
  3xl: "26px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Better Life — Design System & Craft Guidelines

> **Design Read:** Health, Nutrition & Habit Tracker mobile and web application inspired by the Vialo editorial workspace aesthetic.  
> **Dials:** ENERGY 2 (Balanced) / RHYTHM 2 (Structured) / MOTION 2 (Spring-driven tactile).

---

## Overview

Better Life is built on intentionality, clarity, and calm precision. Inspired by the Vialo reference system, it pairs a cool mint-grey canvas (`#edf1ee`) with crisp near-white surface cards (`#fbfdfc`), hairline dividers (`#e6eae7`), geometric `Urbanist` typography, proportional `MixBar` visualizations, and high-contrast filled color blocks (`amber`, `green`, `ink`, `mist`) instead of nested boxes-inside-boxes.

---

## Colors

All color pairings adhere strictly to WCAG AA contrast standards (minimum 4.5:1 for body copy, 3:1 for large display elements).

### Primary & Filled Block Tokens
- **Primary Emerald (`#0e7a52`):** Dominant brand accent used for primary actions, active floating dock, and protein/target progress.
- **Filled Block Amber (`#f3b23c` / text `#1b1406`):** Highlighted status blocks, carbohydrate segments, and Premium callouts.
- **Filled Block Ink (`#141c18` / text `#f2f6f3`):** Active filter pills, active desktop tabs, fat macro segments, and high-contrast summary blocks.
- **Filled Block Mist (`#dfe6e1` / text `#121a16`):** Neutral secondary blocks and empty/remaining track segments.

### Neutral Foundation
- **Canvas Base (`#edf1ee`):** Cool, calm sage-tinted canvas background.
- **Card Surface (`#fbfdfc`):** Elevated card surface with a 1px structural hairline (`#e6eae7`) and soft ambient drop shadow.
- **Secondary Surface (`#f0f4f1`):** Subtle inset surface for segmented tracks, search fields, and input wells.
- **Headings & Body (`#121a16`):** Deep pine-charcoal ink for primary typography.
- **Muted Subtext (`#56605a`):** Calibrated muted sage-grey for secondary captions and metadata.

---

## Typography

- **Font Family:** `Urbanist` (`Regular`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`).
- **Display & Page Headings:** `SemiBold` (`600`) with tight line-height and negative letter-spacing (`-0.025em` to `-0.03em`), avoiding overly heavy black weights so large numerals and titles feel refined.
- **Body & Forms:** 16px to 17px input text size (strictly prevents unwanted auto-zoom on mobile Safari).
- **Tabular Numerals:** All changing numbers, calories, macros, timers, and prices MUST use `fontVariant: ["tabular-nums"]` to prevent jitter or layout shifts.

---

## Layout & Navigation

- **Mobile-First Floating Dock (<768px):** Bottom-anchored emerald pill dock (`#0e7a52`) with an expanding white active pill (`bg-card`) showing icon + label, respecting safe-area insets.
- **Desktop/Tablet Workspace (>=768px):** Top bar with brand mark, centered pill navigation track (`#141c18` active pill), status action, and avatar, paired with a left vertical emerald quick-action dock.
- **Touch Targets:** Minimum 44x44pt on iOS and 48x48dp on Android, utilizing `hitSlop` on compact circular `RingButton` controls.

---

## Elevation & Shapes

- **Single Surface Elevation:** Cards use `Surface` (`rounded-[22px]`, `border-[#e6eae7]`, and `0px 1px 1px rgba(16, 22, 40, 0.04), 0px 16px 32px -24px rgba(16, 22, 40, 0.38)`).
- **Ruled Lists Over Nested Cards:** Inside a `Surface`, items are separated by 1px hairline rules (`ListRow`) or highlighted as flat filled `ColorBlock` tiles—never nested bordered white cards inside white cards.
- **Pills for Controls:** Full pill shapes (`rounded-full`) are used for `PillButton`, `FilterChip`, `StatusPill`, and `Segmented` controls.

---

## Do's and Don'ts

### Do's
- Always format changing numbers with `fontVariant: ["tabular-nums"]`.
- Use consistent 1.7px stroke vector icons via `LineIcon` alongside domain food illustrations.
- Scale interactive cards and pills smoothly with `PressableScale`.
- Provide complete Loading, Empty, and Error recovery states.
- Ensure touch targets are at least 44x44pt.

### Don'ts
- Do not use em dashes (`—`) in user-facing UI copy (use commas, colons, or middle dots `·`).
- Do not use decorative emojis (no 🥗, 🥑, ⚡, 🎯) in buttons, headers, or badges.
- Do not nest bordered white cards inside white cards.
