# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
- **Primary Users:** Everyday health & wellness seekers, students, young professionals, and fitness enthusiasts tracking daily calories and nutrition.
- **Situation:** Fast-paced daily lives needing quick food logging, budget-conscious meal ideas, and clear progress without cognitive overload.
- **Core Job:** Understand daily caloric and macronutrient balance, plan affordable meals based on Indonesian local ingredient pricing, and track healthy lifestyle habits.

## Product Purpose
Better Life exists to make healthy eating actionable, culturally accessible, and economically realistic. Success means the user feels confident, calm, and in control of their daily nutrition without guilt or confusing data.

## Positioning
Unlike western-centric calorie trackers with expensive imported grocery recommendations and static calorie numbers, Better Life couples validated Mifflin-St Jeor metabolic science with authentic Indonesian market pricing tiers (e.g. Under Rp 20,000 / Under Rp 35,000 per meal) and an Apple-grade tactile design system.

## Operating Context
- **Platforms:** Native iOS & Android via Expo SDK 58 / React Native 0.88, plus responsive desktop/tablet web.
- **Usage Scenes:** Quick one-handed phone logging while eating or grocery shopping; reviewing weekly nutrition and meal plans at home or work.
- **Operating Environment:** Offline-resilient client storage (Expo SecureStore + Zustand) synchronizing to an Express & PostgreSQL backend.

## Capabilities and Constraints
- **Capabilities:** BMR/TDEE calculation, macro partitioning (Protein, Carbs, Fat, Fiber), portion scaling, per-100g calculations, budget-tiered meal planning, recipe instructions, step counter, advanced analytics.
- **Constraints:** Zero decorative emojis in UI buttons or badges. Zero em dashes in interface copy. Strict IDOR protection and user data isolation. Minimum 44x44pt touch targets. Tabular numbers on all changing figures.

## Brand Commitments
- **Name:** Better Life
- **Aesthetic:** Scandinavian organic health clarity paired with Apple fluid interface mechanics.
- **Palette:** Forest Green (`#153e28`), Deep Pine (`#0f2e1e`), Sage Mist (`#eaf2ec`), Off-White Canvas (`#faf9f5`).
- **Typography:** `Akatab` font family with negative tracking on headings and tabular numbers on metrics.

## Evidence on Hand
- **Test Suite:** 99 automated tests passing (65 backend integration tests, 34 mobile domain unit tests).
- **TypeScript:** Strict typecheck with 0 errors across the monorepo.
- **Design Tokens:** Documented in `DESIGN.md`, `mobile/constants/DesignTokens.ts`, and `mobile/constants/AnimationTokens.ts`.

## Product Principles
1. **Clinical Accuracy First:** Metabolic targets and calorie floors are grounded in validated nutritional science, never arbitrary guesses.
2. **Economic Accessibility:** Meal recommendations respect real local Indonesian grocery budgets.
3. **Tactile Craftsmanship:** Fluid, critically damped spring motion (Apple / Emil Kowalski) on all interactive cards and controls; no artificial visual noise.
4. **Honest Copy & Privacy:** Direct, informative language with zero clickbait, zero em dashes, and strict user data protection.

## Accessibility & Inclusion
- WCAG AA contrast ratio compliance on all text (minimum 4.5:1 body, 3:1 display).
- 16px to 17px input font sizes preventing unwanted mobile Safari zoom.
- Full screen reader accessibility labels (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`) on all interactive controls.
