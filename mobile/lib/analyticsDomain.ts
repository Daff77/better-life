/**
 * Domain types and calculation helpers for Advanced Nutrition Analytics.
 * Strictly adheres to Better Life design tokens, tabular numerals, and data integrity rules.
 */

export type DateRangeOption = "7d" | "30d" | "custom";

export interface LoggedMealSummary {
  id: string;
  name: string;
  type: string;
  calories: number;
  estimatedCostIdr?: number;
}

export interface DailyAnalyticsPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon 24" or "Oct 24"
  hasData: boolean;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  estimatedCostIdr: number;
  targetCalories: number;
  calorieDelta: number;
  adherenceStatus: "on_target" | "under_target" | "over_target" | "no_data";
  mealCount: number;
  meals: LoggedMealSummary[];
}

export interface MacroDistribution {
  proteinPercentage: number;
  carbsPercentage: number;
  fatPercentage: number;
  grams: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  targetGrams: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface ConsistencyMetrics {
  totalDaysInRange: number;
  loggedDaysCount: number;
  dataCoveragePercentage: number;
  totalMealsLogged: number;
  averageMealsPerLoggedDay: number;
  currentStreakDays: number;
  longestStreakDays: number;
  mealTimingDistribution: {
    breakfastPercentage: number;
    lunchPercentage: number;
    dinnerPercentage: number;
    snacksPercentage: number;
  };
}

export interface SpendingTrends {
  totalEstimatedCostIdr: number;
  averageDailyCostIdr: number;
  averageCostPerMealIdr: number;
  pricedMealsCount: number;
  totalMealsCount: number;
  pricingCoveragePct: number;
}

export interface AdvancedAnalyticsResponse {
  range: DateRangeOption;
  startDate: string;
  endDate: string;
  summary: {
    totalCalories: number;
    targetCalories: number;
    averageDailyCalories: number;
    adherenceScore: number;
    fiberScore: "Optimal" | "Needs Improvement";
    targetComparison: {
      deltaKcal: number;
      status: "balanced" | "surplus" | "deficit";
      onTargetDays: number;
      underTargetDays: number;
      overTargetDays: number;
    };
  };
  macroDistribution: MacroDistribution;
  dailyTrends: DailyAnalyticsPoint[];
  consistency: ConsistencyMetrics;
  spending: SpendingTrends;
  narrative: string;
  insights: string[];
  disclaimer: string;
}

/**
 * Format Indonesian Rupiah currency with standard thousand separators.
 */
export function formatIdr(amount: number): string {
  if (!amount || amount <= 0) return "Rp 0";
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

/**
 * Format macro grams with tabular precision.
 */
export function formatGrams(grams: number): string {
  if (!grams || grams <= 0) return "0g";
  return `${Math.round(grams)}g`;
}

/**
 * Get adherence status label and design-system colors.
 */
export function getAdherenceBadge(status: DailyAnalyticsPoint["adherenceStatus"]): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (status) {
    case "on_target":
      return {
        label: "On Target",
        bgColor: "#eaf2ec",
        textColor: "#153e28",
        borderColor: "#d6e4db",
      };
    case "under_target":
      return {
        label: "Under Target",
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
        borderColor: "#bfdbfe",
      };
    case "over_target":
      return {
        label: "Above Target",
        bgColor: "#fffbeb",
        textColor: "#b45309",
        borderColor: "#fde68a",
      };
    case "no_data":
    default:
      return {
        label: "No Data Logged",
        bgColor: "#f4f3ed",
        textColor: "#787670",
        borderColor: "#eae8e1",
      };
  }
}

/**
 * Builds an accessible narrative for screen readers describing a daily point.
 */
export function buildAccessibleDayDescription(point: DailyAnalyticsPoint): string {
  if (!point.hasData) {
    return `${point.dayLabel}: No meals were logged for this day.`;
  }
  const deltaText =
    point.calorieDelta >= 0
      ? `${point.calorieDelta} calories above target`
      : `${Math.abs(point.calorieDelta)} calories below target`;

  return `${point.dayLabel}: ${point.calories} calories logged from ${point.mealCount} meals. Protein: ${point.proteinGrams} grams, Carbohydrates: ${point.carbsGrams} grams, Fat: ${point.fatGrams} grams. Status: ${deltaText}.`;
}
