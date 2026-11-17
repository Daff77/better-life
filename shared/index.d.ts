export interface RecipeIngredientLike {
  name: string;
  amount?: string;
}

export interface RecipeNutritionLike {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface RecipeLike {
  id: string;
  title: string;
  category: string;
  calories: number;
  estimatedCostIdr?: number;
  nutrition?: RecipeNutritionLike;
  ingredients: RecipeIngredientLike[];
  dietaryTags?: string[];
  allergens?: string[];
}

export interface DietaryPreferencesLike {
  allergies?: string[];
  dietaryRestrictions?: string[];
}

export interface IngredientVerificationNote {
  ingredient: string;
  amount: string;
  note: string;
}

export interface RecipeSelectionContext {
  slotCalorieTarget?: number;
  dailyBudgetIdr?: number;
  allergies?: string[];
  dietaryRestrictions?: string[];
}

export const ALLERGEN_KEYWORD_MAP: Record<string, string[]>;

export function formatLocalDateKey(date?: Date | string | number): string;
export function isValidDateKey(value: unknown): value is string;
export function shiftCalendarDateKey(dateKey: string, deltaDays: number): string;
export function buildLocalDateWindow(
  range: "7d" | "30d" | "custom",
  customStart?: string,
  customEnd?: string,
  referenceDate?: Date | string
): string[];

export function checkRecipeAllergies(
  recipe: RecipeLike,
  allergies?: string[]
): { safe: boolean; violatedAllergen?: string };

export function checkRecipeDietaryRestrictions(
  recipe: RecipeLike,
  restrictions?: string[]
): { compliant: boolean; violatedRestriction?: string };

export function isRecipeEligible(
  recipe: RecipeLike,
  preferences?: DietaryPreferencesLike
): boolean;

export function filterEligibleRecipes<T extends RecipeLike>(
  recipes: T[],
  preferences?: DietaryPreferencesLike
): T[];

export function inspectIngredientsToVerify(
  recipe: RecipeLike,
  userAllergies?: string[]
): IngredientVerificationNote[];

export function explainRecipeSelection(
  recipe: RecipeLike,
  context?: RecipeSelectionContext
): string[];
