import { z } from "zod";

// ==========================================
// CLIENT STATE SCHEMAS
// ==========================================

export const AuthUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must have at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  isAuthenticated: z.boolean().default(false),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const UserPreferencesSchema = z.object({
  notificationsEnabled: z.boolean().default(true),
  theme: z.enum(["light", "dark", "system"]).default("light"),
  unitSystem: z.enum(["metric", "imperial"]).default("metric"),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const MembershipTierSchema = z.enum(["free", "premium"]);
export type MembershipTier = z.infer<typeof MembershipTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  "free",
  "pending_verification",
  "premium_active",
  "canceled",
  "expired",
  "payment_failed",
  "revoked",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const UIStateSchema = z.object({
  isSettingsModalOpen: z.boolean().default(false),
  activeTab: z.string().default("home"),
  isGlobalLoading: z.boolean().default(false),
});

export type UIState = z.infer<typeof UIStateSchema>;

// ==========================================
// SERVER STATE SCHEMAS
// ==========================================

export const PersonalizationSchema = z.object({
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
  bmr: z.number().optional(),
  tdee: z.number().optional(),
  targetProteinGrams: z.number().optional(),
  targetCarbGrams: z.number().optional(),
  targetFatGrams: z.number().optional(),
});

export type PersonalizationMetrics = z.infer<typeof PersonalizationSchema>;

export const MealCategorySchema = z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]);
export type MealCategory = z.infer<typeof MealCategorySchema>;

export const JournalCategorySchema = z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]);
export type JournalCategory = z.infer<typeof JournalCategorySchema>;

export const JournalEntrySchema = z.object({
  id: z.string(),
  mealId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  category: JournalCategorySchema,
  calories: z.number().nonnegative(),
  baseCalories: z.number().nonnegative().optional(),
  quantity: z.number().positive().default(1),
  proteinGrams: z.number().nonnegative().default(0),
  carbsGrams: z.number().nonnegative().default(0),
  fatGrams: z.number().nonnegative().default(0),
  fiberGrams: z.number().nonnegative().default(0),
  loggedAt: z.string(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const DailyJournalSchema = z.object({
  date: z.string(),
  targetCalories: z.number().nonnegative(),
  entries: z.array(JournalEntrySchema),
});
export type DailyJournal = z.infer<typeof DailyJournalSchema>;

export const LoggedMealSchema = z.object({
  id: z.string(),
  type: MealCategorySchema,
  name: z.string().min(1, "Meal name cannot be empty"),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative().default(0),
  carbsGrams: z.number().nonnegative().default(0),
  fatGrams: z.number().nonnegative().default(0),
  fiberGrams: z.number().nonnegative().default(0),
  quantity: z.number().positive().default(1),
  time: z.string(),
});

export type LoggedMeal = z.infer<typeof LoggedMealSchema>;

export const ActivityStatsSchema = z.object({
  steps: z.number().nonnegative(),
  stepGoal: z.number().positive(),
  exerciseCalories: z.number().nonnegative(),
  exerciseDurationMinutes: z.number().nonnegative(),
});

export type ActivityStats = z.infer<typeof ActivityStatsSchema>;

export const FoodItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: MealCategorySchema,
  calories: z.number().nonnegative(),
  prepTimeMinutes: z.number().nonnegative(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  description: z.string(),
  svgIcon: z.enum(["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks"]).optional().default("Breakfast"),
  imageUrl: z.string().optional(),
  estimatedCostIdr: z.number().optional(),
  isPremium: z.boolean().optional(),
  nutrition: z.object({
    proteinGrams: z.number().nonnegative(),
    carbsGrams: z.number().nonnegative(),
    fatGrams: z.number().nonnegative(),
    fiberGrams: z.number().nonnegative(),
  }),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
    })
  ),
  instructions: z.array(
    z.object({
      step: z.number().int().positive(),
      text: z.string(),
      timerMinutes: z.number().optional(),
    })
  ),
  dietaryTags: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;

export const CalorieDataSchema = z.object({
  consumedCalories: z.number().nonnegative(),
  targetCalories: z.number().positive(),
  remainingCalories: z.number(),
  burnedCalories: z.number().nonnegative(),
});

export type CalorieData = z.infer<typeof CalorieDataSchema>;
