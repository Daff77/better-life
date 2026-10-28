import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { Entitlement } from "../types/subscription.js";
import { inMemoryStore } from "../services/store.js";
import { MealPlannerEngine } from "../services/mealPlannerEngine.js";
import {
  MealPlanPreferencesInputSchema,
  SaveMealPlanInputSchema,
  SubstituteMealInputSchema,
  ReplaceMealInputSchema,
} from "../schemas/validation.js";
import { MealPlanRecord, MealPlanPreferences } from "../types/mealPlan.js";

export const mealPlansRouter = Router();

// ==========================================
// 1. PUBLIC / FREE PREVIEW ENDPOINT
// ==========================================
// Allows Free users to inspect a sample 1-day balanced plan & understand the feature value
mealPlansRouter.get("/preview", (req: Request, res: Response) => {
  const allRecipes = Array.from(inMemoryStore.recipes.values());

  const samplePreferences: MealPlanPreferences = {
    dailyCalorieTarget: 2000,
    dietaryRestrictions: [],
    allergies: [],
    foodPreferences: ["Balanced", "High Protein"],
    dailyBudgetIdr: 50000,
    preferredMealSlots: ["Breakfast", "Lunch", "Dinner", "Snack"],
    availableIngredients: [],
    mealsPerDay: 4,
  };

  const samplePlan = MealPlannerEngine.generatePlan("sample-user", samplePreferences, allRecipes);

  return res.json({
    feature: "Better Life Premium Personalized Meal Planner",
    description:
      "Clinical algorithmic meal planning tailored to your exact caloric targets, macro split, food allergies, dietary restrictions, and regional grocery budget.",
    entitlementRequired: Entitlement.PERSONALIZED_MEAL_PLAN,
    sampleDay: samplePlan.days[0],
    sampleSummary: {
      dailyCalories: samplePlan.days[0].totals.calories,
      dailyCostIdr: samplePlan.days[0].totals.estimatedCostIdr,
      macroBalance: samplePlan.summary.macroBalance,
    },
    capabilities: [
      "Custom 7-day multi-meal schedules with zero consecutive day fatigue",
      "Automatic allergen exclusion (Dairy, Gluten, Eggs, Soy, Nuts, Seafood)",
      "Dietary compliance filters (Vegetarian, Vegan, Pescatarian, Keto, Halal)",
      "Regional Indonesian grocery budget optimization & estimated cost tracking",
      "One-tap recipe substitutions with live calorie and cost deltas",
      "Consolidated pantry shopping list with interactive checkboxes",
    ],
  });
});

// All following endpoints require user authentication
mealPlansRouter.use(authMiddleware);

// ==========================================
// 1.5. GET /api/meal-plans/personalized (BACKWARD COMPATIBLE & GATED)
// ==========================================
mealPlansRouter.get(
  "/personalized",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const existing = inMemoryStore.mealPlans.get(userId);
    if (existing) {
      return res.json(existing);
    }
    const allRecipes = Array.from(inMemoryStore.recipes.values());
    const profile = inMemoryStore.profiles.get(userId);
    const targetCalories = profile?.targetCalories || 2000;
    const plan = MealPlannerEngine.generatePlan(
      userId,
      {
        dailyCalorieTarget: targetCalories,
        dietaryRestrictions: profile?.dietType === "Vegetarian" ? ["Vegetarian"] : [],
        allergies: profile?.allergies || [],
        foodPreferences: [],
        dailyBudgetIdr: 50000,
        preferredMealSlots: ["Breakfast", "Lunch", "Dinner", "Snack"],
        availableIngredients: [],
        mealsPerDay: 4,
      },
      allRecipes
    );
    inMemoryStore.mealPlans.set(userId, plan);
    return res.json({
      ...plan,
      schedule: plan.days,
      planName: plan.title,
      macroSplit: plan.summary.macroBalance,
    });
  }
);

// ==========================================
// 2. GENERATE PERSONALIZED MEAL PLAN (GATED)
// ==========================================
mealPlansRouter.post(
  "/generate",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const parseResult = MealPlanPreferencesInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid meal planning preferences",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const preferences = parseResult.data as MealPlanPreferences;
    const allRecipes = Array.from(inMemoryStore.recipes.values());

    const plan = MealPlannerEngine.generatePlan(userId, preferences, allRecipes);

    // Save as active plan in store
    inMemoryStore.mealPlans.set(userId, plan);

    return res.status(201).json(plan);
  }
);

