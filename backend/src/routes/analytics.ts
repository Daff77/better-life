import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { Entitlement } from "../types/subscription.js";
import { inMemoryStore } from "../services/store.js";
import { AnalyticsEngine } from "../services/analyticsEngine.js";
import { AnalyticsQuerySchema } from "../schemas/validation.js";

export const analyticsRouter = Router();

// Apply base authentication to all analytics endpoints
analyticsRouter.use(authMiddleware);

// 1. GET /api/analytics/advanced — Advanced macro & micronutrient breakdown & trends
analyticsRouter.get(
  "/advanced",
  requireEntitlement(Entitlement.ADVANCED_ANALYTICS),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Validate query parameters
    const parseResult = AnalyticsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "INVALID_QUERY_PARAMS",
        details: parseResult.error.errors,
      });
    }

    const { range = "7d", startDate, endDate } = parseResult.data;
    const meals = inMemoryStore.loggedMeals.get(userId) || [];
    const profile = inMemoryStore.profiles.get(userId);
    const targetCalories = profile?.targetCalories || 2000;

    const analytics = AnalyticsEngine.computeAnalytics(
      userId,
      meals,
      targetCalories,
      range,
      startDate,
      endDate
    );

    // Return full analytics payload with top-level backwards compatibility
    return res.json({
      ...analytics,
      mealTimingDistribution: analytics.consistency.mealTimingDistribution,
    });
  }
);

// 2. GET /api/analytics/reports — Weekly and monthly comprehensive nutrition reports based on real user data
analyticsRouter.get(
  "/reports",
  requireEntitlement(Entitlement.NUTRITION_REPORTS),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meals = inMemoryStore.loggedMeals.get(userId) || [];
    const profile = inMemoryStore.profiles.get(userId);
    const targetCalories = profile?.targetCalories || 2000;

    const analytics = AnalyticsEngine.computeAnalytics(
      userId,
      meals,
      targetCalories,
      "7d"
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

    // Calculate projection from real average delta against user target (7700 kcal ~= 1 kg)
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
  }
);

// 3. GET /api/analytics/export — Exportable nutrition reports
analyticsRouter.get(
  "/export",
  requireEntitlement(Entitlement.EXPORT_REPORTS),
  (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const format = req.query.format === "csv" ? "csv" : "json";
    const meals = inMemoryStore.loggedMeals.get(userId) || [];

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="better_life_nutrition_export.csv"');
      let csv = "ID,Name,Type,Calories,Protein(g),Carbs(g),Fat(g),Fiber(g),Time,LoggedAt\n";
      meals.forEach((m) => {
        csv += `"${m.id}","${m.name}","${m.type}",${m.calories},${m.proteinGrams || 0},${m.carbsGrams || 0},${m.fatGrams || 0},${m.fiberGrams || 0},"${m.time}","${new Date(m.loggedAt).toISOString()}"\n`;
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
  }
);
