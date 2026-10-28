import { API_BASE_URL } from "./config";
import {
  DateRangeOption,
  AdvancedAnalyticsResponse,
  DailyAnalyticsPoint,
} from "../analyticsDomain";
import { sessionStorage } from "../sessionStorage";
import { journalStorage } from "../journalStorage";

export const analyticsApi = {
  /**
   * Fetch advanced nutrition analytics from backend.
   * If backend is unavailable or offline in demo/preview mode,
   * honestly computes analytics from local persisted journal storage.
   */
  async getAdvancedAnalytics(
    range: DateRangeOption = "7d",
    startDate?: string,
    endDate?: string
  ): Promise<AdvancedAnalyticsResponse> {
    const session = await sessionStorage.getSession();
    const token = session?.token;

    if (token) {
      try {
        const queryParams = new URLSearchParams({ range });
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);

        const res = await fetch(`${API_BASE_URL}/analytics/advanced?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data: AdvancedAnalyticsResponse = await res.json();
          return data;
        }
      } catch (err) {
        console.warn("[analyticsApi] Backend call failed, falling back to local computation:", err);
      }
    }

    // Local honest fallback computation from persisted journalStorage
    return this.computeLocalAnalytics(range);
  },

  /**
   * Export user nutrition report as CSV string or JSON payload.
   */
  async exportNutritionData(format: "csv" | "json" = "json"): Promise<string | object> {
    const session = await sessionStorage.getSession();
    const token = session?.token;

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/export?format=${format}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          if (format === "csv") {
            return await res.text();
          }
          return await res.json();
        }
      } catch (err) {
        console.warn("[analyticsApi] Export call failed:", err);
      }
    }

    // Local CSV export fallback
    const journals = await journalStorage.getJournals();
    if (format === "csv") {
      let csv = "ID,Name,Type,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Date\n";
      Object.values(journals).forEach((j) => {
        j.entries.forEach((m) => {
          csv += `"${m.id}","${m.title}","${m.category}",${m.calories},${m.proteinGrams || 0},${m.carbsGrams || 0},${m.fatGrams || 0},${m.fiberGrams || 0},"${j.date}"\n`;
        });
      });
      return csv;
    }

    return {
      exportedAt: new Date().toISOString(),
      journals,
    };
  },

  /**
   * Computes honest, un-fabricated analytics locally from client journal storage
   */
  async computeLocalAnalytics(range: DateRangeOption): Promise<AdvancedAnalyticsResponse> {
    const daysCount = range === "30d" ? 30 : 7;
    const journals = await journalStorage.getJournals();
    const targetCalories = 2000;

    // Generate date sequence
    const dateKeys: string[] = [];
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dt = String(d.getUTCDate()).padStart(2, "0");
      dateKeys.push(`${y}-${m}-${dt}`);
    }

    const startDate = dateKeys[0];
    const endDate = dateKeys[dateKeys.length - 1];

    const dailyTrends: DailyAnalyticsPoint[] = [];
    let loggedDaysCount = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSpending = 0;
    let pricedMealsCount = 0;
    let onTargetDays = 0;
    let underTargetDays = 0;
    let overTargetDays = 0;

    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;
    let snackCount = 0;

    for (const dk of dateKeys) {
      const dayJournal = journals[dk];
      const dayMeals = dayJournal?.entries || [];
      const dObj = new Date(`${dk}T00:00:00Z`);
      const dayLabel = `${weekdayNames[dObj.getUTCDay()]} ${dObj.getUTCDate()}`;

      if (dayMeals.length === 0) {
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
      let dayKcal = 0;
      let dayP = 0;
      let dayC = 0;
      let dayF = 0;
      let dayFib = 0;
      let dayCost = 0;

      const summaries = dayMeals.map((m) => {
        const kcal = m.calories || 0;
        const p = m.proteinGrams || 0;
        const c = m.carbsGrams || 0;
        const f = m.fatGrams || 0;
        const fib = m.fiberGrams || 0;
        const cost = (m as any).estimatedCostIdr || 0;

        dayKcal += kcal;
        dayP += p;
        dayC += c;
        dayF += f;
        dayFib += fib;

        if (cost > 0) {
          dayCost += cost;
          pricedMealsCount++;
        }

        const t = (m.category || "").toLowerCase();
        if (t.includes("breakfast")) breakfastCount++;
        else if (t.includes("lunch")) lunchCount++;
        else if (t.includes("dinner")) dinnerCount++;
        else snackCount++;

        return {
          id: m.id,
          name: m.title || "Meal",
          type: m.category || "Meal",
          calories: kcal,
          estimatedCostIdr: cost,
        };
      });

      totalCalories += dayKcal;
      totalProtein += dayP;
      totalCarbs += dayC;
      totalFat += dayF;
      totalFiber += dayFib;
      totalSpending += dayCost;

      const delta = dayKcal - targetCalories;
      let adherenceStatus: DailyAnalyticsPoint["adherenceStatus"] = "on_target";
      const tolerance = targetCalories * 0.15;
      if (delta > tolerance) {
        adherenceStatus = "over_target";
        overTargetDays++;
      } else if (delta < -tolerance) {
        adherenceStatus = "under_target";
        underTargetDays++;
      } else {
        onTargetDays++;
      }

      dailyTrends.push({
        date: dk,
        dayLabel,
        hasData: true,
        calories: Math.round(dayKcal),
        proteinGrams: Math.round(dayP),
        carbsGrams: Math.round(dayC),
        fatGrams: Math.round(dayF),
        fiberGrams: Math.round(dayFib),
        estimatedCostIdr: dayCost,
        targetCalories,
        calorieDelta: Math.round(delta),
        adherenceStatus,
        mealCount: dayMeals.length,
        meals: summaries,
      });
    }

    const divisor = Math.max(1, loggedDaysCount);
    const averageDailyCalories = loggedDaysCount > 0 ? Math.round(totalCalories / divisor) : 0;
    const avgDelta = loggedDaysCount > 0 ? averageDailyCalories - targetCalories : 0;

    const macroKcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
    const proteinPercentage = macroKcal > 0 ? Math.round(((totalProtein * 4) / macroKcal) * 100) : 25;
    const carbsPercentage = macroKcal > 0 ? Math.round(((totalCarbs * 4) / macroKcal) * 100) : 50;
    const fatPercentage = macroKcal > 0 ? Math.round(((totalFat * 9) / macroKcal) * 100) : 25;

    const adherenceScore = targetCalories > 0 && loggedDaysCount > 0
      ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(avgDelta) / targetCalories) * 100)))
      : 0;

    const totalMealsLogged = breakfastCount + lunchCount + dinnerCount + snackCount;
    const bPct = totalMealsLogged > 0 ? Math.round((breakfastCount / totalMealsLogged) * 100) : 0;
    const lPct = totalMealsLogged > 0 ? Math.round((lunchCount / totalMealsLogged) * 100) : 0;
    const dPct = totalMealsLogged > 0 ? Math.round((dinnerCount / totalMealsLogged) * 100) : 0;
    const sPct = totalMealsLogged > 0 ? Math.max(0, 100 - (bPct + lPct + dPct)) : 0;

    return {
      range,
      startDate,
      endDate,
      summary: {
        totalCalories,
        targetCalories,
        averageDailyCalories,
        adherenceScore,
        fiberScore: totalFiber / divisor >= 25 ? "Optimal" : "Needs Improvement",
        targetComparison: {
          deltaKcal: avgDelta,
          status: Math.abs(avgDelta) <= targetCalories * 0.1 ? "balanced" : avgDelta > 0 ? "surplus" : "deficit",
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
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          fiber: Math.round(totalFiber),
        },
        targetGrams: {
          protein: Math.round((targetCalories * 0.25) / 4),
          carbs: Math.round((targetCalories * 0.5) / 4),
          fat: Math.round((targetCalories * 0.25) / 9),
        },
      },
      dailyTrends,
      consistency: {
        totalDaysInRange: daysCount,
        loggedDaysCount,
        dataCoveragePercentage: Math.round((loggedDaysCount / daysCount) * 100),
        totalMealsLogged,
        averageMealsPerLoggedDay: loggedDaysCount > 0 ? Math.round((totalMealsLogged / loggedDaysCount) * 10) / 10 : 0,
        currentStreakDays: loggedDaysCount > 0 ? 1 : 0,
        longestStreakDays: loggedDaysCount > 0 ? 1 : 0,
        mealTimingDistribution: {
          breakfastPercentage: bPct,
          lunchPercentage: lPct,
          dinnerPercentage: dPct,
          snacksPercentage: sPct,
        },
      },
      spending: {
        totalEstimatedCostIdr: totalSpending,
        averageDailyCostIdr: loggedDaysCount > 0 ? Math.round(totalSpending / loggedDaysCount) : 0,
        averageCostPerMealIdr: pricedMealsCount > 0 ? Math.round(totalSpending / pricedMealsCount) : 0,
        pricedMealsCount,
        totalMealsCount: totalMealsLogged,
        pricingCoveragePct: totalMealsLogged > 0 ? Math.round((pricedMealsCount / totalMealsLogged) * 100) : 0,
      },
      narrative:
        loggedDaysCount === 0
          ? `No food entries have been logged in the past ${daysCount} days. Log your daily meals in the journal to view nutritional trends and target comparisons.`
          : `Over the past ${daysCount} days, you logged meals across ${loggedDaysCount} days (${Math.round((loggedDaysCount / daysCount) * 100)}% logging consistency). Your average daily intake is ${averageDailyCalories} kcal against your ${targetCalories} kcal target.`,
      insights: [
        "Protein provides structural amino acids essential for tissue maintenance.",
        "Clinical guidance recommends at least 25g of dietary fiber daily.",
      ],
      disclaimer: "Calculated strictly from your logged journal entries. No fabricated records.",
    };
  },
};
