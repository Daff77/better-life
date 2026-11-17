import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../index.js";
import { env } from "../config/env.js";
import {
  userRepository,
  subscriptionRepository,
  profileRepository,
  mealRepository,
} from "../repositories/index.js";
import { AnalyticsEngine } from "../services/analyticsEngine.js";

function createTestToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: "1h" });
}

describe("Backend Advanced Nutrition Analytics Suite", () => {
  const premiumUserId = "user-prem-analytics-test";
  const premiumUserEmail = "premium.analytics@betterlife.local";
  const freeUserId = "user-free-analytics-test";
  const freeUserEmail = "free.analytics@betterlife.local";
  const otherPremiumUserId = "user-other-analytics-test";
  const otherPremiumUserEmail = "other.analytics@betterlife.local";

  const premiumToken = createTestToken(premiumUserId, premiumUserEmail);
  const freeToken = createTestToken(freeUserId, freeUserEmail);
  const otherPremiumToken = createTestToken(otherPremiumUserId, otherPremiumUserEmail);

  beforeEach(async () => {
    await userRepository.upsert({
      id: premiumUserId,
      name: "Analytics Premium User",
      email: premiumUserEmail,
      phone: "+62 812-1111-2222",
      passwordHash: "hash",
    });

    await userRepository.upsert({
      id: freeUserId,
      name: "Free User",
      email: freeUserEmail,
      phone: "+62 813-2222-3333",
      passwordHash: "hash",
    });

    await userRepository.upsert({
      id: otherPremiumUserId,
      name: "Other Premium User",
      email: otherPremiumUserEmail,
      phone: "+62 814-3333-4444",
      passwordHash: "hash",
    });

    const now = new Date();
    await subscriptionRepository.upsert({
      id: `sub-${premiumUserId}`,
      userId: premiumUserId,
      tier: "premium",
      planId: "monthly",
      status: "premium_active",
      billingProvider: "mock_sandbox",
      externalSubscriptionId: null,
      externalCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await subscriptionRepository.upsert({
      id: `sub-${freeUserId}`,
      userId: freeUserId,
      tier: "free",
      planId: null,
      status: "free",
      billingProvider: "mock_sandbox",
      externalSubscriptionId: null,
      externalCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await subscriptionRepository.upsert({
      id: `sub-${otherPremiumUserId}`,
      userId: otherPremiumUserId,
      tier: "premium",
      planId: "annual",
      status: "premium_active",
      billingProvider: "mock_sandbox",
      externalSubscriptionId: null,
      externalCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await profileRepository.upsert(premiumUserId, {
      goal: "Eat balanced",
      weight: 70,
      height: 175,
      gender: "Male",
      birthDate: { day: 15, month: "June", year: 2000 },
      cookingSkill: "Middle",
      dietType: "Omnivore",
      allergies: [],
      targetCalories: 2100,
      onboardingCompleted: true,
    });

    await profileRepository.upsert(otherPremiumUserId, {
      goal: "Lose weight",
      weight: 65,
      height: 170,
      gender: "Female",
      birthDate: { day: 10, month: "May", year: 2001 },
      cookingSkill: "Middle",
      dietType: "Omnivore",
      allergies: [],
      targetCalories: 1800,
      onboardingCompleted: true,
    });

    await mealRepository.clearAllByUser(premiumUserId);
    await mealRepository.clearAllByUser(freeUserId);
    await mealRepository.clearAllByUser(otherPremiumUserId);
  });

  describe("1. Access Control, Entitlements & Privacy", () => {
    it("GET /api/analytics/advanced — should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/analytics/advanced");
      assert.equal(res.status, 401);
    });

    it("GET /api/analytics/advanced — should reject Free users with 403 MEMBERSHIP_REQUIRED", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
    });

    it("GET /api/analytics/advanced — should ignore forged client claims", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`)
        .set("X-Premium", "true")
        .set("X-Entitlements", "advanced_analytics");

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
    });

    it("GET /api/analytics/advanced — should allow active Premium members", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.range, "7d");
      assert.ok(res.body.summary);
      assert.ok(res.body.macroDistribution);
      assert.ok(res.body.consistency);
      assert.ok(res.body.spending);
    });
  });

  describe("2. Honest Missing Data & Zero Intake Handling", () => {
    it("should accurately reflect empty meal history without inventing data", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced?range=7d")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.summary.totalCalories, 0);
      assert.equal(res.body.summary.averageDailyCalories, 0);
      assert.equal(res.body.summary.adherenceScore, 0);
      assert.equal(res.body.consistency.totalMealsLogged, 0);
      assert.equal(res.body.consistency.loggedDaysCount, 0);
      assert.equal(res.body.consistency.dataCoveragePercentage, 0);
      assert.equal(res.body.consistency.currentStreakDays, 0);
      assert.equal(res.body.spending.totalEstimatedCostIdr, 0);
      assert.equal(res.body.spending.pricingCoveragePct, 0);

      assert.equal(res.body.dailyTrends.length, 7);
      for (const pt of res.body.dailyTrends) {
        assert.equal(pt.hasData, false);
        assert.equal(pt.adherenceStatus, "no_data");
        assert.equal(pt.calories, 0);
      }
      assert.match(res.body.narrative, /No food entries have been logged/i);
    });

    it("should calculate average daily calories only over logged days (not artificially deflated)", async () => {
      const todayStr = AnalyticsEngine.formatDateKey(new Date());

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          type: "Breakfast",
          name: "Oatmeal with Almond Milk & Berries",
          calories: 600,
          proteinGrams: 20,
          carbsGrams: 90,
          fatGrams: 15,
          fiberGrams: 10,
          estimatedCostIdr: 25000,
          dateKey: todayStr,
        });

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          type: "Lunch",
          name: "Grilled Chicken Breast with Brown Rice",
          calories: 1400,
          proteinGrams: 100,
          carbsGrams: 130,
          fatGrams: 35,
          fiberGrams: 12,
          estimatedCostIdr: 45000,
          dateKey: todayStr,
        });

      const res = await request(app)
        .get("/api/analytics/advanced?range=7d")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.summary.totalCalories, 2000);
      assert.equal(res.body.summary.averageDailyCalories, 2000);
      assert.equal(res.body.consistency.loggedDaysCount, 1);
      assert.equal(res.body.consistency.totalDaysInRange, 7);
      assert.equal(res.body.consistency.totalMealsLogged, 2);
      assert.equal(res.body.consistency.dataCoveragePercentage, 14);

      const todayPoint = res.body.dailyTrends.find((p: any) => p.date === todayStr);
      assert.ok(todayPoint);
      assert.equal(todayPoint.hasData, true);
      assert.equal(todayPoint.calories, 2000);
      assert.equal(todayPoint.proteinGrams, 120);
      assert.equal(todayPoint.carbsGrams, 220);
      assert.equal(todayPoint.fatGrams, 50);
      assert.equal(todayPoint.fiberGrams, 22);
      assert.equal(todayPoint.mealCount, 2);
      assert.equal(todayPoint.adherenceStatus, "on_target");
    });
  });

  describe("3. 7-Day, 30-Day & Custom Date Ranges", () => {
    it("GET /api/analytics/advanced?range=30d — should return continuous 30-day breakdown", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced?range=30d")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.range, "30d");
      assert.equal(res.body.dailyTrends.length, 30);
      assert.equal(res.body.consistency.totalDaysInRange, 30);
    });

    it("GET /api/analytics/advanced?range=custom — should return exact requested window", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced?range=custom&startDate=2026-10-20&endDate=2026-10-25")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.range, "custom");
      assert.equal(res.body.startDate, "2026-10-20");
      assert.equal(res.body.endDate, "2026-10-25");
      assert.equal(res.body.dailyTrends.length, 6);
      assert.equal(res.body.dailyTrends[0].date, "2026-10-20");
      assert.equal(res.body.dailyTrends[5].date, "2026-10-25");
    });

    it("should reject invalid query range parameters with 400", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced?range=custom&startDate=not-a-date")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "INVALID_QUERY_PARAMS");
    });
  });

  describe("4. Macronutrient Distribution & Spending Trends", () => {
    it("should compute accurate macro ratios, fiber adequacy and spending metrics", async () => {
      const todayStr = AnalyticsEngine.formatDateKey(new Date());

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          type: "Lunch",
          name: "Salmon and Roasted Sweet Potatoes",
          calories: 800,
          proteinGrams: 60,
          carbsGrams: 60,
          fatGrams: 35.5,
          fiberGrams: 26,
          estimatedCostIdr: 65000,
          dateKey: todayStr,
        });

      const res = await request(app)
        .get("/api/analytics/advanced?range=7d")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);

      const macros = res.body.macroDistribution;
      assert.equal(macros.grams.protein, 60);
      assert.equal(macros.grams.carbs, 60);
      assert.equal(macros.grams.fat, 36);
      assert.equal(macros.grams.fiber, 26);

      assert.equal(res.body.summary.fiberScore, "Optimal");

      const spending = res.body.spending;
      assert.equal(spending.totalEstimatedCostIdr, 65000);
      assert.equal(spending.pricedMealsCount, 1);
      assert.equal(spending.totalMealsCount, 1);
      assert.equal(spending.pricingCoveragePct, 100);
      assert.equal(spending.averageCostPerMealIdr, 65000);
      assert.equal(spending.averageDailyCostIdr, 65000);
    });
  });

  describe("5. User Data Isolation & IDOR Protection", () => {
    it("should strictly isolate analytics between different users", async () => {
      const todayStr = AnalyticsEngine.formatDateKey(new Date());

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          type: "Dinner",
          name: "Wagyu Sirloin Steak",
          calories: 900,
          proteinGrams: 75,
          carbsGrams: 0,
          fatGrams: 65,
          fiberGrams: 0,
          estimatedCostIdr: 250000,
          dateKey: todayStr,
        });

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${otherPremiumToken}`)
        .send({
          type: "Dinner",
          name: "Garden Salad",
          calories: 250,
          proteinGrams: 5,
          carbsGrams: 15,
          fatGrams: 10,
          fiberGrams: 8,
          estimatedCostIdr: 30000,
          dateKey: todayStr,
        });

      const resA = await request(app)
        .get("/api/analytics/advanced?range=7d")
        .set("Authorization", `Bearer ${premiumToken}`);

      const resB = await request(app)
        .get("/api/analytics/advanced?range=7d")
        .set("Authorization", `Bearer ${otherPremiumToken}`);

      assert.equal(resA.body.summary.totalCalories, 900);
      assert.equal(resA.body.spending.totalEstimatedCostIdr, 250000);
      assert.equal(resA.body.macroDistribution.grams.protein, 75);

      assert.equal(resB.body.summary.totalCalories, 250);
      assert.equal(resB.body.spending.totalEstimatedCostIdr, 30000);
      assert.equal(resB.body.macroDistribution.grams.protein, 5);
    });
  });

  describe("6. Nutrition Reports Endpoint", () => {
    it("GET /api/analytics/reports — should return report generated from real persisted meals", async () => {
      const todayStr = AnalyticsEngine.formatDateKey(new Date());

      await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          type: "Breakfast",
          name: "Protein Shake",
          calories: 450,
          proteinGrams: 45,
          carbsGrams: 20,
          fatGrams: 10,
          fiberGrams: 5,
          estimatedCostIdr: 20000,
          dateKey: todayStr,
        });

      const res = await request(app)
        .get("/api/analytics/reports")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.period, "weekly");
      assert.equal(res.body.loggedEntriesCount, 1);
      assert.equal(res.body.loggedDaysCount, 1);
      assert.equal(res.body.averageDailyCalories, 450);
      assert.ok(Array.isArray(res.body.dailyBreakdown));
      assert.equal(res.body.dailyBreakdown.length, 7);
      assert.ok(res.body.monthlyProjection);
      assert.ok(res.body.narrative);
    });
  });
});
