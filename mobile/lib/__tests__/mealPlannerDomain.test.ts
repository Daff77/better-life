import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatIdr,
  DEFAULT_MEAL_PLAN_PREFERENCES,
  DIETARY_RESTRICTION_OPTIONS,
  COMMON_ALLERGENS,
  DEFAULT_MEAL_SLOTS,
} from "../mealPlannerDomain";

describe("Mobile Meal Planner Domain Unit Tests", () => {
  describe("1. Currency & Formatting Helpers", () => {
    it("should format IDR prices cleanly with regional thousand separators", () => {
      assert.equal(formatIdr(50000), "Rp 50.000");
      assert.equal(formatIdr(1200000), "Rp 1.200.000");
      assert.equal(formatIdr(0), "Rp 0");
    });
  });

  describe("2. Default Configuration & Presets", () => {
    it("should provide clinically balanced default preferences", () => {
      assert.equal(DEFAULT_MEAL_PLAN_PREFERENCES.dailyCalorieTarget, 2000);
      assert.equal(DEFAULT_MEAL_PLAN_PREFERENCES.dailyBudgetIdr, 50000);
      assert.equal(DEFAULT_MEAL_PLAN_PREFERENCES.mealsPerDay, 4);
      assert.equal(DEFAULT_MEAL_PLAN_PREFERENCES.preferredMealSlots.length, 4);
      assert.ok(DEFAULT_MEAL_PLAN_PREFERENCES.macroTargets);
      assert.equal(DEFAULT_MEAL_PLAN_PREFERENCES.macroTargets.proteinGrams, 140);
    });

    it("should define standard dietary restrictions and allergen tags", () => {
      assert.ok(DIETARY_RESTRICTION_OPTIONS.includes("Vegetarian"));
      assert.ok(DIETARY_RESTRICTION_OPTIONS.includes("Vegan"));
      assert.ok(DIETARY_RESTRICTION_OPTIONS.includes("Gluten-Free"));
      assert.ok(DIETARY_RESTRICTION_OPTIONS.includes("Keto"));

      assert.ok(COMMON_ALLERGENS.includes("Dairy"));
      assert.ok(COMMON_ALLERGENS.includes("Eggs"));
      assert.ok(COMMON_ALLERGENS.includes("Tree Nuts"));
      assert.ok(COMMON_ALLERGENS.includes("Fish"));
    });

    it("should include four standard meal slots", () => {
      assert.deepEqual(DEFAULT_MEAL_SLOTS, ["Breakfast", "Lunch", "Dinner", "Snack"]);
    });
  });
});
