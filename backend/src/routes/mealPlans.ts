import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { Entitlement } from "../types/subscription.js";
import { inMemoryStore } from "../services/store.js";

export const mealPlansRouter = Router();

mealPlansRouter.use(authMiddleware);

// 1. GET /api/meal-plans/personalized — Personalized weekly meal schedule
mealPlansRouter.get(
  "/personalized",
  requireEntitlement(Entitlement.PERSONALIZED_MEAL_PLAN),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const profile = inMemoryStore.profiles.get(userId);
    const targetCalories = profile?.targetCalories || 2000;
    const goal = profile?.goal || "Eat balanced";

    return res.json({
      planName: `Personalized ${goal} Schedule`,
      targetCalories,
      macroSplit: {
        proteinGrams: Math.round((targetCalories * 0.28) / 4),
        carbsGrams: Math.round((targetCalories * 0.45) / 4),
        fatGrams: Math.round((targetCalories * 0.27) / 9),
      },
      schedule: [
        {
          day: "Monday",
          breakfast: "Greek-Yogurt Berry Parfait (320 kcal)",
          lunch: "Quinoa Bowl with Roasted Veggies (450 kcal)",
          dinner: "Pan-Seared Atlantic Salmon & Truffle Quinoa (540 kcal)",
          snacks: "Omega-3 Eggs & Steamed Edamame (210 kcal)",
        },
        {
          day: "Tuesday",
          breakfast: "Avocado Sourdough Toast & Poached Egg (360 kcal)",
          lunch: "Grass-Fed Beef Tenderloin & Roasted Kabocha (580 kcal)",
          dinner: "Steamed Sea Bass with Bok Choy (420 kcal)",
          snacks: "Infused Lemon Mint Sparkler (45 kcal)",
        },
      ],
    });
  }
);

// 2. GET /api/meal-plans/budget-recommendations — Budget-aware meal recommendations
mealPlansRouter.get(
  "/budget-recommendations",
  requireEntitlement(Entitlement.BUDGET_RECOMMENDATIONS),
  (_req: Request, res: Response) => {
    const allRecipes = Array.from(inMemoryStore.recipes.values());

    // Filter recipes that have estimated costs and sort by cost efficiency (calories per IDR)
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
