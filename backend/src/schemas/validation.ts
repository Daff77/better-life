import { z } from "zod";

export const RegisterInputSchema = z.object({
  name: z.string().min(2, "Name must have at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(8, "Phone number is too short"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

export const GoogleAuthInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  photoUrl: z.string().optional(),
  idToken: z.string().optional(),
});

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
});

export const PersonalizationInputSchema = z.object({
  goal: z.enum(["Eat balanced", "Lose weight", "Gain muscle"]),
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  gender: z.enum(["Female", "Male"]),
  birthDate: z.object({
    day: z.number().min(1).max(31),
    month: z.string(),
    year: z.number().min(1920).max(2025),
  }),
  cookingSkill: z.enum(["Low", "Middle", "High"]),
  dietType: z.string(),
  allergies: z.array(z.string()),
  targetCalories: z.number().positive(),
});

export const LogMealInputSchema = z.object({
  type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  name: z.string().min(1, "Meal name cannot be empty"),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative().optional().default(0),
  carbsGrams: z.number().nonnegative().optional().default(0),
  fatGrams: z.number().nonnegative().optional().default(0),
  fiberGrams: z.number().nonnegative().optional().default(0),
  estimatedCostIdr: z.number().nonnegative().optional().default(0),
  quantity: z.number().positive().optional().default(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  loggedAt: z.string().datetime().optional(),
});

export const AnalyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "custom"]).default("7d"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AddStepsInputSchema = z.object({
  steps: z.number().positive(),
});

export const CheckoutInputSchema = z.object({
  planId: z.enum(["monthly", "annual", "lifetime"]),
  provider: z
    .enum(["stripe", "apple_app_store", "google_play", "mock_sandbox"])
    .default("mock_sandbox"),
  cancelUrl: z.string().url().optional(),
  successUrl: z.string().url().optional(),
});

export const VerifyTransactionInputSchema = z.object({
  provider: z.enum(["stripe", "apple_app_store", "google_play", "mock_sandbox"]),
  transactionId: z.string().min(1, "Transaction ID is required"),
  receiptData: z.string().optional(),
  planId: z.enum(["monthly", "annual", "lifetime"]).optional(),
});

export const CancelSubscriptionInputSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const RestoreSubscriptionInputSchema = z.object({
  provider: z
    .enum(["apple_app_store", "google_play", "stripe", "mock_sandbox"])
    .default("mock_sandbox"),
  receiptData: z.string().optional(),
});

export const WebhookEventInputSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  eventType: z.enum([
    "subscription.created",
    "subscription.renewed",
    "subscription.canceled",
    "subscription.payment_failed",
    "subscription.revoked",
  ]),
  provider: z.enum(["stripe", "apple_app_store", "google_play", "mock_sandbox"]),
  userId: z.string().optional(),
  subscriptionId: z.string().optional(),
  planId: z.enum(["monthly", "annual", "lifetime"]).optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  payload: z.record(z.any()),
});

export const MealPlanPreferencesInputSchema = z.object({
  dailyCalorieTarget: z.number().min(800).max(6000),
  macroTargets: z
    .object({
      proteinGrams: z.number().min(0),
      carbsGrams: z.number().min(0),
      fatGrams: z.number().min(0),
    })
    .optional(),
  dietaryRestrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  foodPreferences: z.array(z.string()).default([]),
  dailyBudgetIdr: z.number().min(0).default(50000),
  preferredMealSlots: z
    .array(z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]))
    .min(1)
    .default(["Breakfast", "Lunch", "Dinner", "Snack"]),
  availableIngredients: z.array(z.string()).default([]),
  mealsPerDay: z.number().min(1).max(6).default(3),
});

export const SaveMealPlanInputSchema = z.object({
  title: z.string().min(1).max(100),
  preferences: MealPlanPreferencesInputSchema,
  days: z.array(z.any()),
  summary: z.any(),
  shoppingList: z.array(z.any()),
});

export const SubstituteMealInputSchema = z.object({
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  currentRecipeId: z.string().min(1),
  preferences: MealPlanPreferencesInputSchema.optional(),
});

export const ReplaceMealInputSchema = z.object({
  dayIndex: z.number().min(0).max(6),
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  newRecipeId: z.string().min(1),
  currentPlan: z.any(),
});

export const RegenerateDayInputSchema = z.object({
  dayIndex: z.number().min(0).max(6),
  preferences: MealPlanPreferencesInputSchema.optional(),
  currentPlan: z.any(),
});


