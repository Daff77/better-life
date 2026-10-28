import { FoodItem } from "../data/mockRecipes";

export type MealSlot = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export type DietaryRestriction =
  | "Vegetarian"
  | "Vegan"
  | "Pescatarian"
  | "Halal"
  | "Keto"
  | "Gluten-Free"
  | "Dairy-Free"
  | "None";

export type Allergen =
  | "Dairy"
  | "Eggs"
  | "Fish"
  | "Shellfish"
  | "Tree Nuts"
  | "Peanuts"
  | "Wheat/Gluten"
  | "Soy";

export interface MealPlanPreferences {
  dailyCalorieTarget: number;
  macroTargets?: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  dietaryRestrictions: string[];
  allergies: string[];
  foodPreferences: string[];
  dailyBudgetIdr: number;
  preferredMealSlots: MealSlot[];
  availableIngredients: string[];
  mealsPerDay: number;
}

export interface MealPlanSlotAssignment {
  slot: MealSlot;
  recipe: FoodItem;
}

export interface MealPlanDayTotals {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  estimatedCostIdr: number;
}

export interface MealPlanDay {
  day: string;
  date?: string;
  meals: MealPlanSlotAssignment[];
  totals: MealPlanDayTotals;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  category: string;
  estimatedCostIdr?: number;
  checked?: boolean;
}

export interface ShoppingListCategory {
  category: string;
  items: ShoppingListItem[];
}

export interface MealPlanSummary {
  totalDays: number;
  weeklyCalories: number;
  averageDailyCalories: number;
  weeklyEstimatedCostIdr: number;
  averageDailyEstimatedCostIdr: number;
  macroBalance: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
  tradeOffNotes: string[];
  disclaimer: string;
}

export interface MealPlanRecord {
  id: string;
  userId: string;
  title: string;
  status: "active" | "archived";
  preferences: MealPlanPreferences;
  days: MealPlanDay[];
  summary: MealPlanSummary;
  shoppingList: ShoppingListCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface SubstitutionCandidate {
  recipe: FoodItem;
  calorieDiff: number;
  costDiffIdr: number;
}

export const DIETARY_RESTRICTION_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Halal",
  "Keto",
  "Gluten-Free",
  "Dairy-Free",
] as const;

export const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat/Gluten",
  "Soy",
] as const;

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
];

export const DEFAULT_MEAL_PLAN_PREFERENCES: MealPlanPreferences = {
  dailyCalorieTarget: 2000,
  macroTargets: {
    proteinGrams: 140,
    carbsGrams: 225,
    fatGrams: 60,
  },
  dietaryRestrictions: [],
  allergies: [],
  foodPreferences: ["Balanced Whole Foods"],
  dailyBudgetIdr: 50000,
  preferredMealSlots: ["Breakfast", "Lunch", "Dinner", "Snack"],
  availableIngredients: [],
  mealsPerDay: 4,
};

export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
