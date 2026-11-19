import { z } from "zod";

export const RegisterInputSchema = z.object({
  name: z.string().trim().min(2, "Name must have at least 2 characters").max(120, "Name is too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email is too long"),
  phone: z
    .union([
      z.literal(""),
      z.string().trim().min(6, "Phone number is too short").max(30, "Phone number is too long"),
    ])
    .optional()
    .default(""),
  password: z
    .string()
    .min(6, "Password must have at least 6 characters")
    .max(72, "Password must not exceed 72 characters"),
});

export const LoginInputSchema = z
  .object({
    email: z.string().min(2).max(254).optional(),
    identifier: z.string().min(2).max(254).optional(),
    password: z.string().min(6, "Password must have at least 6 characters").max(128),
  })
  .refine((val) => Boolean(val.email?.trim() || val.identifier?.trim()), {
    message: "Email or username is required",
    path: ["email"],
  });

export const CheckEmailInputSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
});

export const GoogleAuthInputSchema = z.object({
  idToken: z.string().min(1).max(16000),
});

export const UpdateProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.union([z.literal(""), z.string().trim().min(6).max(30)]).optional(),
});

export const PersonalizationInputSchema = z.object({
  goal: z.enum(["Eat balanced", "Lose weight", "Gain muscle"]),
  weight: z.number().min(30).max(300),
  targetWeight: z.number().min(30).max(300).optional(),
  height: z.number().min(100).max(250),
  gender: z.enum(["Female", "Male"]),
  birthDate: z
    .object({
      day: z.number().min(1).max(31),
      month: z.string().max(24),
      year: z.number().min(1920).max(new Date().getFullYear()),
    })
    .optional(),
  age: z.number().int().min(14).max(100).optional(),
  cookingSkill: z.enum(["Low", "Middle", "High"]).default("Middle"),
  dietType: z.string().max(60).default("Omnivore"),
  allergies: z.array(z.string().max(60)).max(30).default([]),
  targetCalories: z.number().positive().max(15000),
  onboardingCompleted: z.boolean().optional(),
});

export const LogMealInputSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  name: z.string().trim().min(1, "Meal name cannot be empty").max(200, "Meal name is too long"),
  calories: z.number().nonnegative().max(50000),
  proteinGrams: z.number().nonnegative().max(5000).optional().default(0),
  carbsGrams: z.number().nonnegative().max(5000).optional().default(0),
  fatGrams: z.number().nonnegative().max(5000).optional().default(0),
  fiberGrams: z.number().nonnegative().max(5000).optional().default(0),
  estimatedCostIdr: z.number().nonnegative().max(100000000).optional().default(0),
  quantity: z.number().positive().max(100).optional().default(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().max(40).optional(),
  loggedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const UpdateMealInputSchema = z.object({
  type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]).optional(),
  name: z.string().trim().min(1, "Meal name cannot be empty").max(200, "Meal name is too long").optional(),
  calories: z.number().nonnegative().max(50000).optional(),
  proteinGrams: z.number().nonnegative().max(5000).optional(),
  carbsGrams: z.number().nonnegative().max(5000).optional(),
  fatGrams: z.number().nonnegative().max(5000).optional(),
  fiberGrams: z.number().nonnegative().max(5000).optional(),
  estimatedCostIdr: z.number().nonnegative().max(100000000).optional(),
  quantity: z.number().positive().max(100).optional(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  updatedAt: z.string().datetime().optional(),
});

export const AnalyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "custom"]).default("7d"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AddStepsInputSchema = z.object({
  steps: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const SyncActivityInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  steps: z.number().int().min(0).max(200000).optional(),
  sensorSteps: z.number().int().min(0).max(200000).optional(),
  manualSteps: z.number().int().min(0).max(200000).optional(),
  stepGoal: z.number().int().min(100).max(200000).optional(),
  waterGlasses: z.number().int().min(0).max(32).optional(),
  waterGoal: z.number().int().min(1).max(32).optional(),
});

export const AddWaterInputSchema = z.object({
  glasses: z.number().int().min(-16).max(16).default(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const ReminderSlotSchema = z.object({
  id: z.enum(["breakfast", "lunch", "snack", "dinner"]),
  label: z.string().min(1).max(80),
  subtitle: z.string().max(160),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  enabled: z.boolean(),
});

export const ReminderSettingsInputSchema = z.object({
  masterEnabled: z.boolean(),
  waterReminderEnabled: z.boolean(),
  morningWaterEnabled: z.boolean(),
  morningWaterTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  waterIntervalHours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  waterStartHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  waterEndHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  mealSlots: z.array(ReminderSlotSchema).min(1).max(8),
  eveningJournalEnabled: z.boolean(),
  eveningJournalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weeklyWeightEnabled: z.boolean(),
  weeklyWeightTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  updatedAt: z.string().optional(),
});

export const FavoriteFoodInputSchema = z.object({
  itemId: z.string().min(1).max(200),
  title: z.string().min(1).max(160),
  category: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative().optional().default(0),
  carbsGrams: z.number().nonnegative().optional().default(0),
  fatGrams: z.number().nonnegative().optional().default(0),
  fiberGrams: z.number().nonnegative().optional().default(0),
  estimatedCostIdr: z.number().nonnegative().optional().default(0),
  imageUrl: z.string().max(2000).optional().nullable(),
});

export const AccountBackupPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  account: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  personalization: PersonalizationInputSchema.optional().nullable(),
  reminders: ReminderSettingsInputSchema.optional().nullable(),
  favorites: z.array(FavoriteFoodInputSchema).optional().default([]),
  meals: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
        name: z.string().min(1).max(200),
        calories: z.number().nonnegative(),
        proteinGrams: z.number().nonnegative().default(0),
        carbsGrams: z.number().nonnegative().default(0),
        fatGrams: z.number().nonnegative().default(0),
        fiberGrams: z.number().nonnegative().default(0),
        estimatedCostIdr: z.number().nonnegative().default(0),
        quantity: z.number().positive().default(1),
        dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().optional(),
        loggedAt: z.string().optional(),
        updatedAt: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  activities: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        steps: z.number().int().min(0).max(200000).default(0),
        sensorSteps: z.number().int().min(0).max(200000).optional(),
        manualSteps: z.number().int().min(0).max(200000).optional(),
        stepGoal: z.number().int().min(100).max(200000).default(6000),
        waterGlasses: z.number().int().min(0).max(32).default(0),
        waterGoal: z.number().int().min(1).max(32).default(8),
      })
    )
    .optional()
    .default([]),
});

export const CheckoutInputSchema = z.object({
  planId: z.enum(["monthly", "annual", "lifetime"]),
  provider: z
    .enum(["stripe", "apple_app_store", "google_play", "mock_sandbox"])
    .default("stripe"),
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
    .default("stripe"),
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

const CurrentPlanObjectSchema = z
  .object({
    days: z.array(z.any()),
    preferences: z.any().optional(),
  })
  .passthrough();

export const ReplaceMealInputSchema = z.object({
  dayIndex: z.number().min(0).max(6),
  slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  newRecipeId: z.string().min(1).max(200),
  currentPlan: CurrentPlanObjectSchema,
});

export const RegenerateDayInputSchema = z.object({
  dayIndex: z.number().min(0).max(6),
  preferences: MealPlanPreferencesInputSchema.optional(),
  currentPlan: CurrentPlanObjectSchema,
});
