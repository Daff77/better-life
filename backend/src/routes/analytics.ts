import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { Entitlement } from "../types/subscription.js";
import { mealRepository, profileRepository, activityRepository } from "../repositories/index.js";
import { AnalyticsEngine } from "../services/analyticsEngine.js";
import { AnalyticsQuerySchema } from "../schemas/validation.js";

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

function resolveReferenceDate(todayParam?: string): string {
  if (todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)) {
    return todayParam;
  }
  return AnalyticsEngine.formatDateKey(new Date());
}

// 0. GET /api/analytics/weekly-summary — Core weekly digest from real logged entries (All authenticated users)
analyticsRouter.get(
  "/weekly-summary",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const todayParam = typeof req.query.today === "string" ? req.query.today : undefined;
    const refDate = resolveReferenceDate(todayParam);

    const [meals, profile, activities] = await Promise.all([
      mealRepository.listByUser(userId),
      profileRepository.findByUserId(userId),
      activityRepository.listByUser(userId),
    ]);

    const targetCalories = profile?.targetCalories || 2000;
    const weekly = AnalyticsEngine.computeAnalytics(
      userId,
      meals,
      targetCalories,
      "7d",
      undefined,
      undefined,
      refDate
    );

    const dateKeySet = new Set(weekly.dailyTrends.map((d) => d.date));
    const weekActivities = activities.filter((a) => dateKeySet.has(a.date));
    const totalSteps = weekActivities.reduce((sum, a) => sum + a.steps, 0);
    const totalWaterGlasses = weekActivities.reduce((sum, a) => sum + a.waterGlasses, 0);

    return res.json({
      startDate: weekly.startDate,
      endDate: weekly.endDate,
      loggedDaysCount: weekly.consistency.loggedDaysCount,
      totalMealsLogged: weekly.consistency.totalMealsLogged,
      averageDailyCalories: weekly.summary.averageDailyCalories,
      targetCalories,
      deltaKcal: weekly.summary.targetComparison.deltaKcal,
      averageProteinGrams: weekly.macroDistribution.grams.protein,
      averageCarbsGrams: weekly.macroDistribution.grams.carbs,
      averageFatGrams: weekly.macroDistribution.grams.fat,
      currentStreakDays: weekly.consistency.currentStreakDays,
      totalSteps,
      totalWaterGlasses,
      dailyTrends: weekly.dailyTrends,
    });
  })
);

// 1. GET /api/analytics/advanced — Advanced macro & micronutrient breakdown & trends
analyticsRouter.get(
  "/advanced",
  requireEntitlement(Entitlement.ADVANCED_ANALYTICS),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const parseResult = AnalyticsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "INVALID_QUERY_PARAMS",
        details: parseResult.error.errors,
      });
    }

    const { range = "7d", startDate, endDate, today } = parseResult.data;
    if (range === "custom" && startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        error: "INVALID_QUERY_PARAMS",
        message: "startDate must not be after endDate.",
      });
    }

    const [meals, profile] = await Promise.all([
      mealRepository.listByUser(userId),
      profileRepository.findByUserId(userId),
    ]);
    const targetCalories = profile?.targetCalories || 2000;
    const refDate = resolveReferenceDate(today);

    const analytics = AnalyticsEngine.computeAnalytics(
      userId,
      meals,
      targetCalories,
      range,
      startDate,
      endDate,
      refDate
    );

    return res.json({
      ...analytics,
      mealTimingDistribution: analytics.consistency.mealTimingDistribution,
    });
  })
);

// 2. GET /api/analytics/reports — Weekly and monthly comprehensive nutrition reports
analyticsRouter.get(
  "/reports",
  requireEntitlement(Entitlement.NUTRITION_REPORTS),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const todayParam = typeof req.query.today === "string" ? req.query.today : undefined;
    const [meals, profile] = await Promise.all([
      mealRepository.listByUser(userId),
      profileRepository.findByUserId(userId),
    ]);
    const targetCalories = profile?.targetCalories || 2000;

    const analytics = AnalyticsEngine.computeAnalytics(
      userId,
      meals,
      targetCalories,
      "7d",
      undefined,
      undefined,
      resolveReferenceDate(todayParam)
    );

    const dailyBreakdown = analytics.dailyTrends.map((point) => ({
      date: point.date,
      day: point.dayLabel,
      calories: point.calories,
      proteinGrams: point.proteinGrams,
      carbsGrams: point.carbsGrams,
      fatGrams: point.fatGrams,
      hasData: point.hasData,
      goalMet: point.adherenceStatus === "on_target",
    }));

    const dailyDelta = analytics.summary.targetComparison.deltaKcal;
    const estimatedWeightDeltaKg = Math.round(((dailyDelta * 30) / 7700) * 100) / 100;

    return res.json({
      period: "weekly",
      loggedEntriesCount: analytics.consistency.totalMealsLogged,
      loggedDaysCount: analytics.consistency.loggedDaysCount,
      averageDailyCalories: analytics.summary.averageDailyCalories,
      weeklyConsistencyScore: analytics.consistency.dataCoveragePercentage,
      currentStreakDays: analytics.consistency.currentStreakDays,
      dailyBreakdown,
      spending: analytics.spending,
      monthlyProjection: {
        estimatedWeightDeltaKg,
        targetConsistencyDays: Math.round((analytics.consistency.dataCoveragePercentage / 100) * 30),
      },
      narrative: analytics.narrative,
      insights: analytics.insights,
    });
  })
);

// 3. GET /api/analytics/export — Exportable nutrition reports
analyticsRouter.get(
  "/export",
  requireEntitlement(Entitlement.EXPORT_REPORTS),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const format = req.query.format === "csv" ? "csv" : "json";
    const meals = await mealRepository.listByUser(userId);

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="better_life_nutrition_export.csv"'
      );
      let csv =
        "ID,Name,Type,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Quantity,DateKey,Time,LoggedAt\n";
      meals.forEach((m) => {
        const safeName = String(m.name).replace(/"/g, '""');
        csv += `"${m.id}","${safeName}","${m.type}",${m.calories},${m.proteinGrams || 0},${m.carbsGrams || 0},${m.fatGrams || 0},${m.fiberGrams || 0},${m.quantity || 1},"${m.dateKey}","${m.time}","${new Date(m.loggedAt).toISOString()}"\n`;
      });
      return res.send(csv);
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      userId,
      format: "json",
      totalEntries: meals.length,
      data: meals,
    });
  })
);
