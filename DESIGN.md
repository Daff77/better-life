---
name: Better Life
description: Health, Nutrition & Habit Tracker mobile application with a clean Scandinavian organic SaaS aesthetic.
colors:
  primary: "#153e28"
  primary-dark: "#0f2e1e"
  primary-light: "#eaf2ec"
  secondary: "#e4ede7"
  secondary-soft: "#f2f7f4"
  accent-sage: "#52796f"
  accent-amber: "#b45309"
  neutral-dark: "#1c201d"
  neutral-muted: "#5a625b"
  neutral-border: "#dcdfd9"
  neutral-border-light: "#eae8e1"
  neutral-bg: "#faf9f5"
  surface-card: "#ffffff"
  status-success: "#153e28"
  status-error: "#b91c1c"
  status-warning: "#b45309"
typography:
  display:
    fontFamily: "Akatab, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Akatab, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Akatab, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Akatab, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  caption:
    fontFamily: "Akatab, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  3xl: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  button-secondary:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.2xl}"
    padding: "18px"
  badge:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Better Life — Design System & Craft Guidelines

> **Design Read:** Health, Nutrition & Habit Tracker mobile application for mindful wellness, with a clean Scandinavian organic SaaS aesthetic.  
> **Dials:** ENERGY 2 (Balanced) / RHYTHM 2 (Structured) / MOTION 2 (Spring-driven tactile).

---

## Overview

Better Life is built on intentionality, trust, and serenity. It avoids sterile AI templates, harsh drop shadows, and hyper-distracting trend-stacking (no unwarranted gradients, full-page glassmorphism, or decorative emojis). Every visual and interactive decision serves a concrete purpose: clarity, hierarchy, or tactile confidence.

---

## Colors

All color pairings adhere strictly to WCAG AA contrast standards (minimum 4.5:1 for body copy, 3:1 for large display elements). Secondary copy on tinted backgrounds derives its hue from the parent background, never raw desaturated gray.

### Primary Brand Ramps
- **Primary Forest (`#153e28`):** Dominant brand tint used for primary actions, success confirmations, and calorie progress rings.
- **Deep Pine (`#0f2e1e`):** Active/pressed states for primary controls.
- **Sage Mist (`#eaf2ec`):** Subtle background tint for nutrition highlights and chip containers.
- **Accent Sage (`#52796f`):** Secondary metadata, focus accents, and supporting data visualizations.

### Neutral Foundation
- **Canvas Base (`#faf9f5`):** Off-white background providing gentle warmth without eye fatigue.
- **Card Surface (`#ffffff`):** Pure white elevated surface with subtle structural borders (`border-[#eae8e1]`).
- **Headings & Body (`#1c201d`):** High-contrast neutral dark text.
- **Muted Subtext (`#5a625b`):** Secondary descriptions and helper captions.

---

## Typography

- **Font Family:** `Akatab` (Regular, Medium, SemiBold, Bold, ExtraBold, Black).
- **Display Headings:** Tight line-height (1.1 - 1.2) with optical weight emphasis and negative tracking (-0.02em to -0.03em).
- **Body & Forms:** 16px to 17px input text size (strictly prevents unwanted auto-zoom on mobile Safari).
- **Tabular Numerals:** All changing numbers, calories, macros, timers, and prices MUST use `fontVariant: ["tabular-nums"]` to prevent jitter or layout shifts.

---

## Layout

- **Spatial Rhythm:** Tight groupings with generous separation. More space above headings than below them.
- **Mobile Edge-to-Edge:** Respects native safe-area insets (`react-native-safe-area-context`) on all devices.
- **Responsive Adaptability:** Clean single-column layout on mobile (<768px), dual-column on tablet/desktop (>=1024px).
- **Touch Targets:** Minimum 44x44pt on iOS and 48x48dp on Android, utilizing `hitSlop` on compact controls.

---

## Elevation & Depth

- **Single Elevation Declaration:** Declare elevation once: border OR soft multi-stop shadow. Never stack hard borders under wide soft shadows.
- **Subtle Ambient Depth:** Card shadows use soft, low-opacity ambient diffusion: `shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_20px_rgba(20,50,25,0.02)]`.
- **Image Outlines:** Food and recipe imagery employ a delicate `border border-black/[0.06]` border to provide depth separation from container surfaces.

---

## Shapes

- **Concentric Radii:** Inner element corners mirror outer card bounds:  
  $$\text{Outer Radius} = \text{Inner Radius} + \text{Padding}$$
- **Card Architecture:** Outer containers use `rounded-2xl` (`20px`) with `p-4.5` padding, pairing harmoniously with `rounded-xl` (`12px`) inner buttons or chips.
- **Pills for Controls:** Full pill shapes (`rounded-full`) are reserved for interactive buttons, filter chips, and status tags.

---

## Components

- **Button:** Tactile press response with Apple spring physics (`scale: 0.97`, `damping: 26, stiffness: 320`). Includes loading spinner and success states.
- **Card:** Whole-container spring scale on press (`scale: 0.985`), smooth border/shadow elevation, and concentric corners.
- **Input:** Floating focus states, error helper text, clear 44pt toggle targets, and secure password display.
- **ProgressRing:** Clean circular SVG gauge with tabular percentage typography.
- **NutrientBar:** Proportional macro progression indicator with calibrated protein, carb, and fat color ramps.

---

## Do's and Don'ts

### Do's
- Always format changing numbers with `fontVariant: ["tabular-nums"]`.
- Use authored SVG vector icons via `IconRenderer`.
- Scale the entire interactive card container when touched.
- Provide complete Loading, Empty, and Error recovery states.
- Ensure touch targets are at least 44x44pt.

### Don'ts
- Do not use em dashes (`—`) in user-facing UI copy (use commas, colons, or parentheses).
- Do not place kicker / eyebrow labels above headings; let the heading carry its own weight.
- Do not use decorative emojis (no 🥗, 🥑, ⚡, 🎯) in buttons, headers, or badges.
- Do not use hard offset shadows (`4px 4px 0`) or artificial glassmorphism as mere decoration.
- Do not nest cards inside cards.
