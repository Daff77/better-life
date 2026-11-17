import {
  isRecipeEligible,
  explainRecipeSelection,
  inspectIngredientsToVerify,
} from "@better-life/shared";
import { API_BASE_URL } from "./config";
import { accountRevision } from "../accountScope";
import { notifyUnauthorizedSession } from "../authToken";
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
export function resetMealPlanCache() {
  cachedLocalPlan = null;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getSlotCalorieTarget(dailyTarget: number, slot: MealSlot, slots: MealSlot[]): number {
  const weights: Record<MealSlot, number> = {
    Breakfast: 0.25,
    Lunch: 0.35,
    Dinner: 0.3,
    Snack: 0.1,
  };
  const totalWeight = slots.reduce((s, item) => s + (weights[item] || 0.25), 0) || 1;
  return Math.round(dailyTarget * ((weights[slot] || 0.25) / totalWeight));
}

function generateLocalPlan(preferences: MealPlanPreferences): MealPlanRecord {
  const slots: MealSlot[] =
    preferences.preferredMealSlots && preferences.preferredMealSlots.length > 0
      ? preferences.preferredMealSlots
      : ["Breakfast", "Lunch", "Dinner", "Snack"];

  // Single shared source of truth: NEVER relax allergy or dietary restrictions!
  const safeRecipes = MOCK_RECIPES.filter((r) =>
    isRecipeEligible(r, {
      allergies: preferences.allergies,
      dietaryRestrictions: preferences.dietaryRestrictions,
    })
  );

  if (!safeRecipes.length) {
    throw new Error(
      "No recipes match your allergy and dietary restrictions. Filter keamanan tidak dilonggarkan demi melindungi Anda."
    );
  }

  const dailyTarget = preferences.dailyCalorieTarget || 2000;
  const dailyBudget = preferences.dailyBudgetIdr || 50000;

  const days = DAYS_OF_WEEK.map((dayName, dayIdx) => {
    const dayMeals = slots.map((slot, sIdx) => {
      const slotMatches = safeRecipes.filter(
        (r) => r.category.toLowerCase() === slot.toLowerCase()
      );
      const available = slotMatches.length > 0 ? slotMatches : safeRecipes;
      const recipe = available[(dayIdx + sIdx) % available.length];
      const slotTarget = getSlotCalorieTarget(dailyTarget, slot, slots);

      return {
        slot,
        recipe,
        selectionReasons: explainRecipeSelection(recipe, {
          slotCalorieTarget: slotTarget,
          dailyBudgetIdr: dailyBudget,
          allergies: preferences.allergies,
          dietaryRestrictions: preferences.dietaryRestrictions,
        }),
        ingredientsToVerify: inspectIngredientsToVerify(recipe, preferences.allergies),
      };
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

  const totalWeeklyP = days.reduce((s, d) => s + d.totals.proteinGrams, 0);
  const totalWeeklyC = days.reduce((s, d) => s + d.totals.carbsGrams, 0);
  const totalWeeklyF = days.reduce((s, d) => s + d.totals.fatGrams, 0);
  const macroSumKcal = totalWeeklyP * 4 + totalWeeklyC * 4 + totalWeeklyF * 9 || 1;
  const pPct = Math.round(((totalWeeklyP * 4) / macroSumKcal) * 100);
  const cPct = Math.round(((totalWeeklyC * 4) / macroSumKcal) * 100);
  const fPct = Math.max(0, 100 - pPct - cPct);

  const ingredientMap = new Map<string, string>();
  for (const d of days) {
    for (const m of d.meals) {
      for (const ing of m.recipe.ingredients) {
        if (!ingredientMap.has(ing.name)) {
          ingredientMap.set(ing.name, ing.amount);
        }
      }
    }
  }

  const plan: MealPlanRecord = {
    id: `plan-${Date.now()}`,
    userId: "current-user",
    title: "Rencana Makan 7 Hari Terpersonalisasi",
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
        proteinGrams: Math.round(totalWeeklyP / 7),
        carbsGrams: Math.round(totalWeeklyC / 7),
        fatGrams: Math.round(totalWeeklyF / 7),
        proteinPct: pPct,
        carbsPct: cPct,
        fatPct: fPct,
      },
      tradeOffNotes: [
        "Seluruh menu disaring ketat mengikuti aturan alergi dan pembatasan diet Anda.",
        "Estimasi biaya bahan dihitung berdasarkan harga pasar lokal.",
      ],
      disclaimer:
        "Estimasi nutrisi disusun dari database bahan makanan utuh. Periksa kemasan bumbu/saus dan konsultasikan dengan ahli gizi untuk kondisi medis khusus.",
    },
    shoppingList: [
      {
        category: "Bahan Belanja Mingguan",
        items: Array.from(ingredientMap.entries()).map(([name, amount], idx) => ({
          id: `shop-${idx + 1}`,
          name,
          amount,
          category: "Bahan Utama",
          checked: false,
        })),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  cachedLocalPlan = plan;
  return plan;
}

export const mealPlannerApi = {
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
      feature: "Rencana Makan 7 Hari",
      description:
        "Jadwal menu mingguan dengan penyaringan alergen ketat dan estimasi belanja harian.",
      entitlementRequired: "MEAL_PLANNER",
      sampleDay: {
        day: "Monday",
        meals: [],
        totals: {
          calories: 1850,
          proteinGrams: 110,
          carbsGrams: 210,
          fatGrams: 55,
          fiberGrams: 28,
          estimatedCostIdr: 75000,
        },
      },
      sampleSummary: { totalDays: 7, averageDailyCalories: 1850 },
      capabilities: [
        "Jadwal 7 hari terpersonalisasi",
        "Penyaringan alergi & diet ketat tanpa pelonggaran",
        "Penjelasan alasan pemilihan tiap menu & bahan yang perlu diperiksa",
        "Estimasi biaya belanja bahan lokal",
      ],
    };
  },

  async getSavedPlan(token?: string | null): Promise<MealPlanRecord | null> {
    const revision = accountRevision();
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/meal-plans/saved`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 401) {
          await notifyUnauthorizedSession(revision);
          return null;
        }

        if (res.status === 404) {
          return cachedLocalPlan;
        }

        if (res.ok) {
          const plan = await res.json();
          if (revision !== accountRevision()) return null;
          cachedLocalPlan = plan;
          return plan;
        }
      } catch {
        // Fallback silently to cached plan
      }
    }

    return cachedLocalPlan;
  },

  async generatePlan(
    preferences: MealPlanPreferences,
    token?: string | null
  ): Promise<MealPlanRecord> {
    const revision = accountRevision();
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

        if (res.status === 401) {
          await notifyUnauthorizedSession(revision);
          throw new Error("Sesi Anda telah berakhir. Silakan masuk kembali.");
        }

        if (res.status === 422 || res.status === 400) {
          const errData: any = await res.json().catch(() => ({}));
          throw new Error(
            errData?.message ||
              "No recipes match your allergy and dietary restrictions."
          );
        }

        if (res.ok) {
          const plan = await res.json();
          cachedLocalPlan = plan;
          return plan;
        }
      } catch (err: any) {
        if (
          /No recipes|No safe recipes|Sesi Anda/i.test(String(err?.message || ""))
        ) {
          throw err;
        }
        // Network offline -> fall through to local planner using identical shared safety rules
      }
    }

    return generateLocalPlan(preferences);
  },

  async savePlan(
    plan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    const revision = accountRevision();
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

        if (res.status === 401) {
          await notifyUnauthorizedSession(revision);
          return plan;
        }

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

  async getSubstitutions(
    slot: MealSlot,
    currentRecipeId: string,
    preferences?: MealPlanPreferences,
    token?: string | null
  ): Promise<SubstitutionCandidate[]> {
    const revision = accountRevision();
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

        if (res.status === 401) {
          await notifyUnauthorizedSession(revision);
          return [];
        }

        if (res.ok) {
          const data = await res.json();
          return data.substitutions || [];
        }
      } catch {
        // Fallback silently to local substitutions
      }
    }

    const current = MOCK_RECIPES.find((r) => r.id === currentRecipeId);
    const currentCals = current?.calories || 0;
    const currentCost = current?.estimatedCostIdr || 0;

    return MOCK_RECIPES.filter(
      (r) =>
        r.id !== currentRecipeId &&
        r.category.toLowerCase() === slot.toLowerCase() &&
        isRecipeEligible(r, {
          allergies: preferences?.allergies || [],
          dietaryRestrictions: preferences?.dietaryRestrictions || [],
        })
    ).map((r) => ({
      recipe: r,
      calorieDiff: r.calories - currentCals,
      costDiffIdr: (r.estimatedCostIdr || 0) - currentCost,
    }));
  },

  async replaceMeal(
    dayIndex: number,
    slot: MealSlot,
    newRecipeId: string,
    currentPlan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    const revision = accountRevision();
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

        if (res.status === 401) {
          await notifyUnauthorizedSession(revision);
          throw new Error("Sesi Anda telah berakhir.");
        }

        if (res.status === 400) {
          const errData: any = await res.json().catch(() => ({}));
          throw new Error(
            errData?.message || "Recipe conflicts with dietary restrictions."
          );
        }

        if (res.ok) {
          const plan = await res.json();
          cachedLocalPlan = plan;
          return plan;
        }
      } catch (err: any) {
        if (/conflicts|Sesi Anda/i.test(String(err?.message || ""))) {
          throw err;
        }
      }
    }

    const newRecipe = MOCK_RECIPES.find((r) => r.id === newRecipeId);
    if (!newRecipe) return currentPlan;
    if (
      !isRecipeEligible(newRecipe, {
        allergies: currentPlan.preferences.allergies,
        dietaryRestrictions: currentPlan.preferences.dietaryRestrictions,
      })
    ) {
      throw new Error("Recipe conflicts with dietary restrictions.");
    }

    const slots = currentPlan.preferences.preferredMealSlots || [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snack",
    ];
    const slotTarget = getSlotCalorieTarget(
      currentPlan.preferences.dailyCalorieTarget || 2000,
      slot,
      slots
    );

    const updatedDays = currentPlan.days.map((day, idx) => {
      if (idx !== dayIndex) return day;

      const updatedMeals = day.meals.map((m) =>
        m.slot === slot
          ? {
              slot,
              recipe: newRecipe,
              selectionReasons: explainRecipeSelection(newRecipe, {
                slotCalorieTarget: slotTarget,
                dailyBudgetIdr: currentPlan.preferences.dailyBudgetIdr,
                allergies: currentPlan.preferences.allergies,
                dietaryRestrictions: currentPlan.preferences.dietaryRestrictions,
              }),
              ingredientsToVerify: inspectIngredientsToVerify(
                newRecipe,
                currentPlan.preferences.allergies
              ),
            }
          : m
      );

      const dayCals = updatedMeals.reduce((sum, m) => sum + (m.recipe.calories || 0), 0);
      const dayP = updatedMeals.reduce(
        (sum, m) => sum + (m.recipe.nutrition?.proteinGrams || 0),
        0
      );
      const dayC = updatedMeals.reduce(
        (sum, m) => sum + (m.recipe.nutrition?.carbsGrams || 0),
        0
      );
      const dayF = updatedMeals.reduce(
        (sum, m) => sum + (m.recipe.nutrition?.fatGrams || 0),
        0
      );
      const dayFib = updatedMeals.reduce(
        (sum, m) => sum + (m.recipe.nutrition?.fiberGrams || 0),
        0
      );
      const dayCost = updatedMeals.reduce(
        (sum, m) => sum + (m.recipe.estimatedCostIdr || 0),
        0
      );

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
    const totalWeeklyCost = updatedDays.reduce(
      (sum, d) => sum + d.totals.estimatedCostIdr,
      0
    );

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
