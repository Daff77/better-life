import {
  buildLocalDateWindow,
  formatLocalDateKey,
} from "@better-life/shared";
import { API_BASE_URL } from "./config";
import {
  DateRangeOption,
  AdvancedAnalyticsResponse,
  DailyAnalyticsPoint,
} from "../analyticsDomain";
import { sessionStorage } from "../sessionStorage";
import { journalStorage } from "../journalStorage";
import { accountRevision } from "../accountScope";
import { notifyUnauthorizedSession } from "../authToken";

export interface WeeklySummaryDigest {
  startDate: string;
  endDate: string;
  loggedDaysCount: number;
  totalMealsLogged: number;
  averageDailyCalories: number;
  targetCalories: number;
  deltaKcal: number;
  averageProteinGrams: number;
  averageCarbsGrams: number;
  averageFatGrams: number;
  currentStreakDays: number;
  totalSteps: number;
  totalWaterGlasses: number;
  dailyTrends: DailyAnalyticsPoint[];
}

export const analyticsApi = {
  /**
   * Fetch advanced nutrition analytics from backend.
   * Falls back to local computation using identical local calendar date rules when offline.
   */
  async getAdvancedAnalytics(
    range: DateRangeOption = "7d",
    startDate?: string,
    endDate?: string,
    referenceDate?: Date | string
  ): Promise<AdvancedAnalyticsResponse> {
    if (range === "custom") {
      // Validate custom date window upfront (throws descriptive error if invalid or start > end)
      buildLocalDateWindow("custom", startDate, endDate, referenceDate);
    }

    const rev = accountRevision();
    const session = await sessionStorage.getSession();
    const token = session?.token;
    const localToday = formatLocalDateKey(referenceDate || new Date());

    if (token) {
      try {
        const queryParams = new URLSearchParams({ range, today: localToday });
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);

        const res = await fetch(
          `${API_BASE_URL}/analytics/advanced?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 401) {
          await notifyUnauthorizedSession(rev);
          throw new Error("Sesi telah berakhir.");
        }

        if (res.ok) {
          const data: AdvancedAnalyticsResponse = await res.json();
          return data;
        }
      } catch (err: any) {
        if (err?.message === "Sesi telah berakhir.") {
          throw err;
        }
        // Offline or non-200 fallback to honest local computation
      }
    }

    return this.computeLocalAnalytics(range, startDate, endDate, referenceDate);
  },

  /**
   * Fetch 7-day real weekly summary digest (available to all users, online & offline).
   */
  async getWeeklySummary(referenceDate?: Date | string): Promise<WeeklySummaryDigest> {
    const rev = accountRevision();
    const session = await sessionStorage.getSession();
    const token = session?.token;
    const localToday = formatLocalDateKey(referenceDate || new Date());

    if (token) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/analytics/weekly-summary?today=${encodeURIComponent(localToday)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 401) {
          await notifyUnauthorizedSession(rev);
        } else if (res.ok) {
          return (await res.json()) as WeeklySummaryDigest;
        }
      } catch {
        // Fallback to local weekly summary computation
      }
    }

    const local = await this.computeLocalAnalytics("7d", undefined, undefined, referenceDate);
    let totalSteps = 0;
    let totalWaterGlasses = 0;

    try {
      const { activityApi } = require("./activityApi");
      const accountEmail = session?.user?.email || (session as any)?.email || "signed-out";
      for (const pt of local.dailyTrends) {
        const stats = await activityApi.getActivityStats(accountEmail, pt.date);
        totalSteps += stats.steps || 0;
        totalWaterGlasses += stats.waterGlasses || 0;
      }
    } catch {
      // ignore activity lookup error
    }

    return {
      startDate: local.startDate,
      endDate: local.endDate,
      loggedDaysCount: local.consistency.loggedDaysCount,
      totalMealsLogged: local.consistency.totalMealsLogged,
      averageDailyCalories: local.summary.averageDailyCalories,
      targetCalories: local.summary.targetCalories,
      deltaKcal: local.summary.targetComparison.deltaKcal,
      averageProteinGrams: local.macroDistribution.grams.protein,
      averageCarbsGrams: local.macroDistribution.grams.carbs,
      averageFatGrams: local.macroDistribution.grams.fat,
      currentStreakDays: local.consistency.currentStreakDays,
      totalSteps,
      totalWaterGlasses,
      dailyTrends: local.dailyTrends,
    };
  },

  /**
   * Export user nutrition report as CSV string or JSON payload.
   */
  async exportNutritionData(format: "csv" | "json" = "json"): Promise<string | object> {
    const rev = accountRevision();
    const session = await sessionStorage.getSession();
    const token = session?.token;

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/export?format=${format}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          await notifyUnauthorizedSession(rev);
        } else if (res.ok) {
          if (format === "csv") {
            return await res.text();
          }
          return await res.json();
        }
      } catch {
        // Fallback silently to local export
      }
    }

    const sanitizeCsvCell = (val: unknown) => {
      const raw = String(val ?? "");
      const neutralized = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return neutralized.replace(/"/g, '""');
    };

    const journals = await journalStorage.getJournals();
    if (format === "csv") {
      let csv = "ID,Name,Type,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Quantity,Date\n";
      Object.values(journals).forEach((j) => {
        j.entries.forEach((m) => {
          csv += `"${sanitizeCsvCell(m.id)}","${sanitizeCsvCell(m.title)}","${sanitizeCsvCell(m.category)}",${m.calories},${m.proteinGrams || 0},${m.carbsGrams || 0},${m.fatGrams || 0},${m.fiberGrams || 0},${m.quantity || 1},"${sanitizeCsvCell(j.date)}"\n`;
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
   * using local calendar dates consistently across 7d, 30d, and custom windows.
   */
  async computeLocalAnalytics(
    range: DateRangeOption,
    customStart?: string,
    customEnd?: string,
    referenceDate?: Date | string
  ): Promise<AdvancedAnalyticsResponse> {
    const dateKeys = buildLocalDateWindow(
      range,
      customStart,
      customEnd,
      referenceDate || new Date()
    );
    const daysCount = dateKeys.length;
    const journals = await journalStorage.getJournals();

    let targetCalories = 2000;
    let targetProteinGrams = Math.round((2000 * 0.25) / 4);
    let targetCarbsGrams = Math.round((2000 * 0.5) / 4);
    let targetFatGrams = Math.round((2000 * 0.25) / 9);

    try {
      const { useOnboardingStore } = require("../../stores/useOnboardingStore");
      const profile = useOnboardingStore.getState().personalization;
      if (profile?.targetCalories && profile.targetCalories > 0) {
        targetCalories = profile.targetCalories;
      }
      if (profile?.targetProteinGrams) targetProteinGrams = profile.targetProteinGrams;
      if (profile?.targetCarbGrams) targetCarbsGrams = profile.targetCarbGrams;
      if (profile?.targetFatGrams) targetFatGrams = profile.targetFatGrams;
    } catch {
      // safe fallback
    }

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const startDate = dateKeys[0] || "";
    const endDate = dateKeys[dateKeys.length - 1] || "";

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
      const dObj = new Date(`${dk}T12:00:00Z`);
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
        const cost = m.estimatedCostIdr || 0;

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
        proteinGrams: Math.round(dayP * 10) / 10,
        carbsGrams: Math.round(dayC * 10) / 10,
        fatGrams: Math.round(dayF * 10) / 10,
        fiberGrams: Math.round(dayFib * 10) / 10,
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
    const avgProtein = loggedDaysCount > 0 ? Math.round(totalProtein / divisor) : 0;
    const avgCarbs = loggedDaysCount > 0 ? Math.round(totalCarbs / divisor) : 0;
    const avgFat = loggedDaysCount > 0 ? Math.round(totalFat / divisor) : 0;
    const avgFiber = loggedDaysCount > 0 ? Math.round(totalFiber / divisor) : 0;
    const avgDelta = loggedDaysCount > 0 ? averageDailyCalories - targetCalories : 0;

    const macroKcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
    const proteinPercentage =
      macroKcal > 0 ? Math.round(((totalProtein * 4) / macroKcal) * 100) : 25;
    const carbsPercentage =
      macroKcal > 0 ? Math.round(((totalCarbs * 4) / macroKcal) * 100) : 50;
    const fatPercentage =
      macroKcal > 0 ? Math.max(0, 100 - proteinPercentage - carbsPercentage) : 25;

    const adherenceScore =
      loggedDaysCount > 0 ? Math.round((onTargetDays / loggedDaysCount) * 100) : 0;

    // Real streak calculation across the date window
    let currentStreakDays = 0;
    let longestStreakDays = 0;
    let tempStreak = 0;
    for (const pt of dailyTrends) {
      if (pt.hasData) {
        tempStreak++;
        if (tempStreak > longestStreakDays) longestStreakDays = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    for (let i = dailyTrends.length - 1; i >= 0; i--) {
      if (dailyTrends[i].hasData) {
        currentStreakDays++;
      } else {
        if (i === dailyTrends.length - 1) continue;
        break;
      }
    }

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
        totalCalories: Math.round(totalCalories),
        targetCalories,
        averageDailyCalories,
        adherenceScore,
        fiberScore: avgFiber >= 25 ? "Optimal" : "Needs Improvement",
        targetComparison: {
          deltaKcal: avgDelta,
          status:
            Math.abs(avgDelta) <= targetCalories * 0.1
              ? "balanced"
              : avgDelta > 0
              ? "surplus"
              : "deficit",
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
          protein: avgProtein,
          carbs: avgCarbs,
          fat: avgFat,
          fiber: avgFiber,
        },
        targetGrams: {
          protein: targetProteinGrams,
          carbs: targetCarbsGrams,
          fat: targetFatGrams,
        },
      },
      dailyTrends,
      consistency: {
        totalDaysInRange: daysCount,
        loggedDaysCount,
        dataCoveragePercentage:
          daysCount > 0 ? Math.round((loggedDaysCount / daysCount) * 100) : 0,
        totalMealsLogged,
        averageMealsPerLoggedDay:
          loggedDaysCount > 0
            ? Math.round((totalMealsLogged / loggedDaysCount) * 10) / 10
            : 0,
        currentStreakDays,
        longestStreakDays,
        mealTimingDistribution: {
          breakfastPercentage: bPct,
          lunchPercentage: lPct,
          dinnerPercentage: dPct,
          snacksPercentage: sPct,
        },
      },
      spending: {
        totalEstimatedCostIdr: totalSpending,
        averageDailyCostIdr:
          loggedDaysCount > 0 ? Math.round(totalSpending / loggedDaysCount) : 0,
        averageCostPerMealIdr:
          pricedMealsCount > 0 ? Math.round(totalSpending / pricedMealsCount) : 0,
        pricedMealsCount,
        totalMealsCount: totalMealsLogged,
        pricingCoveragePct:
          totalMealsLogged > 0 ? Math.round((pricedMealsCount / totalMealsLogged) * 100) : 0,
      },
      narrative:
        loggedDaysCount === 0
          ? `Belum ada makanan yang dicatat dalam ${daysCount} hari ini. Catat menu harian di jurnal untuk melihat tren nutrisi.`
          : `Dalam ${daysCount} hari (${startDate} s/d ${endDate}), Anda mencatat makanan pada ${loggedDaysCount} hari (${Math.round((loggedDaysCount / Math.max(1, daysCount)) * 100)}% konsistensi) dengan rata-rata ${averageDailyCalories.toLocaleString("id-ID")} kcal terhadap target ${targetCalories.toLocaleString("id-ID")} kcal.`,
      insights:
        loggedDaysCount === 0
          ? ["Mulai catat menu sarapan, makan siang, atau makan malam untuk membangun analisis nyata."]
          : [
              `Rata-rata protein harian ${avgProtein}g (${proteinPercentage}% dari total energi).`,
              avgFiber >= 25
                ? `Rata-rata serat ${avgFiber}g/hari sudah memenuhi rekomendasi 25g.`
                : `Rata-rata serat ${avgFiber}g/hari; tambahkan sayur, buah, atau kacang-kacangan menuju 25g.`,
            ],
      disclaimer: "Dihitung murni dari catatan jurnal Anda tanpa data buatan.",
    };
  },
};
