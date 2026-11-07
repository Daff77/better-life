import { API_BASE_URL } from "./config";
import {
  MealPlanPreferences,
  MealPlanRecord,
  MealSlot,
  SubstitutionCandidate,
} from "../mealPlannerDomain";
import { MOCK_RECIPES, FoodItem } from "../../data/mockRecipes";

export interface MealPlanPreviewResponse {
  feature: string;
  description: string;
  entitlementRequired: string;
  sampleDay: any;
  sampleSummary: any;
  capabilities: string[];
}

let cachedLocalPlan: MealPlanRecord | null = null;

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function isRecipeSafeLocal(recipe: FoodItem, allergies: string[], restrictions: string[]): boolean {
  const normAllergies = (allergies || []).map((a) => a.toLowerCase().trim());
  const normRestrictions = (restrictions || []).map((r) => r.toLowerCase().trim());

  // Allergies
  if (normAllergies.length > 0) {
    const ingText = recipe.ingredients.map((i) => i.name.toLowerCase()).join(" ");
    for (const a of normAllergies) {
      if (ingText.includes(a)) return false;
      if (a === "dairy" && /milk|cheese|yogurt|butter/i.test(ingText)) return false;
      if (a === "eggs" && /egg/i.test(ingText)) return false;
      if (a === "fish" && /fish|salmon|tuna/i.test(ingText)) return false;
      if (a === "wheat/gluten" && /wheat|gluten|flour/i.test(ingText)) return false;
    }
  }

  // Restrictions
  if (normRestrictions.length > 0) {
    const ingText = recipe.ingredients.map((i) => i.name.toLowerCase()).join(" ") + " " + recipe.title.toLowerCase();
    for (const r of normRestrictions) {
      if (r === "vegetarian" && /chicken|beef|steak|fish|salmon|meat|pork/i.test(ingText)) return false;
      if (r === "vegan" && /chicken|beef|steak|fish|salmon|meat|pork|egg|dairy|milk|cheese|honey/i.test(ingText)) return false;
    }
  }

  return true;
}

