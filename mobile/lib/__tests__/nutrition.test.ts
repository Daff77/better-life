import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePersonalizedPlan,
  calculateNutrientsForServing,
  calculateNutrientsPer100g,
  calculateDailyTotals,
} from "../nutritionDomain";

describe("Nutrition Domain Calculations & Unit Tests", () => {
  describe("Mifflin-St Jeor Engine & Macro Partitioning", () => {
    it("should accurately calculate BMR, TDEE, and maintenance targets for male", () => {
      // 70kg, 175cm, 25 yo male:
      // BMR = 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75 -> 1674
      // TDEE = round(1674 * 1.35) = 2260
      const plan = calculatePersonalizedPlan({
        weight: 70,
        height: 175,
        gender: "Male",
        age: 25,
        goal: "Eat balanced",
      });

      assert.equal(plan.bmr, 1674);
      assert.equal(plan.tdee, 2260);
      assert.equal(plan.targetCalories, 2260);
      // Macros: 25% protein (4 kcal/g) = 565/4 = 141g
      // 50% carbs (4 kcal/g) = 1130/4 = 283g
      // 25% fat (9 kcal/g) = 565/9 = 63g
      assert.equal(plan.targetProteinGrams, 141);
      assert.equal(plan.targetCarbGrams, 283);
      assert.equal(plan.targetFatGrams, 63);
    });

    it("should calculate appropriate deficit for weight loss goal", () => {
      const plan = calculatePersonalizedPlan({
        weight: 80,
        height: 180,
        gender: "Male",
        age: 30,
        goal: "Lose weight",
      });

      // Target should be ~82% of TDEE
      assert.equal(plan.targetCalories, Math.round(plan.tdee * 0.82));
      assert.ok(plan.targetCalories < plan.tdee);
    });

    it("should calculate appropriate surplus for muscle gain goal", () => {
      const plan = calculatePersonalizedPlan({
        weight: 65,
        height: 170,
        gender: "Female",
        age: 22,
        goal: "Gain muscle",
      });

      // Target should be ~115% of TDEE
      assert.equal(plan.targetCalories, Math.round(plan.tdee * 1.15));
      assert.ok(plan.targetCalories > plan.tdee);
    });

    it("should enforce safe minimum calorie floor", () => {
      // Extremely low weight / high age scenario
      const femalePlan = calculatePersonalizedPlan({
        weight: 35,
        height: 140,
        gender: "Female",
        age: 70,
        goal: "Lose weight",
      });
      assert.ok(femalePlan.targetCalories >= 1200);

      const malePlan = calculatePersonalizedPlan({
        weight: 35,
        height: 140,
        gender: "Male",
        age: 70,
        goal: "Lose weight",
      });
      assert.ok(malePlan.targetCalories >= 1500);
    });

    it("should reject negative or zero height and weight", () => {
      assert.throws(() => {
        calculatePersonalizedPlan({
          weight: -50,
          height: 170,
          gender: "Male",
          age: 25,
          goal: "Eat balanced",
        });
      }, /Weight and height must be strictly positive/);
    });
  });

  describe("Serving-Based Nutrition Scaling", () => {
    const baseFood = {
      calories: 320,
      proteinGrams: 24,
      carbsGrams: 36,
      fatGrams: 8,
      fiberGrams: 4,
    };

    it("should scale integer quantities accurately", () => {
      const scaled = calculateNutrientsForServing(baseFood, 2);
      assert.equal(scaled.calories, 640);
      assert.equal(scaled.proteinGrams, 48);
      assert.equal(scaled.carbsGrams, 72);
      assert.equal(scaled.fatGrams, 16);
      assert.equal(scaled.fiberGrams, 8);
    });

    it("should return zero nutrients for zero quantity without crashing", () => {
      const scaled = calculateNutrientsForServing(baseFood, 0);
      assert.equal(scaled.calories, 0);
      assert.equal(scaled.proteinGrams, 0);
      assert.equal(scaled.carbsGrams, 0);
      assert.equal(scaled.fatGrams, 0);
      assert.equal(scaled.fiberGrams, 0);
    });

    it("should scale fractional quantities with proper rounding", () => {
      const halfServing = calculateNutrientsForServing(baseFood, 0.5);
      assert.equal(halfServing.calories, 160);
      assert.equal(halfServing.proteinGrams, 12);
      assert.equal(halfServing.carbsGrams, 18);
      assert.equal(halfServing.fatGrams, 4);
      assert.equal(halfServing.fiberGrams, 2);

      const oddFraction = calculateNutrientsForServing(baseFood, 0.33);
      assert.equal(oddFraction.calories, Math.round(320 * 0.33));
      assert.equal(oddFraction.proteinGrams, Math.round(24 * 0.33 * 10) / 10);
    });

    it("should handle large quantities without overflow", () => {
      const large = calculateNutrientsForServing(baseFood, 50);
      assert.equal(large.calories, 16000);
      assert.equal(large.proteinGrams, 1200);
    });

    it("should handle missing nutrient fields gracefully", () => {
      const incompleteFood = {
        calories: 150,
        proteinGrams: 5,
        // carbs, fat, fiber undefined
      };
      const result = calculateNutrientsForServing(incompleteFood, 2);
      assert.equal(result.calories, 300);
      assert.equal(result.proteinGrams, 10);
      assert.equal(result.carbsGrams, 0);
      assert.equal(result.fatGrams, 0);
      assert.equal(result.fiberGrams, 0);
    });

    it("should reject negative quantities", () => {
      assert.throws(() => {
        calculateNutrientsForServing(baseFood, -1.5);
      }, /Quantity cannot be negative/);
    });
  });

  describe("Per-100g Nutrition Calculations", () => {
    const rawFoodPer100g = {
      calories: 250,
      proteinGrams: 20,
      carbsGrams: 10,
      fatGrams: 15,
      fiberGrams: 2,
    };

    it("should calculate exact nutrients according to consumed grams: (per100g * grams) / 100", () => {
      // 150 grams of food = 1.5x
      const result = calculateNutrientsPer100g(rawFoodPer100g, 150);
      assert.equal(result.calories, 375);
      assert.equal(result.proteinGrams, 30);
      assert.equal(result.carbsGrams, 15);
      assert.equal(result.fatGrams, 22.5);
      assert.equal(result.fiberGrams, 3);
    });

    it("should return zeros for 0 consumed grams", () => {
      const result = calculateNutrientsPer100g(rawFoodPer100g, 0);
      assert.equal(result.calories, 0);
      assert.equal(result.proteinGrams, 0);
    });

    it("should reject invalid negative consumed grams", () => {
      assert.throws(() => {
        calculateNutrientsPer100g(rawFoodPer100g, -50);
      }, /Consumed grams cannot be negative/);
    });
  });

  describe("Daily Totals Across Multiple Meals", () => {
    it("should accurately sum calories and macros across multiple meal entries", () => {
      const meals = [
        { calories: 450, proteinGrams: 30, carbsGrams: 50, fatGrams: 12, fiberGrams: 5 }, // Breakfast
        { calories: 650, proteinGrams: 45, carbsGrams: 70, fatGrams: 18, fiberGrams: 8 }, // Lunch
        { calories: 200, proteinGrams: 10, carbsGrams: 25, fatGrams: 6, fiberGrams: 3 },  // Snack
        { calories: 550, proteinGrams: 40, carbsGrams: 45, fatGrams: 16, fiberGrams: 6 }, // Dinner
      ];

      const totals = calculateDailyTotals(meals);
      assert.equal(totals.calories, 1850);
      assert.equal(totals.proteinGrams, 125);
      assert.equal(totals.carbsGrams, 190);
      assert.equal(totals.fatGrams, 52);
      assert.equal(totals.fiberGrams, 22);
    });

    it("should return zeroed profile when given empty entries list", () => {
      const totals = calculateDailyTotals([]);
      assert.equal(totals.calories, 0);
      assert.equal(totals.proteinGrams, 0);
      assert.equal(totals.carbsGrams, 0);
      assert.equal(totals.fatGrams, 0);
      assert.equal(totals.fiberGrams, 0);
    });

    it("should safely handle entries with undefined values", () => {
      const mealsWithGaps = [
        { calories: 300, proteinGrams: 15 },
        { calories: 200, carbsGrams: 30 },
      ];
      const totals = calculateDailyTotals(mealsWithGaps);
      assert.equal(totals.calories, 500);
      assert.equal(totals.proteinGrams, 15);
      assert.equal(totals.carbsGrams, 30);
      assert.equal(totals.fatGrams, 0);
      assert.equal(totals.fiberGrams, 0);
    });
  });
});
