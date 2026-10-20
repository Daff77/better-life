# Better Life — Design System & Craft Guidelines

> **Design Read:** Health, Nutrition & Habit Tracker mobile application for mindful wellness, with a clean Scandinavian organic SaaS aesthetic.  
> **Dials:** ENERGY 2 (Balanced) / RHYTHM 2 (Structured) / MOTION 2 (Spring-driven tactile).

---

## 1. Brand Identity & Aesthetic Foundations

Better Life is built on intentionality, trust, and serenity. It avoids both sterile, generic AI templates and hyper-distracting "trend stacking" (no unwarranted gradients, full-page glassmorphism, or decorative emoji).

- **Brand Spirit:** Warm Scandinavian organic health & clinical nutrition clarity.
- **Core Principle:** Every visual and interactive decision serves a concrete purpose (clarity, hierarchy, or tactile confidence).

---

## 2. Color System & Contrast Calibration

All colors follow strict WCAG AA contrast requirements (minimum 4.5:1 for body copy, 3:1 for large display elements).

### Primary Brand Ramps
- **Primary Emerald (`#1b7a53`):** Main interactive actions, success badges, and calorie progress rings.
- **Deep Pine (`#145c3e`):** Active/pressed states for primary controls.
- **Sage Mist (`#eaf5ef`):** Subtle background tint for nutrition highlights and chip containers.
- **Accent Teal (`#1e6074`):** Activity tracking, secondary metadata, and focus accents.

### Neutral Foundation
- **Canvas Base (`#f8faf8`):** Off-white background providing gentle warmth without eye fatigue.
- **Card Surface (`#ffffff`):** Pure white elevated surface with subtle structural borders (`border-[#e5ece7]`).
- **Headings & Body (`#111827`):** High-contrast neutral dark text.
- **Muted Subtext (`#64748b`):** Secondary descriptions and helper captions.

---

## 3. Typography & Numerical Precision

- **Font Family:** `Akatab` (Regular, Medium, SemiBold, Bold, ExtraBold, Black).
- **Display Headings:** Tight line-height (1.1 - 1.2) with optical weight emphasis.
- **Body & Forms:** 16px to 17px input text size (strictly prevents unwanted auto-zoom on mobile Safari).
- **Tabular Numerals:** All changing values, calories, macros, timers, and prices MUST use `fontVariant: ["tabular-nums"]` to prevent jitter or layout shifts.

---

## 4. Tactile Motion & Spring Physics (Apple Design + Emil Kowalski)

- **Response on Press-In:** Immediate tactile feedback on touch-down via Reanimated springs.
- **Scale on Press:**
  - Standard Buttons: `scale(0.96)` with critically damped spring (`damping: 22, stiffness: 300`).
  - Interactive Cards: `scale(0.985)`.
  - Filter Chips: `scale(0.96)`.
- **Interruptible Animations:** State transitions animate from current presentation values.
- **Motion Restraint:** No infinite floating loops or unprompted pulsing animations that cause cognitive load.

---

## 5. Concentric Geometry & Depth Hierarchy

- **Concentric Radii:** Inner element corners mirror outer card bounds:  
  $$\text{Outer Radius} = \text{Inner Radius} + \text{Padding}$$
- **Card Architecture:** Outer containers use `rounded-2xl` (`16px`) with `p-4` (`16px`) padding, pairing harmoniously with `rounded-xl` (`12px`) inner buttons or chips.
- **1px Subtle Image Outlines:** Food and recipe imagery employ a delicate `border border-black/[0.06]` border in light mode to provide depth separation from container surfaces.
- **Shadows for Elevation, Borders for Structure:** Multi-stop transparent elevation shadows replace harsh dark borders.

---

## 6. Antislop & Craftsmanship Hard Gates (R-01 to R-38)

- **R-02 (Copywriting):** Em dashes (`—`) are strictly forbidden in UI text. Use commas, hyphens (`-`), colons, or parentheses.
- **R-03 (Mobile Responsiveness):** Fluid vertical flow with zero horizontal scrolling. Touch targets have at least 44x44px activation area.
- **R-04 (Iconography):** Pure SVG vector icons via `IconRenderer`. Zero decorative emojis (no ⚡, 📖, 🎯, 🥗, 🥑) in headers, buttons, or badges.
- **R-08 (Buttons & CTAs):** Context-specific button labels ("Log to Journal", "Explore Recipes", "Save Plan"). Avoid generic arrows (`→` or `›`) appended without direction purpose.
- **R-16 (Honest Language):** Clear, descriptive copy. No exaggerated AI buzzwords.
- **R-27 (Complete States):** Every data view accounts for Empty, Loading, and Error states with informative guidance.
- **R-32 (Accessibility):** Accessible names on all icon controls, keyboard focus rings, and screen reader labels.