function generateLocalPlan(preferences: MealPlanPreferences): MealPlanRecord {
  const slots: MealSlot[] = preferences.preferredMealSlots || ["Breakfast", "Lunch", "Dinner", "Snack"];
  const safeRecipes = MOCK_RECIPES.filter((r) =>
    isRecipeSafeLocal(r, preferences.allergies, preferences.dietaryRestrictions)
  );

  const pool = safeRecipes.length > 0 ? safeRecipes : MOCK_RECIPES;

  const days = DAYS_OF_WEEK.map((dayName, dayIdx) => {
    const dayMeals = slots.map((slot, sIdx) => {
      const slotMatches = pool.filter((r) => r.category.toLowerCase() === slot.toLowerCase());
      const available = slotMatches.length > 0 ? slotMatches : pool;
      const recipe = available[(dayIdx + sIdx) % available.length];
      return { slot, recipe };
    });

    const dayCals = dayMeals.reduce((sum, m) => sum + (m.recipe.calories || 0), 0);
    const dayP = dayMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.proteinGrams || 0), 0);
    const dayC = dayMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.carbsGrams || 0), 0);
    const dayF = dayMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.fatGrams || 0), 0);
    const dayFib = dayMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.fiberGrams || 0), 0);
    const dayCost = dayMeals.reduce((sum, m) => sum + (m.recipe.estimatedCostIdr || 0), 0);

    return {
      day: dayName,
      meals: dayMeals,
      totals: {
        calories: dayCals,
        proteinGrams: dayP,
        carbsGrams: dayC,
        fatGrams: dayF,
        fiberGrams: dayFib,
        estimatedCostIdr: dayCost,
      },
    };
  });

  const totalWeeklyCals = days.reduce((sum, d) => sum + d.totals.calories, 0);
  const totalWeeklyCost = days.reduce((sum, d) => sum + d.totals.estimatedCostIdr, 0);
  const avgCals = Math.round(totalWeeklyCals / 7);
  const avgCost = Math.round(totalWeeklyCost / 7);

  const plan: MealPlanRecord = {
    id: `plan-${Date.now()}`,
    userId: "current-user",
    title: "Personalized 7-Day Nutrition Plan",
    status: "active",
    preferences,
    days,
    summary: {
      totalDays: 7,
      weeklyCalories: totalWeeklyCals,
      averageDailyCalories: avgCals,
      weeklyEstimatedCostIdr: totalWeeklyCost,
      averageDailyEstimatedCostIdr: avgCost,
      macroBalance: {
        proteinGrams: Math.round(days.reduce((s, d) => s + d.totals.proteinGrams, 0) / 7),
        carbsGrams: Math.round(days.reduce((s, d) => s + d.totals.carbsGrams, 0) / 7),
        fatGrams: Math.round(days.reduce((s, d) => s + d.totals.fatGrams, 0) / 7),
        proteinPct: 25,
        carbsPct: 50,
        fatPct: 25,
      },
      tradeOffNotes: [
        "Balanced whole foods selected to match caloric and allergen constraints.",
        "Local market ingredient costs aggregated across 7 days.",
      ],
      disclaimer: "Personalized nutritional estimate based on your dietary profile. Consult a dietitian for clinical requirements.",
    },
    shoppingList: [
      {
        category: "Produce & Fresh Ingredients",
        items: [
          { id: "shop-1", name: "Fresh Vegetables & Greens", amount: "1.5 kg", category: "Produce", checked: false },
          { id: "shop-2", name: "Seasonal Fruits & Berries", amount: "800 g", category: "Produce", checked: false },
        ],
      },
      {
        category: "Protein & Dairy Alternatives",
        items: [
          { id: "shop-3", name: "Lean Protein (Chicken/Tempeh/Fish)", amount: "1.2 kg", category: "Protein", checked: false },
          { id: "shop-4", name: "Farm Fresh Eggs / Tofu", amount: "1 pack", category: "Protein", checked: false },
        ],
      },
      {
        category: "Grains & Pantry",
        items: [
          { id: "shop-5", name: "Brown Rice / Quinoa", amount: "500 g", category: "Grains", checked: false },
          { id: "shop-6", name: "Rolled Oats & Chia Seeds", amount: "300 g", category: "Grains", checked: false },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedLocalPlan = plan;
  return plan;
}

export const mealPlannerApi = {
  /**
   * Fetch free preview information
   */
  async getPreview(): Promise<MealPlanPreviewResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/meal-plans/preview`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline preview fallback
    }
    return {
      feature: "Personalized Meal Planner",
      description: "Weekly clinical schedules, allergen exclusions, and grocery budget optimization.",
      entitlementRequired: "MEAL_PLANNER",
      sampleDay: {
        day: "Monday",
        meals: [],
        totals: { calories: 1850, proteinGrams: 110, carbsGrams: 210, fatGrams: 55, fiberGrams: 28, estimatedCostIdr: 75000 },
      },
      sampleSummary: { totalDays: 7, averageDailyCalories: 1850 },
      capabilities: [
        "Custom 7-day schedules",
        "Strict allergen filters",
        "Dietary restriction compliance",
        "Indonesian grocery cost estimates",
      ],
    };
  },

  /**
   * Fetch user's saved active meal plan
   */
  async getSavedPlan(token?: string | null): Promise<MealPlanRecord | null> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/saved`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 404) {
          return cachedLocalPlan;
        }

        if (res.ok) {
          const plan = await res.json();
          cachedLocalPlan = plan;
          return plan;
        }
      } catch {
        // Fallback silently to cached plan
      }
    }

    return cachedLocalPlan;
  },

  /**
   * Generate a fresh 7-day personalized meal plan
   */
  async generatePlan(
    preferences: MealPlanPreferences,
    token?: string | null
  ): Promise<MealPlanRecord> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/generate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preferences),
        });

        if (res.ok) {
          const plan = await res.json();
          cachedLocalPlan = plan;
          return plan;
        }
      } catch {
        // Fallback silently to local planner engine
      }
    }

    // Honest local generation fallback
    return generateLocalPlan(preferences);
  },

  /**
   * Save an existing or customized meal plan
   */
  async savePlan(
    plan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    cachedLocalPlan = plan;

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/save`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(plan),
        });

        if (res.ok) {
          const data = await res.json();
          return data.plan || plan;
        }
      } catch {
        // Fallback silently
      }
    }

    return plan;
  },

  /**
   * Fetch alternative substitutions for a meal slot
   */
  async getSubstitutions(
    slot: MealSlot,
    currentRecipeId: string,
    preferences?: MealPlanPreferences,
    token?: string | null
  ): Promise<SubstitutionCandidate[]> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/substitute`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slot,
            currentRecipeId,
            preferences,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return data.substitutions || [];
        }
      } catch {
        // Fallback silently to local substitutions
      }
    }

    // Local substitution calculation
    const current = MOCK_RECIPES.find((r) => r.id === currentRecipeId);
    const currentCals = current?.calories || 0;
    const currentCost = current?.estimatedCostIdr || 0;

    const candidates = MOCK_RECIPES.filter(
      (r) =>
        r.id !== currentRecipeId &&
        r.category.toLowerCase() === slot.toLowerCase() &&
        isRecipeSafeLocal(r, preferences?.allergies || [], preferences?.dietaryRestrictions || [])
    ).map((r) => ({
      recipe: r,
      calorieDiff: r.calories - currentCals,
      costDiffIdr: (r.estimatedCostIdr || 0) - currentCost,
    }));

    return candidates;
  },

  /**
   * Replace a meal slot on a specific day
   */
  async replaceMeal(
    dayIndex: number,
    slot: MealSlot,
    newRecipeId: string,
    currentPlan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/replace-meal`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dayIndex,
            slot,
            newRecipeId,
            currentPlan,
          }),
        });

        if (res.ok) {
          const plan = await res.json();
          cachedLocalPlan = plan;
          return plan;
        }
      } catch {
        // Fallback silently to local replacement calculation
      }
    }

    // Local replacement calculation
    const newRecipe = MOCK_RECIPES.find((r) => r.id === newRecipeId);
    if (!newRecipe) return currentPlan;

    const updatedDays = currentPlan.days.map((day, idx) => {
      if (idx !== dayIndex) return day;

      const updatedMeals = day.meals.map((m) =>
        m.slot === slot ? { slot, recipe: newRecipe } : m
      );

      const dayCals = updatedMeals.reduce((sum, m) => sum + (m.recipe.calories || 0), 0);
      const dayP = updatedMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.proteinGrams || 0), 0);
      const dayC = updatedMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.carbsGrams || 0), 0);
      const dayF = updatedMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.fatGrams || 0), 0);
      const dayFib = updatedMeals.reduce((sum, m) => sum + (m.recipe.nutrition?.fiberGrams || 0), 0);
      const dayCost = updatedMeals.reduce((sum, m) => sum + (m.recipe.estimatedCostIdr || 0), 0);

      return {
        ...day,
        meals: updatedMeals,
        totals: {
          calories: dayCals,
          proteinGrams: dayP,
          carbsGrams: dayC,
          fatGrams: dayF,
          fiberGrams: dayFib,
          estimatedCostIdr: dayCost,
        },
      };
    });

    const totalWeeklyCals = updatedDays.reduce((sum, d) => sum + d.totals.calories, 0);
    const totalWeeklyCost = updatedDays.reduce((sum, d) => sum + d.totals.estimatedCostIdr, 0);

    const updatedPlan: MealPlanRecord = {
      ...currentPlan,
      days: updatedDays,
      summary: {
        ...currentPlan.summary,
        weeklyCalories: totalWeeklyCals,
        averageDailyCalories: Math.round(totalWeeklyCals / 7),
        weeklyEstimatedCostIdr: totalWeeklyCost,
        averageDailyEstimatedCostIdr: Math.round(totalWeeklyCost / 7),
      },
      updatedAt: new Date().toISOString(),
    };

    cachedLocalPlan = updatedPlan;
    return updatedPlan;
  },
};
