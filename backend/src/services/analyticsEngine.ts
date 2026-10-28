export interface LoggedMealRecord {
  id: string;
  userId: string;
  type: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink" | string;
  name: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  estimatedCostIdr?: number;
  quantity?: number;
  dateKey?: string;
  time?: string;
  loggedAt: Date | string;
}

export interface DailyAnalyticsPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue" or "Oct 24"
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
  meals: {
    id: string;
    name: string;
    type: string;
    calories: number;
    estimatedCostIdr?: number;
  }[];
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

export interface SpendingTrends {
  totalEstimatedCostIdr: number;
  averageDailyCostIdr: number;
  averageCostPerMealIdr: number;
  pricedMealsCount: number;
  totalMealsCount: number;
  pricingCoveragePct: number;
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

export interface AdvancedAnalyticsResponse {
  range: "7d" | "30d" | "custom";
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

export class AnalyticsEngine {
  /**
   * Helper to format a Date into YYYY-MM-DD
   */
  public static formatDateKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates continuous date strings for the requested window
   */
  public static generateDateKeys(
    range: "7d" | "30d" | "custom",
    customStart?: string,
    customEnd?: string,
    referenceDate = new Date()
  ): string[] {
    const daysCount = range === "30d" ? 30 : 7;
    const dateKeys: string[] = [];

    if (range === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const current = new Date(start);

      while (current <= end) {
        dateKeys.push(this.formatDateKey(current));
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return dateKeys;
    }

    // Default 7d or 30d relative to reference date (inclusive of referenceDate)
    const base = new Date(referenceDate);
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i);
      dateKeys.push(this.formatDateKey(d));
    }

    return dateKeys;
  }

