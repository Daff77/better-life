import { FoodItemData } from "../data/seedData.js";

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
  recipe: FoodItemData;
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
  day: string; // "Monday", "Tuesday", etc.
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
