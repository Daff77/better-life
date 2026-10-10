/**
 * Core Nutrition Domain Logic Engine for Better Life
 *
 * Implements validated Mifflin-St Jeor equations, macro partitioning,
 * quantity scaling (per serving and per 100g), and daily aggregation.
 * Reference: Mifflin MD, St Jeor ST, et al. (1990)
 */

export interface NutrientProfile {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export interface PlanCalculationInput {
  weight: number; // in kg
  height: number; // in cm
  gender: "Female" | "Male";
  birthDate?: { day: number; month: string | number; year: number };
  age?: number;
  goal: "Eat balanced" | "Lose weight" | "Gain muscle";
  activityFactor?: number; // default: 1.35 (lightly to moderately active)
}

export interface PlanCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbGrams: number;
  targetFatGrams: number;
}

/**
 * Calculates BMR, TDEE, and recommended target calories and macronutrients
 * using the clinically validated Mifflin-St Jeor formula.
 */
export function calculatePersonalizedPlan(input: PlanCalculationInput): PlanCalculationResult {
  if (input.weight <= 0 || input.height <= 0) {
    throw new Error("Weight and height must be strictly positive numbers.");
  }

  const currentYear = new Date().getFullYear();
  let age = input.age;
  if (age === undefined && input.birthDate) {
    age = currentYear - input.birthDate.year;
  }
  age = Math.max(14, Math.min(100, age ?? 25));

  // Mifflin-St Jeor Equation:
  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + (Male: +5, Female: -161)
  let bmr = 10 * input.weight + 6.25 * input.height - 5 * age;
  bmr += input.gender === "Male" ? 5 : -161;
  bmr = Math.max(800, Math.round(bmr));

  // Total Daily Energy Expenditure (TDEE)
  const factor = input.activityFactor && input.activityFactor > 1 ? input.activityFactor : 1.35;
  const tdee = Math.round(bmr * factor);

  // Caloric target adjustment based on goal:
  // - Lose weight: ~18% caloric deficit
  // - Gain muscle: ~15% caloric surplus
  // - Eat balanced: maintenance (100%)
  let targetCalories = tdee;
  if (input.goal === "Lose weight") {
    targetCalories = Math.round(tdee * 0.82);
  } else if (input.goal === "Gain muscle") {
    targetCalories = Math.round(tdee * 1.15);
  }

  // Safety floor: do not recommend below 1200 kcal for females or 1500 kcal for males
  const safeMinimum = input.gender === "Female" ? 1200 : 1500;
  targetCalories = Math.max(safeMinimum, targetCalories);

  // Standard macronutrient split:
  // Protein: 25% (4 kcal/g)
  // Carbs: 50% (4 kcal/g)
  // Fat: 25% (9 kcal/g)
  const targetProteinGrams = Math.round((targetCalories * 0.25) / 4);
  const targetCarbGrams = Math.round((targetCalories * 0.50) / 4);
  const targetFatGrams = Math.round((targetCalories * 0.25) / 9);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProteinGrams,
    targetCarbGrams,
    targetFatGrams,
  };
}

/**
 * Calculates consumed nutrients given a base serving profile and a quantity multiplier.
 * Formula: nutrient_consumed = round(base_nutrient * quantity, 1 decimal place)
 */
export function calculateNutrientsForServing(
  base: Partial<NutrientProfile>,
  quantity: number
): NutrientProfile {
  if (quantity < 0 || isNaN(quantity)) {
    throw new Error("Quantity cannot be negative or invalid.");
  }

  if (quantity === 0) {
    return {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    };
  }

  const roundValue = (val: number | undefined): number => {
    if (val === undefined || isNaN(val)) return 0;
    return Math.round(val * quantity * 10) / 10;
  };

  const calories = Math.round((base.calories ?? 0) * quantity);

  return {
    calories: Math.max(0, calories),
    proteinGrams: Math.max(0, roundValue(base.proteinGrams)),
    carbsGrams: Math.max(0, roundValue(base.carbsGrams)),
    fatGrams: Math.max(0, roundValue(base.fatGrams)),
    fiberGrams: Math.max(0, roundValue(base.fiberGrams)),
  };
}

/**
 * Calculates consumed nutrients given nutrition per 100g and consumed grams.
 * Formula: consumed_nutrient = (nutrient_per_100g * consumed_grams) / 100
 */
export function calculateNutrientsPer100g(
  per100g: Partial<NutrientProfile>,
  consumedGrams: number
): NutrientProfile {
  if (consumedGrams < 0 || isNaN(consumedGrams)) {
    throw new Error("Consumed grams cannot be negative or invalid.");
  }

  if (consumedGrams === 0) {
    return {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    };
  }

  const factor = consumedGrams / 100;
  const roundValue = (val: number | undefined): number => {
    if (val === undefined || isNaN(val)) return 0;
    return Math.round(val * factor * 10) / 10;
  };

  return {
    calories: Math.max(0, Math.round((per100g.calories ?? 0) * factor)),
    proteinGrams: Math.max(0, roundValue(per100g.proteinGrams)),
    carbsGrams: Math.max(0, roundValue(per100g.carbsGrams)),
    fatGrams: Math.max(0, roundValue(per100g.fatGrams)),
    fiberGrams: Math.max(0, roundValue(per100g.fiberGrams)),
  };
}

/**
 * Aggregates daily nutrient totals across multiple meal entries.
 */
export function calculateDailyTotals(entries: Partial<NutrientProfile>[]): NutrientProfile {
  if (!entries || entries.length === 0) {
    return {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    };
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  for (const entry of entries) {
    calories += entry.calories ?? 0;
    protein += entry.proteinGrams ?? 0;
    carbs += entry.carbsGrams ?? 0;
    fat += entry.fatGrams ?? 0;
    fiber += entry.fiberGrams ?? 0;
  }

  return {
    calories: Math.round(calories),
    proteinGrams: Math.round(protein * 10) / 10,
    carbsGrams: Math.round(carbs * 10) / 10,
    fatGrams: Math.round(fat * 10) / 10,
    fiberGrams: Math.round(fiber * 10) / 10,
  };
}
