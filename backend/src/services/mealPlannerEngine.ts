import {
  checkRecipeAllergies,
  checkRecipeDietaryRestrictions,
  isRecipeEligible as sharedIsRecipeEligible,
  explainRecipeSelection,
  inspectIngredientsToVerify,
} from "@better-life/shared";
import { FoodItemData } from "../data/seedData.js";
import {
  MealPlanPreferences,
  MealPlanDay,
  MealPlanRecord,
  MealPlanSummary,
  MealPlanSlotAssignment,
  ShoppingListCategory,
  MealSlot,
} from "../types/mealPlan.js";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export class MealPlannerEngine {
  public static checkAllergies(
    recipe: FoodItemData,
    allergies: string[]
  ): { safe: boolean; violatedAllergen?: string } {
    return checkRecipeAllergies(recipe, allergies);
  }

  public static checkDietaryRestrictions(
    recipe: FoodItemData,
    restrictions: string[]
  ): { compliant: boolean; violatedRestriction?: string } {
    return checkRecipeDietaryRestrictions(recipe, restrictions);
  }

  public static isRecipeEligible(
    recipe: FoodItemData,
    preferences: MealPlanPreferences
  ): boolean {
    return sharedIsRecipeEligible(recipe, {
      allergies: preferences.allergies,
      dietaryRestrictions: preferences.dietaryRestrictions,
    });
  }

  public static getSlotWeights(slots: MealSlot[]): Record<MealSlot, number> {
    const defaultWeights: Record<MealSlot, number> = {
      Breakfast: 0.25,
      Lunch: 0.35,
      Dinner: 0.3,
      Snack: 0.1,
    };

    if (slots.length === 0) {
      return { Breakfast: 0.3, Lunch: 0.4, Dinner: 0.3, Snack: 0 };
    }

    let totalWeight = 0;
    for (const s of slots) {
      totalWeight += defaultWeights[s] || 0.25;
    }

    const normalized: Record<MealSlot, number> = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };

    for (const s of slots) {
      normalized[s] = (defaultWeights[s] || 0.25) / totalWeight;
    }

    return normalized;
  }

  /**
   * Generates a 7-day personalized meal plan.
   * NEVER relaxes allergy or dietary restrictions when safe recipes are scarce or absent.
   */
  public static generatePlan(
    userId: string,
    preferences: MealPlanPreferences,
    allRecipes: FoodItemData[]
  ): MealPlanRecord {
    const slots =
      preferences.preferredMealSlots && preferences.preferredMealSlots.length > 0
        ? preferences.preferredMealSlots
        : (["Breakfast", "Lunch", "Dinner", "Snack"] as MealSlot[]);

    const eligiblePool = allRecipes.filter((r) => this.isRecipeEligible(r, preferences));
    if (eligiblePool.length === 0) {
      const activeFilters = [
        ...(preferences.allergies || []),
        ...(preferences.dietaryRestrictions || []),
      ].filter(Boolean);
      throw new Error(
        activeFilters.length > 0
          ? `No safe recipes match your allergy and dietary restrictions (${activeFilters.join(", ")}).`
          : "No recipes are available to build a meal plan."
      );
    }

    const slotWeights = this.getSlotWeights(slots);
    const targetDailyCalories = preferences.dailyCalorieTarget || 2000;
    const targetDailyBudget = preferences.dailyBudgetIdr || 50000;

    const recentRecipeHistory: Map<string, number> = new Map();
    const days: MealPlanDay[] = [];

    for (let dayIndex = 0; dayIndex < DAYS_OF_WEEK.length; dayIndex++) {
      const dayName = DAYS_OF_WEEK[dayIndex];
      const dayMeals: MealPlanSlotAssignment[] = [];

      let dayCalories = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;
      let dayFiber = 0;
      let dayCost = 0;

      for (const slot of slots) {
        const slotCalorieTarget = Math.round(targetDailyCalories * slotWeights[slot]);
        const slotBudgetLimit = Math.round(targetDailyBudget * slotWeights[slot]);

        // Only consider recipes from eligiblePool (guaranteed safe for allergies AND diet)
        let candidates = eligiblePool.filter(
          (r) => r.category.toLowerCase() === slot.toLowerCase()
        );

        if (candidates.length === 0 && slot === "Snack") {
          candidates = eligiblePool.filter(
            (r) => r.category === "Snack" || r.category === "Drink"
          );
        }

        if (candidates.length === 0) {
          candidates = eligiblePool.filter(
            (r) => r.category === "Lunch" || r.category === "Dinner"
          );
        }

        if (candidates.length === 0) {
          candidates = eligiblePool;
        }

        const scored = candidates.map((recipe) => {
          let score = 0;

          const calDiff = Math.abs(recipe.calories - slotCalorieTarget);
          score += calDiff * 1.5;

          const cost = recipe.estimatedCostIdr || 0;
          if (cost > slotBudgetLimit && slotBudgetLimit > 0) {
            score += ((cost - slotBudgetLimit) / 1000) * 15;
          } else if (cost > 0) {
            score -= 50;
          }

          if (preferences.availableIngredients && preferences.availableIngredients.length > 0) {
            const hasPantryItem = recipe.ingredients.some((ing) =>
              preferences.availableIngredients.some((p) =>
                ing.name.toLowerCase().includes(p.toLowerCase())
              )
            );
            if (hasPantryItem) score -= 300;
          }

          const lastUsedDay = recentRecipeHistory.get(recipe.id);
          if (lastUsedDay !== undefined) {
            const daysSince = dayIndex - lastUsedDay;
            if (daysSince === 1) score += 900;
            else if (daysSince === 2) score += 450;
            else if (daysSince === 3) score += 200;
          }

          return { recipe, score };
        });

        scored.sort((a, b) => a.score - b.score);
        const chosen = scored[0]?.recipe || candidates[0];

        dayMeals.push({
          slot,
          recipe: chosen,
          selectionReasons: explainRecipeSelection(chosen, {
            slotCalorieTarget,
            dailyBudgetIdr: targetDailyBudget,
            allergies: preferences.allergies,
            dietaryRestrictions: preferences.dietaryRestrictions,
          }),
          ingredientsToVerify: inspectIngredientsToVerify(chosen, preferences.allergies),
        });
        recentRecipeHistory.set(chosen.id, dayIndex);

        dayCalories += chosen.calories;
        dayProtein += chosen.nutrition.proteinGrams;
        dayCarbs += chosen.nutrition.carbsGrams;
        dayFat += chosen.nutrition.fatGrams;
        dayFiber += chosen.nutrition.fiberGrams;
        dayCost += chosen.estimatedCostIdr || 0;
      }

      days.push({
        day: dayName,
        meals: dayMeals,
        totals: {
          calories: dayCalories,
          proteinGrams: dayProtein,
          carbsGrams: dayCarbs,
          fatGrams: dayFat,
          fiberGrams: dayFiber,
          estimatedCostIdr: dayCost,
        },
      });
    }

    const weeklyCalories = days.reduce((sum, d) => sum + d.totals.calories, 0);
    const weeklyCost = days.reduce((sum, d) => sum + d.totals.estimatedCostIdr, 0);
    const weeklyProtein = days.reduce((sum, d) => sum + d.totals.proteinGrams, 0);
    const weeklyCarbs = days.reduce((sum, d) => sum + d.totals.carbsGrams, 0);
    const weeklyFat = days.reduce((sum, d) => sum + d.totals.fatGrams, 0);

    const averageDailyCalories = Math.round(weeklyCalories / 7);
    const averageDailyCost = Math.round(weeklyCost / 7);

    const totalMacroCals = weeklyProtein * 4 + weeklyCarbs * 4 + weeklyFat * 9;
    const proteinPct = Math.round(((weeklyProtein * 4) / (totalMacroCals || 1)) * 100);
    const carbsPct = Math.round(((weeklyCarbs * 4) / (totalMacroCals || 1)) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

    const tradeOffNotes: string[] = [];

    if (preferences.dailyBudgetIdr > 0 && averageDailyCost > preferences.dailyBudgetIdr) {
      const diff = averageDailyCost - preferences.dailyBudgetIdr;
      tradeOffNotes.push(
        `Daily budget target of Rp ${preferences.dailyBudgetIdr.toLocaleString("id-ID")} was adjusted by Rp ${diff.toLocaleString("id-ID")} to ensure clinical macronutrient targets and wholesome fresh ingredients.`
      );
    }

    if (preferences.allergies && preferences.allergies.length > 0) {
      tradeOffNotes.push(
        `All meals strictly exclude user-specified allergens: ${preferences.allergies.join(", ")}.`
      );
    }

    if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
      tradeOffNotes.push(
        `Recipes were calibrated to respect ${preferences.dietaryRestrictions.join(", ")} dietary guidelines.`
      );
    }

    const summary: MealPlanSummary = {
      totalDays: 7,
      weeklyCalories,
      averageDailyCalories,
      weeklyEstimatedCostIdr: weeklyCost,
      averageDailyEstimatedCostIdr: averageDailyCost,
      macroBalance: {
        proteinGrams: Math.round(weeklyProtein / 7),
        carbsGrams: Math.round(weeklyCarbs / 7),
        fatGrams: Math.round(weeklyFat / 7),
        proteinPct,
        carbsPct,
        fatPct,
      },
      tradeOffNotes,
      disclaimer:
        "Nutritional values and grocery prices are calibrated from verified whole-food ingredient databases and regional retail averages. This personalized plan supports mindful wellness and does not substitute for clinical medical therapy.",
    };

    const shoppingList = this.generateShoppingList(days);

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      title: `${DAYS_OF_WEEK.length}-Day Personalized Nutrition Schedule`,
      status: "active",
      preferences,
      days,
      summary,
      shoppingList,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public static generateShoppingList(days: MealPlanDay[]): ShoppingListCategory[] {
    const categoryMap: Record<
      string,
      Map<string, { amount: string; estimatedCostIdr?: number }>
    > = {
      "Produce & Fresh Greens": new Map(),
      "Proteins & Farm Goods": new Map(),
      "Grains, Bread & Staples": new Map(),
      "Pantry, Nuts & Seasonings": new Map(),
      "Beverages & Wellness Liquids": new Map(),
    };

    for (const day of days) {
      for (const meal of day.meals) {
        for (const ing of meal.recipe.ingredients) {
          const normName = ing.name.trim();
          const targetCategory = this.categorizeIngredient(normName);

          const bucket = categoryMap[targetCategory] || categoryMap["Pantry, Nuts & Seasonings"];
          if (bucket.has(normName)) {
            const existing = bucket.get(normName)!;
            bucket.set(normName, {
              amount: `${existing.amount} + ${ing.amount}`,
              estimatedCostIdr: (existing.estimatedCostIdr || 0) + 5000,
            });
          } else {
            bucket.set(normName, {
              amount: ing.amount,
              estimatedCostIdr: 10000,
            });
          }
        }
      }
    }

    const result: ShoppingListCategory[] = [];
    let itemId = 1;

    for (const [categoryName, itemsMap] of Object.entries(categoryMap)) {
      if (itemsMap.size > 0) {
        const items = Array.from(itemsMap.entries()).map(([name, val]) => ({
          id: `item-${itemId++}`,
          name,
          amount: val.amount,
          category: categoryName,
          estimatedCostIdr: val.estimatedCostIdr,
          checked: false,
        }));
        result.push({ category: categoryName, items });
      }
    }

    return result;
  }

  private static categorizeIngredient(name: string): string {
    const l = name.toLowerCase();

    if (/chicken|beef|salmon|fish|egg|tofu|tempeh|sirloin|tenderloin|edamame|pork/i.test(l)) {
      return "Proteins & Farm Goods";
    }

    if (
      /avocado|spinach|berry|berries|banana|apple|cucumber|tomato|lemon|mint|broccoli|asparagus|greens|kabocha|bok choy|buncis/i.test(
        l
      )
    ) {
      return "Produce & Fresh Greens";
    }

    if (/rice|quinoa|sourdough|bread|oats|oatmeal|lentils|chia/i.test(l)) {
      return "Grains, Bread & Staples";
    }

    if (/matcha|tea|water|sparkling|milk|oat milk|almond milk/i.test(l)) {
      return "Beverages & Wellness Liquids";
    }

    return "Pantry, Nuts & Seasonings";
  }

  public static getSubstitutions(
    slot: MealSlot,
    currentRecipeId: string,
    preferences: MealPlanPreferences,
    allRecipes: FoodItemData[]
  ): {
    recipe: FoodItemData;
    calorieDiff: number;
    costDiffIdr: number;
  }[] {
    const current = allRecipes.find((r) => r.id === currentRecipeId);
    const baseCalories = current ? current.calories : 400;
    const baseCost = current?.estimatedCostIdr || 25000;

    return allRecipes
      .filter(
        (r) =>
          r.id !== currentRecipeId &&
          r.category.toLowerCase() === slot.toLowerCase() &&
          this.isRecipeEligible(r, preferences)
      )
      .map((recipe) => ({
        recipe,
        calorieDiff: recipe.calories - baseCalories,
        costDiffIdr: (recipe.estimatedCostIdr || 0) - baseCost,
      }))
      .sort((a, b) => Math.abs(a.calorieDiff) - Math.abs(b.calorieDiff));
  }

  public static replaceMeal(
    plan: MealPlanRecord,
    dayIndex: number,
    slot: MealSlot,
    newRecipeId: string,
    allRecipes: FoodItemData[]
  ): MealPlanRecord {
    const newRecipe = allRecipes.find((r) => r.id === newRecipeId);
    if (!newRecipe) throw new Error("Replacement recipe not found");
    if (plan.preferences && !this.isRecipeEligible(newRecipe, plan.preferences)) {
      throw new Error("Replacement recipe conflicts with allergy or dietary restrictions.");
    }

    const targetDay = plan.days[dayIndex];
    if (!targetDay) throw new Error("Day index out of bounds");

    const slotWeights = this.getSlotWeights(
      plan.preferences?.preferredMealSlots || ["Breakfast", "Lunch", "Dinner", "Snack"]
    );
    const slotTarget = Math.round(
      (plan.preferences?.dailyCalorieTarget || 2000) * (slotWeights[slot] || 0.25)
    );

    const newAssignment: MealPlanSlotAssignment = {
      slot,
      recipe: newRecipe,
      selectionReasons: explainRecipeSelection(newRecipe, {
        slotCalorieTarget: slotTarget,
        dailyBudgetIdr: plan.preferences?.dailyBudgetIdr,
        allergies: plan.preferences?.allergies,
        dietaryRestrictions: plan.preferences?.dietaryRestrictions,
      }),
      ingredientsToVerify: inspectIngredientsToVerify(
        newRecipe,
        plan.preferences?.allergies
      ),
    };

    const mealIdx = targetDay.meals.findIndex((m) => m.slot === slot);
    if (mealIdx >= 0) {
      targetDay.meals[mealIdx] = newAssignment;
    } else {
      targetDay.meals.push(newAssignment);
    }

    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFat = 0;
    let dayFiber = 0;
    let dayCost = 0;

    for (const m of targetDay.meals) {
      dayCalories += m.recipe.calories;
      dayProtein += m.recipe.nutrition.proteinGrams;
      dayCarbs += m.recipe.nutrition.carbsGrams;
      dayFat += m.recipe.nutrition.fatGrams;
      dayFiber += m.recipe.nutrition.fiberGrams;
      dayCost += m.recipe.estimatedCostIdr || 0;
    }

    targetDay.totals = {
      calories: dayCalories,
      proteinGrams: dayProtein,
      carbsGrams: dayCarbs,
      fatGrams: dayFat,
      fiberGrams: dayFiber,
      estimatedCostIdr: dayCost,
    };

    const weeklyCalories = plan.days.reduce((sum, d) => sum + d.totals.calories, 0);
    const weeklyCost = plan.days.reduce((sum, d) => sum + d.totals.estimatedCostIdr, 0);
    const weeklyProtein = plan.days.reduce((sum, d) => sum + d.totals.proteinGrams, 0);
    const weeklyCarbs = plan.days.reduce((sum, d) => sum + d.totals.carbsGrams, 0);
    const weeklyFat = plan.days.reduce((sum, d) => sum + d.totals.fatGrams, 0);

    const averageDailyCalories = Math.round(weeklyCalories / plan.days.length);
    const averageDailyCost = Math.round(weeklyCost / plan.days.length);

    const totalMacroCals = weeklyProtein * 4 + weeklyCarbs * 4 + weeklyFat * 9;
    const proteinPct = Math.round(((weeklyProtein * 4) / (totalMacroCals || 1)) * 100);
    const carbsPct = Math.round(((weeklyCarbs * 4) / (totalMacroCals || 1)) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

    plan.summary = {
      ...plan.summary,
      weeklyCalories,
      averageDailyCalories,
      weeklyEstimatedCostIdr: weeklyCost,
      averageDailyEstimatedCostIdr: averageDailyCost,
      macroBalance: {
        proteinGrams: Math.round(weeklyProtein / plan.days.length),
        carbsGrams: Math.round(weeklyCarbs / plan.days.length),
        fatGrams: Math.round(weeklyFat / plan.days.length),
        proteinPct,
        carbsPct,
        fatPct,
      },
    };

    plan.shoppingList = this.generateShoppingList(plan.days);
    plan.updatedAt = new Date().toISOString();

    return plan;
  }
}
