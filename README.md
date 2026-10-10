# 🌱 Better Life — Nutrition & Healthy Living Ecosystem

[![CI / Production Readiness Checks](https://github.com/Daff77/better-life/actions/workflows/ci.yml/badge.svg)](https://github.com/Daff77/better-life/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-57-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A full-stack health, nutrition, and daily calorie management ecosystem built with React Native (Expo SDK 57), Express, TypeScript, and PostgreSQL with Drizzle ORM. Features clinically validated Mifflin-St Jeor metabolic calculations, budget-aware local meal planning, and security-hardened authentication.

---

## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [Problem Statement & Target Users](#-problem-statement--target-users)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Key Features & Implementation Status](#-key-features--implementation-status)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [Installation & Local Setup](#-installation--local-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Migrations](#-database-migrations)
- [Automated Testing](#-automated-testing)
- [API Reference](#-api-reference)
- [Production Deployment Guidelines](#-production-deployment-guidelines)
- [Known Limitations & Roadmap](#-known-limitations--roadmap)
- [License](#-license)

---

## 📖 Project Overview

**Better Life** is an end-to-end nutrition tracking and healthy lifestyle application designed to make personal health management actionable, reliable, and accessible. Rather than simply logging calories in isolation, Better Life pairs personal metabolic calculations (BMR and TDEE) with macronutrient partitioning (Protein, Carbohydrates, Healthy Fats) and budget-aware recipe recommendations tailored to local market pricing.

---

## 🎯 Problem Statement & Target Users

### The Problem
Most commercial calorie tracking apps suffer from three major shortcomings:
1. **Unrealistic Nutritional Prescriptions:** They recommend static caloric goals without accounting for age, biological sex, activity levels, or goal-based surplus/deficit adjustments.
2. **Economic Inaccessibility:** Recipe suggestions often assume expensive, hard-to-source ingredients that don't reflect realistic student or everyday grocery budgets.
3. **Data Inconsistency:** Mixed units (per 100g vs. per serving), ambiguous macronutrient tracking, and unverified mock values lead to inaccurate user estimates.

### Target Users
- **Students & Young Professionals:** Seeking affordable, high-protein, and nutrient-dense meal plans within clear daily budget boundaries.
- **Fitness Enthusiasts:** Tracking accurate macronutrient distributions (25% Protein, 50% Carbs, 25% Fat) aligned with specific surplus or deficit targets.
- **Everyday Wellness Seekers:** Looking for an intuitive, distraction-free logging interface with clear progress feedback.

---

## 🏗 Architecture & Data Flow

```mermaid
graph TD
    subgraph Client["Mobile & Web Client (React Native / Expo SDK 57)"]
        UI["UI Screens & Components (NativeWind / Reanimated)"]
        ZStore["Zustand Client Stores (useJournalStore, useAuthStore, useOnboardingStore)"]
        TQ["TanStack Query v5 (Server State Caching & Mutations)"]
        SecStore["Expo SecureStore (JWT Token & Session Storage)"]
        DomLogic["Nutrition Domain Engine (Mifflin-St Jeor / Per-100g / Scaling)"]
    end

    subgraph Backend["REST API Service (Node.js / Express / TypeScript)"]
        SecMiddle["Security Middleware (Helmet, CORS, Express Rate Limit)"]
        AuthMiddle["Auth Middleware (JWT Bearer Verification & Expiration)"]
        ZodVal["Zod Schema Validation (Strict Input Normalization)"]
        Routes["API Controllers (Auth, Profile, Meals, Recipes, Activity)"]
        Drizzle["Drizzle ORM / Persistence Layer"]
    end

    subgraph Database["PostgreSQL 14+"]
        DB[(Users, Profiles, Meals, Activities, Recipes)]
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

## ✨ Key Features & Implementation Status

| Feature | Description | Implementation Status | Verification |
| :--- | :--- | :---: | :--- |
| **Mifflin-St Jeor Engine** | Calculates BMR, TDEE, goal-adjusted calorie targets, and macro splits. | **Verified** | 17 Automated Unit Tests passing |
| **Macronutrient Tracking** | Tracks Protein, Carbs, Fat, and Fiber proportionately across servings. | **Verified** | Verified in store and UI |
| **Budget-Aware Meal Planning** | Filter recipes by slot and local price tiers (Under Rp 20k, Under Rp 35k). | **Verified** | Tested with local market estimates |
| **JWT Authentication** | Bcrypt password hashing (10 rounds) + signed JWT Bearer verification. | **Verified** | 7 Integration Tests passing |
| **IDOR Protected Meals API** | Meal deletion strictly verifies ownership against the authenticated JWT userId. | **Verified** | 8 Integration Tests passing |
| **Step & Activity Tracking** | Logs daily steps with estimated kcal burn (~0.04 kcal/step) and duration. | **Verified** | 4 Integration Tests passing |
| **CI / CD Automated Pipeline** | GitHub Actions workflow running linting, typechecks, tests, and build checks. | **Verified** | `.github/workflows/ci.yml` |

---

## 🛠 Technology Stack

### Mobile Client (`/mobile`)
- **Framework:** [React Native](https://reactnative.dev/) 0.86 + [Expo SDK 57](https://expo.dev/)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Styling:** [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS v3 engine)
- **Client State:** [Zustand v5](https://github.com/pmndrs/zustand)
- **Server State & Caching:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Animations:** React Native Reanimated v4 & React Native Gesture Handler
- **Secure Persistence:** Expo SecureStore

### Backend Service (`/backend`)
- **Runtime:** [Node.js](https://nodejs.org/) v20+ / TypeScript 5.x
- **Framework:** [Express.js](https://expressjs.com/)
- **Security:** Helmet, Express Rate Limit, Bcrypt.js, JsonWebToken
- **ORM & Database:** [Drizzle ORM](https://orm.drizzle.team/) & PostgreSQL
- **Schema Validation:** [Zod](https://zod.dev/)
- **Test Framework:** Node.js Native Test Runner (`node:test` + `node:assert/strict`) via `tsx`

---

## 📁 Repository Structure

```text
better-life/
├── .github/
│   └── workflows/ci.yml      # Continuous Integration pipeline
├── backend/                  # REST API Express service
│   ├── src/
│   │   ├── __tests__/        # Integration tests (auth, meals, activity, profile)
│   │   ├── config/           # Environment variable schema validation
│   │   ├── db/               # Drizzle schemas and database client
│   │   ├── middleware/       # Auth (JWT verification) & Centralized error handler
│   │   ├── routes/           # REST endpoints (auth, meals, profile, activity, recipes)
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # State store and business logic
│   │   └── index.ts          # Server entry point
│   ├── .env.example          # Backend environment template
│   └── package.json
├── mobile/                   # React Native Expo application
│   ├── app/                  # File-based routes (Expo Router)
│   │   ├── (auth)/           # Authentication screens (Login, Register)
│   │   ├── (onboarding)/     # Mifflin-St Jeor onboarding survey
│   │   └── (app)/
│   │       ├── (tabs)/       # Dashboard (index), Daily Meals, Recipes, Profile
│   │       └── recipe-detail.tsx
│   ├── components/ui/        # Reusable design system components
│   ├── lib/
│   │   ├── __tests__/        # Nutrition domain calculation unit tests
│   │   ├── nutritionDomain.ts# Mifflin-St Jeor & macro calculation engine
│   │   ├── schemas.ts        # Client/Server Zod schemas
│   │   └── sessionStorage.ts # SecureStore credential management
│   ├── stores/               # Zustand state stores
│   ├── .env.example          # Mobile environment template
│   └── package.json
├── package.json              # Monorepo root workspace scripts
└── README.md
```

---

## ⚙️ Prerequisites & System Requirements

- **Node.js:** v20.x or v22.x LTS ([Download Node.js](https://nodejs.org/))
- **npm:** v10.x+
- **PostgreSQL:** v14+ (Local service or cloud hosted e.g. Neon, Supabase)
- **Expo Go:** Installed on your physical device (iOS / Android) or Android Studio / iOS Simulator.

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Daff77/better-life.git
cd better-life
```

### 2. Install Dependencies
```bash
# Install root orchestration tools
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install mobile dependencies
cd mobile && npm install && cd ..
```

---

## 🔑 Environment Configuration

### Backend (`backend/.env`)
Create `backend/.env` copying from `backend/.env.example`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://betterlife:betterlife_secret@localhost:5432/betterlife_db
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
CORS_ORIGIN=http://localhost:8081,http://localhost:8082,http://localhost:8085,http://localhost:3000
```

### Mobile (`mobile/.env`)
Create `mobile/.env` copying from `mobile/.env.example`:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://localhost:4000
```

> **Testing on Physical Devices:** Replace `http://localhost:4000` with your machine's local LAN IP (e.g., `http://192.168.1.15:4000`) so your smartphone can reach the backend over local Wi-Fi.

---

## 🗄 Database Migrations

To apply schema changes to PostgreSQL using Drizzle ORM:
```bash
cd backend
npx drizzle-kit push
cd ..
```

---

## 🧪 Automated Testing

Both suites run via Node's native test runner without third-party peer conflicts:

```bash
# Run all tests across the monorepo (Backend + Mobile)
npm test

# Run backend API integration tests only (23 tests)
npm run test:backend

# Run mobile nutrition domain unit tests only (17 tests)
npm run test:mobile
```

### Test Coverage Highlights
- **Nutrition Calculations (`mobile/lib/__tests__/nutrition.test.ts`):** Validates Mifflin-St Jeor BMR/TDEE formulas, goal offsets, safe minimum floors, fractional serving scalings, zero quantities, missing fields, per-100g calculations, and daily aggregations.
- **Auth Integration (`backend/src/__tests__/auth.test.ts`):** Validates registration, duplicate email rejection (409), password hashing, JWT issuance, invalid password rejection (401), and `/api/auth/me` token authentication.
- **Meals Integration (`backend/src/__tests__/meals.test.ts`):** Validates authenticated meal logging with macros, user data isolation, IDOR protection (rejecting deletion of other users' entries), and reset actions.
- **Profile & Activity Integration (`backend/src/__tests__/`):** Validates personalization schema updates and step logging increments.

---

## 🔌 API Reference

All backend endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/register` — Create account with `{ name, email, phone, password }`. Returns JWT token.
- `POST /api/auth/login` — Login with `{ email, password }`. Returns JWT token.
- `GET /api/auth/me` — *(Protected)* Fetch authenticated user profile.

### Meals & Nutrition Journal
- `GET /api/meals` — *(Protected)* Retrieve today's logged meals for the authenticated user.
- `POST /api/meals` — *(Protected)* Log a meal with `{ type, name, calories, proteinGrams?, carbsGrams?, fatGrams?, fiberGrams?, quantity? }`.
- `DELETE /api/meals/:id` — *(Protected)* Delete an entry owned by the authenticated user. Enforces IDOR security.
- `POST /api/meals/reset` — *(Protected)* Clear all meals logged today for the authenticated user.

### Profile & Personalization
- `GET /api/profile/me` — *(Protected)* Retrieve user details and personalization metrics.
- `PUT /api/profile/personalization` — *(Protected)* Update metrics `{ goal, weight, height, gender, birthDate, cookingSkill, dietType, allergies, targetCalories }`.

### Recipes & Meal Suggestions
- `GET /api/recipes` — Fetch culinary catalog recipes with nutritional profiles and budget estimates.
- `GET /api/recipes/:id` — Fetch full recipe details, ingredients list, and step-by-step instructions.

### Activity & Steps
- `GET /api/activity` — *(Protected)* Fetch daily steps, step goal, and calorie expenditure.
- `POST /api/activity/steps` — *(Protected)* Log step increments `{ steps: number }`.

---

## 🚢 Production Deployment Guidelines

### Backend Deployment (Docker / VPS / PaaS)
1. **Environment Variables:** Provide strong production secrets for `JWT_SECRET` and a secure PostgreSQL URL with SSL mode enabled (`sslmode=require`).
2. **Build TypeScript:**
   ```bash
   cd backend && npm run build
   ```
3. **Run in Production Mode:**
   ```bash
   NODE_ENV=production node dist/index.js
   ```
4. **Reverse Proxy:** Run behind Nginx or AWS CloudFront with TLS/HTTPS certificates enabled.

### Mobile Web & Native Builds
- **Production Web Bundle:**
  ```bash
  cd mobile && npm run build
  ```
  Exports static web bundle to `mobile/dist/` ready to host on Vercel, Cloudflare Pages, or Netlify.
- **Native Android / iOS Builds:**
  Use Expo EAS Build:
  ```bash
  npx eas-cli build -p android --profile production
  npx eas-cli build -p ios --profile production
  ```

---

## ⚠️ Known Limitations & Roadmap

### Known Limitations
1. **Local Currency Estimates:** Ingredient prices in IDR are based on average urban Indonesian supermarket/market estimates and do not reflect real-time fluctuating grocery API feeds.
2. **Offline-First Synchronization:** The mobile app stores journal logs in client storage and syncs to backend; full bi-directional offline conflict resolution queue is slated for v1.1.

### Roadmap
- [ ] Barcode scanner integration for packaged foods via Open Food Facts API.
- [ ] Grocery shopping list generator aggregated from weekly meal plans.
- [ ] Push notification reminders for hydration and meal logging intervals.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
