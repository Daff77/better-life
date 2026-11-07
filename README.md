# 🌱 Better Life — Nutrition & Healthy Living Ecosystem

[![CI / Production Readiness Checks](https://github.com/Daff77/better-life/actions/workflows/ci.yml/badge.svg)](https://github.com/Daff77/better-life/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-58-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-99%20Passed%20(100%25)-success.svg)](REPORT.md)
[![Design System](https://img.shields.io/badge/Design%20System-Impeccable%20Craft-emerald.svg)](DESIGN.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Better Life** is a full-stack, clinically grounded health, nutrition, and daily calorie management ecosystem built with **React Native (Expo SDK 58)**, **Express**, **TypeScript (Strict)**, and **PostgreSQL with Drizzle ORM**. It features validated Mifflin-St Jeor metabolic calculations, budget-aware local meal planning, tactile spring animations, security-hardened authentication, and an award-winning design system architecture.

---

## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [Problem Statement & Target Users](#-problem-statement--target-users)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Key Features & Verification Status](#-key-features--verification-status)
- [Design System & AI Craft Integration](#-design-system--ai-craft-integration)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [Installation & Quick Start](#-installation--quick-start)
- [Environment Configuration](#-environment-configuration)
- [Database Migrations](#-database-migrations)
- [Automated Testing & Type Safety](#-automated-testing--type-safety)
- [API Reference](#-api-reference)
- [Production Deployment Guidelines](#-production-deployment-guidelines)
- [Audit & Compliance Report](#-audit--compliance-report)
- [License](#-license)

---

## 📖 Project Overview

**Better Life** bridges the gap between clinical nutrition precision, user budget realities, and modern mobile app craftsmanship. Unlike typical calorie trackers that force static estimates or western grocery budgets, Better Life:
1. **Personalizes Metablism:** Automatically derives Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) using the Mifflin-St Jeor formula with goals for fat loss, maintenance, or muscle hypertrophy.
2. **Respects Local Economics:** Offers tailored meal planning categorized by realistic local budget tiers (e.g. Under Rp 20,000 / Under Rp 35,000 per meal).
3. **Enforces Design Craft:** Adheres to a strict design system ([`DESIGN.md`](DESIGN.md)) with Apple-grade tactile spring feedback, tabular numeral formatting, and zero AI-slop visual standards.

---

## 🎯 Problem Statement & Target Users

### The Problem
- **Generic Calorie Targets:** Static calorie prescriptions fail to account for individual bio-metrics, activity frequency, and healthy nutritional minimums (e.g. 1,200 kcal floor for females, 1,500 kcal for males).
- **Unrealistic Grocery Recommendations:** Suggesting obscure ingredients alienates everyday users, university students, and busy workers living in Southeast Asia.
- **Data Inconsistencies:** Serving confusion (per-100g vs per-portion) leads to inaccurate logging and metric drift.

### Target Users
- **Everyday Wellness Seekers & Students:** Seeking affordable, nutrient-dense Indonesian and international meals within accessible daily budgets.
- **Fitness Enthusiasts:** Demanding macro-nutrient control (Protein, Carbohydrates, Healthy Fats, Dietary Fiber) with zero-friction logging.
- **Mindful Habit Trackers:** Looking for calm, distraction-free visual progress without sensory overload or manipulative dark patterns.

---

## 🏗 Architecture & Data Flow

```mermaid
graph TD
    subgraph Client["Mobile & Web Client (React Native 0.88 / Expo SDK 58)"]
        UI["UI Screens & Components (NativeWind / Reanimated)"]
        ZStore["Zustand Client Stores (useJournalStore, useAuthStore, useOnboardingStore)"]
        TQ["TanStack Query v5 (Server State Caching & Optimistic Updates)"]
        SecStore["Expo SecureStore (JWT Token & Session Storage)"]
        DomLogic["Nutrition Domain Engine (Mifflin-St Jeor / Per-100g / Scaling)"]
    end

    subgraph Backend["REST API Service (Node.js / Express / TypeScript 5)"]
        SecMiddle["Security Middleware (Helmet, CORS, Express Rate Limit)"]
        AuthMiddle["Auth Middleware (JWT Bearer Verification & Expiration)"]
        ZodVal["Zod Schema Validation (Strict Input Normalization)"]
        Routes["API Controllers (Auth, Profile, Meals, Recipes, Activity, Analytics)"]
        Drizzle["Drizzle ORM / Persistence Layer"]
    end

    subgraph Database["PostgreSQL 14+"]
        DB[(Users, Profiles, Meals, Activities, Recipes, Meal Plans)]
    end

    UI --> ZStore
    UI --> DomLogic
    ZStore --> SecStore
    UI --> TQ
    TQ -->|Bearer Token HTTP Request| SecMiddle
    SecMiddle --> AuthMiddle
    AuthMiddle --> ZodVal
    ZodVal --> Routes
    Routes --> Drizzle
    Drizzle --> DB
```

---

## ✨ Key Features & Verification Status

| Feature | Description | Implementation Status | Verification |
| :--- | :--- | :---: | :--- |
| **Mifflin-St Jeor Engine** | Calculates BMR, TDEE, goal-adjusted calorie targets, and macro splits. | **Verified** | 17 Automated Unit Tests passing |
| **Macronutrient Tracking** | Tracks Protein, Carbs, Fat, and Fiber proportionately with serving scale. | **Verified** | Verified in store and UI |
| **Budget-Aware Meal Planning** | Filter recipes by slot and local price tiers (Under Rp 20k, Under Rp 35k). | **Verified** | Tested with local market estimates |
| **JWT Authentication** | Bcrypt password hashing (10 rounds) + signed JWT Bearer verification. | **Verified** | 7 Integration Tests passing |
| **IDOR Protected Meals API** | Meal deletion strictly verifies ownership against the authenticated JWT userId. | **Verified** | 8 Integration Tests passing |
| **Step & Activity Tracking** | Logs daily steps with estimated kcal burn (~0.04 kcal/step) and duration. | **Verified** | 4 Integration Tests passing |
| **Advanced Nutrition Analytics** | Multi-range (7d, 30d, custom) calorie trends, spending metrics, and report generation. | **Verified** | 12 Integration Tests passing |
| **Premium Membership System** | Plan tier entitlements, active/canceled lifecycle states, and gating security. | **Verified** | 18 Integration Tests passing |
| **CI / CD Automated Pipeline** | GitHub Actions workflow running linting, typechecks, tests, and build checks. | **Verified** | `.github/workflows/ci.yml` |

---

## 🎨 Design System & AI Craft Integration

Better Life follows a Scandinavian organic health aesthetic documented in [`DESIGN.md`](DESIGN.md):
- **Brand Colors:** Primary Emerald (`#1b7a53`), Deep Pine (`#145c3e`), Sage Mist (`#eaf5ef`), Canvas Base (`#f8faf8`).
- **Typography:** `Akatab` font family with strictly enforced `fontVariant: ["tabular-nums"]` on all calories, timers, macro grams, and currency amounts to eliminate layout jitter.
- **Physics & Motion:** Critically damped spring curves (`damping: 22, stiffness: 300`) on touch down (`scale: 0.96`), following Apple Fluid Motion and Emil Kowalski design engineering principles.
- **Impeccable Skill Integration:** Integrated [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) (`.agents/skills/impeccable`) with cross-platform compiled Rust engine and 28 specialized reference playbooks (`shape`, `critique`, `audit`, `polish`, `craft-floor`).
- **Antislop Rules (R-01 to R-38):**
  - No decorative emojis in UI buttons, badges, or headers.
  - Zero em dashes (`—`) in user-facing copy.
  - Accessible touch targets of $\ge 44 \times 44\text{ px}$.
  - Strict concentric radius geometry ($\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$).

---

## 🛠 Technology Stack

### Mobile Client (`/mobile`)
- **Runtime & Framework:** [React Native](https://reactnative.dev/) 0.88 + [Expo SDK 58](https://expo.dev/)
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS engine)
- **State Management:** [Zustand v5](https://github.com/pmndrs/zustand)
- **Server Caching:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Gestures & Animations:** React Native Reanimated v4 + React Native Gesture Handler
- **Storage:** Expo SecureStore for encrypted credentials and auth tokens

### Backend Service (`/backend`)
- **Runtime:** [Node.js](https://nodejs.org/) v20+ / TypeScript 5.x
- **Server Framework:** [Express.js](https://expressjs.com/)
- **Security:** Helmet, Express Rate Limit, Bcrypt.js, JsonWebToken
- **Database & ORM:** PostgreSQL 14+ with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/)
- **Testing:** Node.js Native Test Runner (`node:test` + `node:assert/strict`) via `tsx`

---

## 📁 Repository Structure

```text
better-life/
├── .agents/skills/           # Installed Agent skills (Impeccable, Antislop, etc.)
├── .github/
│   └── workflows/ci.yml      # Continuous Integration pipeline
├── akatab/                   # Akatab font typography family
├── assets/                   # Project branded icons and splash assets
├── backend/                  # REST API Express TypeScript service
│   ├── src/
│   │   ├── __tests__/        # Backend integration tests (65 tests)
│   │   ├── config/           # Environment variable schema validation
│   │   ├── db/               # Drizzle schemas and database client
│   │   ├── middleware/       # Auth (JWT verification) & Centralized error handler
│   │   ├── routes/           # REST endpoints (auth, meals, profile, activity, recipes, etc.)
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # State store and business logic
│   │   └── index.ts          # Server entry point
│   ├── .env.example          # Backend environment template
│   └── package.json
├── mobile/                   # React Native Expo application (SDK 58)
│   ├── app/                  # File-based routes (Expo Router)
│   │   ├── (auth)/           # Authentication screens (Login, Register)
│   │   ├── (onboarding)/     # Mifflin-St Jeor onboarding survey
│   │   └── (app)/            # Authenticated application tabs and modals
│   ├── components/ui/        # Reusable design system components
│   ├── lib/
│   │   ├── __tests__/        # Mobile domain unit tests (34 tests)
│   │   ├── nutritionDomain.ts# Mifflin-St Jeor & macro calculation engine
│   │   ├── schemas.ts        # Client/Server Zod schemas
│   │   └── sessionStorage.ts # SecureStore credential management
│   ├── stores/               # Zustand state stores
│   ├── .env.example          # Mobile environment template
│   └── package.json
├── DESIGN.md                 # Design system, tokens, typography, and motion guidelines
├── REPORT.md                 # Deep audit report & verification log
├── package.json              # Monorepo root workspace orchestration
└── README.md                 # Documentation
```

---

## ⚙️ Prerequisites & System Requirements

- **Node.js:** v20.x or v22.x LTS ([Download Node.js](https://nodejs.org/))
- **npm:** v10.x+
- **PostgreSQL:** v14+ (Local service or cloud-hosted via Neon/Supabase)
- **Expo Go:** Installed on your physical device (iOS / Android) or Android Studio / iOS Simulator.

---

## 🚀 Installation & Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/Daff77/better-life.git
cd better-life
```

### 2. Install Dependencies
```bash
# Install root workspace tooling
npm install

# Install backend dependencies
npm install --prefix backend

# Install mobile dependencies
npm install --prefix mobile
```

### 3. Start Development Servers
```bash
# Concurrently start backend API (port 4000) and Expo dev server (port 8081)
npm run dev

# Or run separately:
npm run dev:backend       # Backend API
npm run dev:mobile        # Mobile Expo Go / Metro
npm run dev:mobile:web    # Mobile Web in browser
```

---

## 🔑 Environment Configuration

### Backend (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://betterlife:betterlife_secret@localhost:5432/betterlife_db
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
CORS_ORIGIN=http://localhost:8081,http://localhost:8082,http://localhost:8085,http://localhost:3000
```

### Mobile (`mobile/.env`)
Create `mobile/.env` from `mobile/.env.example`:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://localhost:4000
```

> **Testing on Physical Devices:** Replace `http://localhost:4000` with your machine's local LAN IP (e.g., `http://192.168.1.15:4000`) so your smartphone reaches the backend over local Wi-Fi.

---

## 🗄 Database Migrations

Apply database schemas using Drizzle ORM:
```bash
cd backend
npx drizzle-kit push
cd ..
```

---

## 🧪 Automated Testing & Type Safety

The test suite runs using Node's native test runner without peer-dependency friction:

```bash
# Run all tests (65 backend + 34 mobile = 99 tests total)
npm test

# Run backend API integration tests only
npm run test:backend

# Run mobile domain unit tests only
npm run test:mobile

# Perform full monorepo TypeScript typecheck (0 errors)
npm run typecheck
```

### Test Suite Highlights
- **Nutrition Calculations (`mobile/lib/__tests__/nutrition.test.ts`):** Validates Mifflin-St Jeor formulas, goal offsets, safe minimum floors, fractional serving scalings, per-100g calculations, and daily aggregations.
- **Analytics & Trends (`backend/src/__tests__/analytics.test.ts`):** Validates multi-day windows, macro breakdowns, average daily calculations, and honest reporting on empty logs.
- **Auth & IDOR Security (`backend/src/__tests__/`):** Validates registration, bcrypt hashing, JWT verification, and strict ownership checks preventing IDOR attacks.
- **Entitlements & Plans (`backend/src/__tests__/mealPlans.test.ts` & `subscriptions.test.ts`):** Validates feature gating, allergen filtering, and subscription lifecycle state management.

---

## 🔌 API Reference

All backend endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/register` — Create account with `{ name, email, phone, password }`.
- `POST /api/auth/login` — Login with `{ email, password }`.
- `GET /api/auth/me` — *(Protected)* Fetch authenticated user profile.

### Meals & Nutrition Journal
- `GET /api/meals` — *(Protected)* Retrieve today's logged meals.
- `POST /api/meals` — *(Protected)* Log a meal with `{ type, name, calories, proteinGrams?, carbsGrams?, fatGrams?, fiberGrams?, quantity? }`.
- `DELETE /api/meals/:id` — *(Protected)* Delete an entry owned by the authenticated user.
- `POST /api/meals/reset` — *(Protected)* Clear all meals logged today.

### Profile & Personalization
- `GET /api/profile/me` — *(Protected)* Retrieve user details and metrics.
- `PUT /api/profile/personalization` — *(Protected)* Update metrics `{ goal, weight, height, gender, birthDate, cookingSkill, dietType, allergies, targetCalories }`.

### Recipes & Suggestions
- `GET /api/recipes` — Fetch culinary catalog recipes with nutritional profiles and budget estimates.
- `GET /api/recipes/:id` — Fetch full recipe details, ingredients list, and instructions.

### Analytics & Reports
- `GET /api/analytics/advanced` — *(Protected)* Fetch 7d/30d/custom calorie and macro trends.
- `GET /api/analytics/reports` — *(Protected)* Generate summarized nutritional compliance reports.

### Activity & Steps
- `GET /api/activity` — *(Protected)* Fetch daily steps, step goal, and calorie expenditure.
- `POST /api/activity/steps` — *(Protected)* Log step increments `{ steps: number }`.

---

## 🚢 Production Deployment Guidelines

### Backend Deployment (Docker / VPS / PaaS)
```bash
# Build TypeScript to production dist
npm run build:backend

# Run in production
NODE_ENV=production node backend/dist/index.js
```

### Mobile Web & Native Builds
```bash
# Export static web bundle to mobile/dist/
npm run build:mobile

# Native Android / iOS builds using Expo EAS
npx eas-cli build -p android --profile production
npx eas-cli build -p ios --profile production
```

---

## 📋 Audit & Compliance Report

A full deep-dive production audit report is maintained in [`REPORT.md`](REPORT.md), covering:
- Zero TypeScript compiler diagnostics (`tsc --noEmit`).
- 99 passing automated tests.
- Sanitized input validation through Zod schemas.
- Complete adherence to Antislop rules and Impeccable UI standards.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