  /**
   * Core analytics calculation engine
   */
  public static computeAnalytics(
    userId: string,
    allUserMeals: LoggedMealRecord[],
    targetCalories = 2000,
    range: "7d" | "30d" | "custom" = "7d",
    customStart?: string,
    customEnd?: string,
    referenceDate = new Date()
  ): AdvancedAnalyticsResponse {
    const dateKeys = this.generateDateKeys(range, customStart, customEnd, referenceDate);
    const startDate = dateKeys[0];
    const endDate = dateKeys[dateKeys.length - 1];

    // Map meals to their normalized YYYY-MM-DD date key
    const mealsByDate = new Map<string, LoggedMealRecord[]>();
    for (const dk of dateKeys) {
      mealsByDate.set(dk, []);
    }

    // Filter meals matching the user and fall within date range
    let totalMealsInRange = 0;
    let pricedMealsCount = 0;
    let totalPricedCost = 0;

    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;
    let snackCount = 0;

    for (const m of allUserMeals) {
      if (m.userId !== userId) continue;

      const mDate = m.dateKey || (m.loggedAt instanceof Date
        ? this.formatDateKey(m.loggedAt)
        : String(m.loggedAt).split("T")[0]);

      if (mealsByDate.has(mDate)) {
        mealsByDate.get(mDate)!.push(m);
        totalMealsInRange++;

        if ((m.estimatedCostIdr || 0) > 0) {
          pricedMealsCount++;
          totalPricedCost += m.estimatedCostIdr || 0;
        }

        const t = (m.type || "").toLowerCase();
        if (t.includes("breakfast")) breakfastCount++;
        else if (t.includes("lunch")) lunchCount++;
        else if (t.includes("dinner")) dinnerCount++;
        else snackCount++;
      }
    }

    // Daily breakdown analysis
    const dailyTrends: DailyAnalyticsPoint[] = [];
    let loggedDaysCount = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSpending = 0;

    let onTargetDays = 0;
    let underTargetDays = 0;
    let overTargetDays = 0;

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const dk of dateKeys) {
      const dayMeals = mealsByDate.get(dk) || [];
      const hasData = dayMeals.length > 0;
      const dObj = new Date(`${dk}T00:00:00Z`);
      const dayLabel = `${weekdayNames[dObj.getUTCDay()]} ${dObj.getUTCDate()}`;

      if (!hasData) {
        dailyTrends.push({
          date: dk,
          dayLabel,
          hasData: false,
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
          fiberGrams: 0,
          estimatedCostIdr: 0,
          targetCalories,
          calorieDelta: -targetCalories,
          adherenceStatus: "no_data",
          mealCount: 0,
          meals: [],
        });
        continue;
      }

      loggedDaysCount++;

      let dayCals = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;
      let dayFiber = 0;
      let dayCost = 0;

      for (const m of dayMeals) {
        dayCals += m.calories || 0;
        dayProtein += m.proteinGrams || 0;
        dayCarbs += m.carbsGrams || 0;
        dayFat += m.fatGrams || 0;
        dayFiber += m.fiberGrams || 0;
        dayCost += m.estimatedCostIdr || 0;
      }

      totalCalories += dayCals;
      totalProtein += dayProtein;
      totalCarbs += dayCarbs;
      totalFat += dayFat;
      totalFiber += dayFiber;
      totalSpending += dayCost;

      const delta = dayCals - targetCalories;
      let adherenceStatus: "on_target" | "under_target" | "over_target" = "on_target";

      // Allow a ±15% clinical tolerance window for "on_target"
      const tolerance = targetCalories * 0.15;
      if (Math.abs(delta) <= tolerance) {
        adherenceStatus = "on_target";
        onTargetDays++;
      } else if (delta < -tolerance) {
        adherenceStatus = "under_target";
        underTargetDays++;
      } else {
        adherenceStatus = "over_target";
        overTargetDays++;
      }

      dailyTrends.push({
        date: dk,
        dayLabel,
        hasData: true,
        calories: dayCals,
        proteinGrams: Math.round(dayProtein),
        carbsGrams: Math.round(dayCarbs),
        fatGrams: Math.round(dayFat),
        fiberGrams: Math.round(dayFiber),
        estimatedCostIdr: dayCost,
        targetCalories,
        calorieDelta: delta,
        adherenceStatus,
        mealCount: dayMeals.length,
        meals: dayMeals.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          calories: m.calories,
          estimatedCostIdr: m.estimatedCostIdr,
        })),
      });
    }

    // Averages calculated across logged days only (honest non-skewed arithmetic)
    const divisor = Math.max(1, loggedDaysCount);
    const averageDailyCalories = Math.round(totalCalories / divisor);
    const averageProtein = Math.round(totalProtein / divisor);
    const averageCarbs = Math.round(totalCarbs / divisor);
    const averageFat = Math.round(totalFat / divisor);
    const averageFiber = Math.round(totalFiber / divisor);
    const averageDailyCost = Math.round(totalSpending / divisor);
    const averageCostPerMeal = totalMealsInRange > 0 ? Math.round(totalSpending / totalMealsInRange) : 0;

    // Macro percentage ratio across the period
    const totalMacroCalories = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
    const proteinPercentage = totalMacroCalories > 0
      ? Math.round(((totalProtein * 4) / totalMacroCalories) * 100)
      : 25;
    const carbsPercentage = totalMacroCalories > 0
      ? Math.round(((totalCarbs * 4) / totalMacroCalories) * 100)
      : 50;
    const fatPercentage = Math.max(0, 100 - proteinPercentage - carbsPercentage);

    // Target macros (e.g. 25% protein, 50% carbs, 25% fat of target)
    const targetGrams = {
      protein: Math.round((targetCalories * 0.25) / 4),
      carbs: Math.round((targetCalories * 0.5) / 4),
      fat: Math.round((targetCalories * 0.25) / 9),
    };

    // Calculate logging streak (consecutive logged days ending at or near the last day)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const point of dailyTrends) {
      if (point.hasData) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak working backwards from the end
    for (let i = dailyTrends.length - 1; i >= 0; i--) {
      if (dailyTrends[i].hasData) {
        currentStreak++;
      } else {
        // If today has no log yet, don't break immediately if yesterday was logged
        if (i === dailyTrends.length - 1) continue;
        break;
      }
    }

    // Timing distribution
    const sumMeals = Math.max(1, totalMealsInRange);
    const mealTimingDistribution = {
      breakfastPercentage: Math.round((breakfastCount / sumMeals) * 100),
      lunchPercentage: Math.round((lunchCount / sumMeals) * 100),
      dinnerPercentage: Math.round((dinnerCount / sumMeals) * 100),
      snacksPercentage: Math.round((snackCount / sumMeals) * 100),
    };

    const deltaKcal = averageDailyCalories - targetCalories;
    const deltaStatus: "balanced" | "surplus" | "deficit" =
      Math.abs(deltaKcal) <= targetCalories * 0.1
        ? "balanced"
        : deltaKcal > 0
        ? "surplus"
        : "deficit";

    // Adherence score: ratio of on_target days among logged days
    const adherenceScore = loggedDaysCount > 0
      ? Math.round((onTargetDays / loggedDaysCount) * 100)
      : 0;

    const dataCoveragePct = Math.round((loggedDaysCount / dateKeys.length) * 100);

    // Accessible narrative summary for screen-readers & quick human glance
    let narrative = "";
    if (loggedDaysCount === 0) {
      narrative = `No food entries have been logged in the past ${dateKeys.length} days. Log your daily meals in the journal to view nutritional trends and target comparisons.`;
    } else {
      narrative = `Over the past ${dateKeys.length} days, you logged meals on ${loggedDaysCount} days (${dataCoveragePct}% consistency). Your average daily intake was ${averageDailyCalories.toLocaleString("id-ID")} kcal, which is ${
        Math.abs(deltaKcal) === 0
          ? "exactly on target"
          : `${Math.abs(deltaKcal).toLocaleString("id-ID")} kcal ${deltaKcal > 0 ? "above" : "below"} your target of ${targetCalories.toLocaleString("id-ID")} kcal`
      }. Macronutrients averaged ${averageProtein}g protein (${proteinPercentage}%), ${averageCarbs}g carbs (${carbsPercentage}%), and ${averageFat}g healthy fats (${fatPercentage}%).`;
    }

    const insights: string[] = [];
    if (proteinPercentage >= 25) {
      insights.push("Protein distribution is well-calibrated for lean tissue maintenance.");
    } else if (loggedDaysCount > 0) {
      insights.push("Consider increasing lean protein sources (eggs, tempeh, chicken) toward 25% of calories.");
    }

    if (averageFiber >= 25) {
      insights.push("Daily fiber intake meets the clinical minimum recommendation of 25g.");
    } else if (loggedDaysCount > 0) {
      insights.push(`Average fiber intake was ${averageFiber}g/day. Adding chia seeds, lentils, or berries will help reach the recommended 25g threshold.`);
    }

    if (pricedMealsCount > 0) {
      insights.push(`Average estimated spending was Rp ${averageDailyCost.toLocaleString("id-ID")} per logged day (based on ${pricedMealsCount} dishes with price estimates).`);
    }

    return {
      range,
      startDate,
      endDate,
      summary: {
        totalCalories,
        targetCalories,
        averageDailyCalories,
        adherenceScore,
        fiberScore: averageFiber >= 25 ? "Optimal" : "Needs Improvement",
        targetComparison: {
          deltaKcal,
          status: deltaStatus,
          onTargetDays,
          underTargetDays,
          overTargetDays,
        },
      },
      macroDistribution: {
        proteinPercentage,
        carbsPercentage,
        fatPercentage,
        grams: {
          protein: averageProtein,
          carbs: averageCarbs,
          fat: averageFat,
          fiber: averageFiber,
        },
        targetGrams,
      },
      dailyTrends,
      consistency: {
        totalDaysInRange: dateKeys.length,
        loggedDaysCount,
        dataCoveragePercentage: dataCoveragePct,
        totalMealsLogged: totalMealsInRange,
        averageMealsPerLoggedDay: Math.round((totalMealsInRange / divisor) * 10) / 10,
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        mealTimingDistribution,
      },
      spending: {
        totalEstimatedCostIdr: totalSpending,
        averageDailyCostIdr: averageDailyCost,
        averageCostPerMealIdr: averageCostPerMeal,
        pricedMealsCount,
        totalMealsCount: totalMealsInRange,
        pricingCoveragePct: totalMealsInRange > 0 ? Math.round((pricedMealsCount / totalMealsInRange) * 100) : 0,
      },
      narrative,
      insights,
      disclaimer: "Nutrition analytics are calculated exclusively from verified user meal records. Days with no logged entries are excluded from caloric averages to prevent artificial deflation. This report is for lifestyle wellness guidance and does not replace medical diagnostics.",
    };
  }
}