// ==========================================
// 3. GET SAVED ACTIVE MEAL PLAN (GATED)
// ==========================================
mealPlansRouter.get(
  "/saved",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const plan = inMemoryStore.mealPlans.get(userId);

    if (!plan) {
      return res.status(404).json({
        error: "Not Found",
        message: "No active meal plan found. Generate a personalized plan to get started.",
      });
    }

    // Strict IDOR isolation verification
    if (plan.userId !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You cannot access another user's meal plan.",
      });
    }

    return res.json(plan);
  }
);

// ==========================================
// 4. SAVE / UPDATE ACTIVE MEAL PLAN (GATED)
// ==========================================
mealPlansRouter.post(
  "/save",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const parseResult = SaveMealPlanInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid meal plan payload for saving",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const body = parseResult.data;

    const record: MealPlanRecord = {
      id: req.body.id || `plan-${Date.now()}`,
      userId,
      title: body.title,
      status: "active",
      preferences: body.preferences as MealPlanPreferences,
      days: body.days,
      summary: body.summary,
      shoppingList: body.shoppingList,
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryStore.mealPlans.set(userId, record);

    return res.json({
      success: true,
      message: "Meal plan saved successfully",
      plan: record,
    });
  }
);

// ==========================================
// 5. GET MEAL SUBSTITUTIONS (GATED)
// ==========================================
mealPlansRouter.post(
  "/substitute",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const parseResult = SubstituteMealInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid substitution query parameters",
        details: parseResult.error.flatten(),
      });
    }

    const { slot, currentRecipeId, preferences } = parseResult.data;
    const allRecipes = Array.from(inMemoryStore.recipes.values());

    const userPrefs: MealPlanPreferences = (preferences as MealPlanPreferences) || {
      dailyCalorieTarget: 2000,
      dietaryRestrictions: [],
      allergies: [],
      foodPreferences: [],
      dailyBudgetIdr: 50000,
      preferredMealSlots: ["Breakfast", "Lunch", "Dinner", "Snack"],
      availableIngredients: [],
      mealsPerDay: 4,
    };

    const substitutions = MealPlannerEngine.getSubstitutions(
      slot,
      currentRecipeId,
      userPrefs,
      allRecipes
    );

    return res.json({
      slot,
      currentRecipeId,
      count: substitutions.length,
      substitutions,
    });
  }
);

// ==========================================
// 6. REPLACE INDIVIDUAL MEAL (GATED)
// ==========================================
mealPlansRouter.post(
  "/replace-meal",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const parseResult = ReplaceMealInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid replace meal parameters",
        details: parseResult.error.flatten(),
      });
    }

    const { dayIndex, slot, newRecipeId, currentPlan } = parseResult.data;
    const allRecipes = Array.from(inMemoryStore.recipes.values());

    try {
      const updatedPlan = MealPlannerEngine.replaceMeal(
        currentPlan as MealPlanRecord,
        dayIndex,
        slot,
        newRecipeId,
        allRecipes
      );

      // Persist in store for user
      const userId = req.user!.userId;
      inMemoryStore.mealPlans.set(userId, updatedPlan);

      return res.json(updatedPlan);
    } catch (err: any) {
      return res.status(400).json({
        error: "Bad Request",
        message: err.message || "Failed to replace meal",
      });
    }
  }
);

// ==========================================
// 7. BUDGET-AWARE MEAL RECOMMENDATIONS (GATED)
// ==========================================
mealPlansRouter.get(
  "/budget-recommendations",
  requireEntitlement(Entitlement.BUDGET_RECOMMENDATIONS),
  (_req: Request, res: Response) => {
    const allRecipes = Array.from(inMemoryStore.recipes.values());

    const budgetMeals = allRecipes
      .filter((r) => (r.estimatedCostIdr || 0) > 0)
      .map((r) => ({
        ...r,
        costPer100CaloriesIdr: Math.round(((r.estimatedCostIdr || 0) / r.calories) * 100),
      }))
      .sort((a, b) => a.costPer100CaloriesIdr - b.costPer100CaloriesIdr);

    return res.json({
      summary: "Curated cost-effective recipes maximizing nutritional density per rupiah spent.",
      recommendations: budgetMeals,
    });
  }
);
