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
  dayLabel: string; // "Mon 24"
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

export function shiftCalendarDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  const ry = utcNoon.getUTCFullYear();
  const rm = String(utcNoon.getUTCMonth() + 1).padStart(2, "0");
  const rd = String(utcNoon.getUTCDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

export class AnalyticsEngine {
  /**
   * Formats a Date into local calendar YYYY-MM-DD consistently across midnight boundaries.
   */
  public static formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates continuous local calendar date strings for the requested window.
   */
  public static generateDateKeys(
    range: "7d" | "30d" | "custom",
    customStart?: string,
    customEnd?: string,
    referenceDate: Date | string = new Date()
  ): string[] {
    if (range === "custom" && customStart && customEnd) {
      if (customStart > customEnd) {
        return [];
      }
      const dateKeys: string[] = [];
      let cursor = customStart;
      let guard = 0;
      while (cursor <= customEnd && guard < 731) {
        dateKeys.push(cursor);
        cursor = shiftCalendarDateKey(cursor, 1);
        guard++;
      }
      return dateKeys;
    }

    const daysCount = range === "30d" ? 30 : 7;
    const endKey =
      typeof referenceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)
        ? referenceDate
        : this.formatDateKey(
            referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
          );

    const dateKeys: string[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      dateKeys.push(shiftCalendarDateKey(endKey, -i));
    }
    return dateKeys;
  }

  public static computeAnalytics(
    userId: string,
    allUserMeals: LoggedMealRecord[],
    targetCalories = 2000,
    range: "7d" | "30d" | "custom" = "7d",
    customStart?: string,
    customEnd?: string,
    referenceDate: Date | string = new Date()
  ): AdvancedAnalyticsResponse {
    const dateKeys = this.generateDateKeys(range, customStart, customEnd, referenceDate);
    const startDate = dateKeys[0] || "";
    const endDate = dateKeys[dateKeys.length - 1] || "";

    const mealsByDate = new Map<string, LoggedMealRecord[]>();
    for (const dk of dateKeys) {
      mealsByDate.set(dk, []);
    }

    let totalMealsInRange = 0;
    let pricedMealsCount = 0;

    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;
    let snackCount = 0;

    for (const m of allUserMeals) {
      if (m.userId !== userId) continue;

      const mDate =
        m.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(m.dateKey)
          ? m.dateKey
          : m.loggedAt instanceof Date
          ? this.formatDateKey(m.loggedAt)
          : /^\d{4}-\d{2}-\d{2}/.test(String(m.loggedAt))
          ? this.formatDateKey(new Date(m.loggedAt))
          : "";

      if (mealsByDate.has(mDate)) {
        mealsByDate.get(mDate)!.push(m);
        totalMealsInRange++;

        if ((m.estimatedCostIdr || 0) > 0) {
          pricedMealsCount++;
        }

        const t = (m.type || "").toLowerCase();
        if (t.includes("breakfast")) breakfastCount++;
        else if (t.includes("lunch")) lunchCount++;
        else if (t.includes("dinner")) dinnerCount++;
        else snackCount++;
      }
    }

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
      const dObj = new Date(`${dk}T12:00:00Z`);
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
        calories: Math.round(dayCals),
        proteinGrams: Math.round(dayProtein * 10) / 10,
        carbsGrams: Math.round(dayCarbs * 10) / 10,
        fatGrams: Math.round(dayFat * 10) / 10,
        fiberGrams: Math.round(dayFiber * 10) / 10,
        estimatedCostIdr: dayCost,
        targetCalories,
        calorieDelta: Math.round(delta),
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

    const divisor = Math.max(1, loggedDaysCount);
    const averageDailyCalories = loggedDaysCount > 0 ? Math.round(totalCalories / divisor) : 0;
    const averageProtein = loggedDaysCount > 0 ? Math.round(totalProtein / divisor) : 0;
    const averageCarbs = loggedDaysCount > 0 ? Math.round(totalCarbs / divisor) : 0;
    const averageFat = loggedDaysCount > 0 ? Math.round(totalFat / divisor) : 0;
    const averageFiber = loggedDaysCount > 0 ? Math.round(totalFiber / divisor) : 0;
    const averageDailyCost = loggedDaysCount > 0 ? Math.round(totalSpending / divisor) : 0;
    const averageCostPerMeal =
      totalMealsInRange > 0 ? Math.round(totalSpending / totalMealsInRange) : 0;

    const totalMacroCalories = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
    const proteinPercentage =
      totalMacroCalories > 0 ? Math.round(((totalProtein * 4) / totalMacroCalories) * 100) : 25;
    const carbsPercentage =
      totalMacroCalories > 0 ? Math.round(((totalCarbs * 4) / totalMacroCalories) * 100) : 50;
    const fatPercentage = Math.max(0, 100 - proteinPercentage - carbsPercentage);

    const targetGrams = {
      protein: Math.round((targetCalories * 0.25) / 4),
      carbs: Math.round((targetCalories * 0.5) / 4),
      fat: Math.round((targetCalories * 0.25) / 9),
    };

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

    for (let i = dailyTrends.length - 1; i >= 0; i--) {
      if (dailyTrends[i].hasData) {
        currentStreak++;
      } else {
        if (i === dailyTrends.length - 1) continue;
        break;
      }
    }

    const sumMeals = Math.max(1, totalMealsInRange);
    const mealTimingDistribution = {
      breakfastPercentage: Math.round((breakfastCount / sumMeals) * 100),
      lunchPercentage: Math.round((lunchCount / sumMeals) * 100),
      dinnerPercentage: Math.round((dinnerCount / sumMeals) * 100),
      snacksPercentage: Math.round((snackCount / sumMeals) * 100),
    };

    const deltaKcal = loggedDaysCount > 0 ? averageDailyCalories - targetCalories : 0;
    const deltaStatus: "balanced" | "surplus" | "deficit" =
      Math.abs(deltaKcal) <= targetCalories * 0.1
        ? "balanced"
        : deltaKcal > 0
        ? "surplus"
        : "deficit";

    const adherenceScore =
      loggedDaysCount > 0 ? Math.round((onTargetDays / loggedDaysCount) * 100) : 0;

    const totalDaysLen = Math.max(1, dateKeys.length);
    const dataCoveragePct =
      dateKeys.length > 0 ? Math.round((loggedDaysCount / totalDaysLen) * 100) : 0;

    let narrative = "";
    if (loggedDaysCount === 0) {
      narrative = `No food entries have been logged in the past ${dateKeys.length} days. Log your daily meals in the journal to view nutritional trends and target comparisons.`;
    } else {
      narrative = `Over the past ${dateKeys.length} days, you logged meals on ${loggedDaysCount} days (${dataCoveragePct}% consistency). Your average daily intake was ${averageDailyCalories.toLocaleString("id-ID")} kcal, which is ${
        Math.abs(deltaKcal) === 0
          ? "exactly on target"
          : `${Math.abs(deltaKcal).toLocaleString("id-ID")} kcal ${
              deltaKcal > 0 ? "above" : "below"
            } your target of ${targetCalories.toLocaleString("id-ID")} kcal`
      }. Macronutrients averaged ${averageProtein}g protein (${proteinPercentage}%), ${averageCarbs}g carbs (${carbsPercentage}%), and ${averageFat}g healthy fats (${fatPercentage}%).`;
    }

    const insights: string[] = [];
    if (proteinPercentage >= 25) {
      insights.push("Protein distribution is well-calibrated for lean tissue maintenance.");
    } else if (loggedDaysCount > 0) {
      insights.push(
        "Consider increasing lean protein sources (eggs, tempeh, chicken) toward 25% of calories."
      );
    }

    if (averageFiber >= 25) {
      insights.push("Daily fiber intake meets the clinical minimum recommendation of 25g.");
    } else if (loggedDaysCount > 0) {
      insights.push(
        `Average fiber intake was ${averageFiber}g/day. Adding chia seeds, lentils, or berries will help reach the recommended 25g threshold.`
      );
    }

    if (pricedMealsCount > 0) {
      insights.push(
        `Average estimated spending was Rp ${averageDailyCost.toLocaleString("id-ID")} per logged day (based on ${pricedMealsCount} dishes with price estimates).`
      );
    }

    return {
      range,
      startDate,
      endDate,
      summary: {
        totalCalories: Math.round(totalCalories),
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
        averageMealsPerLoggedDay:
          loggedDaysCount > 0 ? Math.round((totalMealsInRange / divisor) * 10) / 10 : 0,
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
        pricingCoveragePct:
          totalMealsInRange > 0 ? Math.round((pricedMealsCount / totalMealsInRange) * 100) : 0,
      },
      narrative,
      insights,
      disclaimer:
        "Nutrition analytics are calculated exclusively from verified user meal records. Days with no logged entries are excluded from caloric averages to prevent artificial deflation. This report is for lifestyle wellness guidance and does not replace medical diagnostics.",
    };
  }
}
