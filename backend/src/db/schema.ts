import { pgTable, text, timestamp, integer, boolean, jsonb, doublePrecision } from "drizzle-orm/pg-core";

// 1. Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Profiles & Personalization table
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  goal: text("goal").notNull(), // "Eat balanced" | "Lose weight" | "Gain muscle"
  weight: doublePrecision("weight").notNull(),
  height: doublePrecision("height").notNull(),
  gender: text("gender").notNull(), // "Female" | "Male"
  birthDate: jsonb("birth_date").notNull(), // { day, month, year }
  cookingSkill: text("cooking_skill").notNull(), // "Low" | "Middle" | "High"
  dietType: text("diet_type").notNull(),
  allergies: jsonb("allergies").notNull(), // string[]
  targetCalories: integer("target_calories").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Foods & Recipes table
export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(), // "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink"
  calories: integer("calories").notNull(),
  prepTimeMinutes: integer("prep_time_minutes").notNull(),
  difficulty: text("difficulty").notNull(), // "Easy" | "Medium" | "Hard"
  description: text("description").notNull(),
  svgIcon: text("svg_icon").notNull(),
  imageUrl: text("image_url"),
  estimatedCostIdr: integer("estimated_cost_idr"),
  isPremium: boolean("is_premium").default(false).notNull(),
  nutrition: jsonb("nutrition").notNull(), // { proteinGrams, carbsGrams, fatGrams, fiberGrams }
  ingredients: jsonb("ingredients").notNull(), // [{ name, amount }]
  instructions: jsonb("instructions").notNull(), // [{ step, text, timerMinutes? }]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Logged Meals table
export const loggedMeals = pgTable("logged_meals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink"
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  time: text("time").notNull(),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// 5. Activity & Daily Stats table
export const activityStats = pgTable("activity_stats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // "YYYY-MM-DD"
  steps: integer("steps").default(0).notNull(),
  stepGoal: integer("step_goal").default(6000).notNull(),
  exerciseCalories: integer("exercise_calories").default(0).notNull(),
  exerciseDurationMinutes: integer("exercise_duration_minutes").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull().default("free"), // "free" | "premium"
  status: text("status").notNull().default("free"), // "free" | "pending_verification" | "premium_active" | "canceled" | "expired" | "payment_failed" | "revoked"
  planId: text("plan_id"), // "monthly" | "annual" | "lifetime"
  billingProvider: text("billing_provider").notNull().default("mock_sandbox"), // "stripe" | "apple_app_store" | "google_play" | "mock_sandbox" | "manual"
  externalSubscriptionId: text("external_subscription_id"),
  externalCustomerId: text("external_customer_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  canceledAt: timestamp("canceled_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7. Payment Events & Audit Log table (strictly idempotent)
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // Provider event ID used for idempotency
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  userId: text("user_id").references(() => users.id),
  subscriptionId: text("subscription_id"),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

