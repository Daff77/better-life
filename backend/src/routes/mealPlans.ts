import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Entitlement } from "../types/subscription.js";
import {
  recipeRepository,
  mealPlanRepository,
  profileRepository,
} from "../repositories/index.js";
import { MealPlannerEngine } from "../services/mealPlannerEngine.js";
import {
  MealPlanPreferencesInputSchema,
  SaveMealPlanInputSchema,
  SubstituteMealInputSchema,
  ReplaceMealInputSchema,
} from "../schemas/validation.js";
import { MealPlanRecord, MealPlanPreferences } from "../types/mealPlan.js";

export const mealPlansRouter = Router();

// 1. PUBLIC / FREE PREVIEW ENDPOINT
mealPlansRouter.get(
  "/preview",
  asyncHandler(async (_req: Request, res: Response) => {
    const allRecipes = await recipeRepository.findAll();

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

    const samplePlan = MealPlannerEngine.generatePlan(
      "sample-user",
      samplePreferences,
      allRecipes
    );

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
  })
);

mealPlansRouter.use(authMiddleware);

// 1.5. GET /api/meal-plans/personalized
mealPlansRouter.get(
  "/personalized",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const existing = await mealPlanRepository.getActiveByUserId(userId);
    if (existing) {
      return res.json({
        ...existing,
        schedule: existing.days,
        planName: existing.title,
        macroSplit: existing.summary.macroBalance,
      });
    }

    const [allRecipes, profile] = await Promise.all([
      recipeRepository.findAll(),
      profileRepository.findByUserId(userId),
    ]);
    const targetCalories = profile?.targetCalories || 2000;

    try {
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
      const saved = await mealPlanRepository.saveActiveForUser(userId, plan);
      return res.json({
        ...saved,
        schedule: saved.days,
        planName: saved.title,
        macroSplit: saved.summary.macroBalance,
      });
    } catch (err: any) {
      return res.status(422).json({
        error: "Unprocessable Entity",
        code: "NO_SAFE_RECIPES",
        message: err.message || "No safe recipes match your allergy and dietary restrictions.",
      });
    }
  })
);

// 2. GENERATE PERSONALIZED MEAL PLAN (GATED)
mealPlansRouter.post(
  "/generate",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
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
    const allRecipes = await recipeRepository.findAll();

    try {
      const plan = MealPlannerEngine.generatePlan(userId, preferences, allRecipes);
      const saved = await mealPlanRepository.saveActiveForUser(userId, plan);
      return res.status(201).json(saved);
    } catch (err: any) {
      return res.status(422).json({
        error: "Unprocessable Entity",
        code: "NO_SAFE_RECIPES",
        message: err.message || "No safe recipes match your allergy and dietary restrictions.",
      });
    }
  })
);

// 3. GET SAVED ACTIVE MEAL PLAN (GATED)
mealPlansRouter.get(
  "/saved",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const plan = await mealPlanRepository.getActiveByUserId(userId);

    if (!plan) {
      return res.status(404).json({
        error: "Not Found",
        message: "No active meal plan found. Generate a personalized plan to get started.",
      });
    }

    if (plan.userId !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You cannot access another user's meal plan.",
      });
    }

    return res.json(plan);
  })
);

// 4. SAVE / UPDATE ACTIVE MEAL PLAN (GATED)
mealPlansRouter.post(
  "/save",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
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

    const saved = await mealPlanRepository.saveActiveForUser(userId, record);

    return res.json({
      success: true,
      message: "Meal plan saved successfully",
      plan: saved,
    });
  })
);

// 5. GET MEAL SUBSTITUTIONS (GATED)
mealPlansRouter.post(
  "/substitute",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = SubstituteMealInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid substitution query parameters",
        details: parseResult.error.flatten(),
      });
    }

    const { slot, currentRecipeId, preferences } = parseResult.data;
    const allRecipes = await recipeRepository.findAll();

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
  })
);

// 6. REPLACE INDIVIDUAL MEAL (GATED)
mealPlansRouter.post(
  "/replace-meal",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = ReplaceMealInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid replace meal parameters",
        details: parseResult.error.flatten(),
      });
    }

    const { dayIndex, slot, newRecipeId, currentPlan } = parseResult.data;
    const allRecipes = await recipeRepository.findAll();

    try {
      const userId = req.user!.userId;
      const updatedPlan = MealPlannerEngine.replaceMeal(
        { ...(currentPlan as unknown as MealPlanRecord), userId },
        dayIndex,
        slot,
        newRecipeId,
        allRecipes
      );

      const saved = await mealPlanRepository.saveActiveForUser(userId, updatedPlan);
      return res.json(saved);
    } catch (err: any) {
      return res.status(400).json({
        error: "Bad Request",
        message: err.message || "Failed to replace meal",
      });
    }
  })
);

// 7. BUDGET-AWARE MEAL RECOMMENDATIONS (GATED)
mealPlansRouter.get(
  "/budget-recommendations",
  requireEntitlement(Entitlement.BUDGET_RECOMMENDATIONS),
  asyncHandler(async (_req: Request, res: Response) => {
    const allRecipes = await recipeRepository.findAll();

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
  })
);
