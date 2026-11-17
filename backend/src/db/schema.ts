import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

// 1. Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  googleSubject: text("google_subject").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Profiles & Personalization table
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(), // "Eat balanced" | "Lose weight" | "Gain muscle"
  weight: doublePrecision("weight").notNull(),
  targetWeight: doublePrecision("target_weight"),
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
  dietaryTags: jsonb("dietary_tags"), // string[]
  allergens: jsonb("allergens"), // string[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Logged Meals table
export const loggedMeals = pgTable("logged_meals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink"
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  proteinGrams: doublePrecision("protein_grams").default(0).notNull(),
  carbsGrams: doublePrecision("carbs_grams").default(0).notNull(),
  fatGrams: doublePrecision("fat_grams").default(0).notNull(),
  fiberGrams: doublePrecision("fiber_grams").default(0).notNull(),
  estimatedCostIdr: integer("estimated_cost_idr").default(0),
  quantity: doublePrecision("quantity").default(1).notNull(),
  dateKey: text("date_key"), // "YYYY-MM-DD"
  time: text("time").notNull(),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Activity & Daily Stats table
export const activityStats = pgTable("activity_stats", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // "YYYY-MM-DD"
  steps: integer("steps").default(0).notNull(),
  sensorSteps: integer("sensor_steps").default(0).notNull(),
  manualSteps: integer("manual_steps").default(0).notNull(),
  stepGoal: integer("step_goal").default(6000).notNull(),
  waterGlasses: integer("water_glasses").default(0).notNull(),
  waterGoal: integer("water_goal").default(8).notNull(),
  exerciseCalories: integer("exercise_calories").default(0).notNull(),
  exerciseDurationMinutes: integer("exercise_duration_minutes").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  tier: text("tier").notNull().default("free"),
  status: text("status").notNull().default("free"),
  planId: text("plan_id"),
  billingProvider: text("billing_provider").notNull().default("mock_sandbox"),
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
  eventId: text("event_id").notNull().unique(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  subscriptionId: text("subscription_id"),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

// 8. Personalized Meal Plans table
export const mealPlans = pgTable("meal_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"),
  preferences: jsonb("preferences").notNull(),
  days: jsonb("days").notNull(),
  summary: jsonb("summary").notNull(),
  shoppingList: jsonb("shopping_list").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 9. Per-account Reminder Settings table
export const reminderSettings = pgTable("reminder_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. Per-account Favorite Foods table
export const userFavorites = pgTable("user_favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  calories: integer("calories").notNull(),
  proteinGrams: doublePrecision("protein_grams").default(0).notNull(),
  carbsGrams: doublePrecision("carbs_grams").default(0).notNull(),
  fatGrams: doublePrecision("fat_grams").default(0).notNull(),
  fiberGrams: doublePrecision("fiber_grams").default(0).notNull(),
  estimatedCostIdr: integer("estimated_cost_idr").default(0),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
