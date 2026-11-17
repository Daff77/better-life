import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../index.js";
import { userRepository, subscriptionRepository } from "../repositories/index.js";
import { env } from "../config/env.js";
import { Entitlement } from "../types/subscription.js";

describe("Backend Premium Personalized Meal Planner Security & Optimization Suite", () => {
  const freeUserId = "user-free-planner";
  const premiumUserId = "user-premium-planner";
  const attackerUserId = "user-attacker-planner";

  let freeToken: string;
  let premiumToken: string;
  let attackerToken: string;

  before(async () => {
    const now = new Date();
    // 1. Setup Free User
    await userRepository.upsert({
      id: freeUserId,
      name: "Free Member",
      email: "free.planner@example.com",
      phone: "+6281110001",
      passwordHash: "hash",
    });
    await subscriptionRepository.upsert({
      id: "sub-free-planner",
      userId: freeUserId,
      tier: "free",
      status: "free",
      planId: null,
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
    freeToken = jwt.sign(
      { userId: freeUserId, email: "free.planner@example.com" },
      env.JWT_SECRET
    );

    // 2. Setup Premium User
    await userRepository.upsert({
      id: premiumUserId,
      name: "Premium Member",
      email: "premium.planner@example.com",
      phone: "+6281110002",
      passwordHash: "hash",
    });
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await subscriptionRepository.upsert({
      id: "sub-prem-planner",
      userId: premiumUserId,
      tier: "premium",
      status: "premium_active",
      planId: "monthly",
      billingProvider: "stripe",
      externalSubscriptionId: null,
      externalCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: futureDate,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    premiumToken = jwt.sign(
      { userId: premiumUserId, email: "premium.planner@example.com" },
      env.JWT_SECRET
    );

    // 3. Setup Attacker User
    await userRepository.upsert({
      id: attackerUserId,
      name: "Attacker User",
      email: "attacker.planner@example.com",
      phone: "+6281110003",
      passwordHash: "hash",
    });
    await subscriptionRepository.upsert({
      id: "sub-att-planner",
      userId: attackerUserId,
      tier: "free",
      status: "free",
      planId: null,
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
    attackerToken = jwt.sign(
      { userId: attackerUserId, email: "attacker.planner@example.com" },
      env.JWT_SECRET
    );
  });

  describe("1. Public Preview & Free Access Gating", () => {
    it("GET /api/meal-plans/preview — should allow unauthenticated access to sample 1-day plan", async () => {
      const res = await request(app).get("/api/meal-plans/preview");
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.feature, "string");
      assert.ok(res.body.sampleDay);
      assert.ok(res.body.sampleDay.meals.length > 0);
      assert.ok(res.body.capabilities.length > 0);
    });

    it("POST /api/meal-plans/generate — should reject unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .send({ dailyCalorieTarget: 2000 });
      assert.equal(res.status, 401);
    });

    it("POST /api/meal-plans/generate — should return 403 MEMBERSHIP_REQUIRED for Free users", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({
          dailyCalorieTarget: 2100,
          dailyBudgetIdr: 50000,
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
      assert.equal(res.body.requiredEntitlement, Entitlement.PERSONALIZED_MEAL_PLAN);
    });

    it("POST /api/meal-plans/generate — should ignore forged client-side premium claims", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${freeToken}`)
        .set("x-user-is-premium", "true")
        .send({
          dailyCalorieTarget: 2100,
          isPremium: true,
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
    });
  });

  describe("2. Personalized Meal Plan Generation & Math Integrity", () => {
    it("POST /api/meal-plans/generate — should generate a valid 7-day plan for Premium users", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          dailyCalorieTarget: 2000,
          dailyBudgetIdr: 60000,
          dietaryRestrictions: [],
          allergies: [],
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner", "Snack"],
          availableIngredients: ["Avocado", "Quinoa"],
          mealsPerDay: 4,
        });

      assert.equal(res.status, 201);
      const plan = res.body;

      assert.equal(plan.days.length, 7);
      assert.equal(plan.userId, premiumUserId);
      assert.ok(plan.shoppingList.length > 0);
      assert.ok(plan.summary.weeklyCalories > 0);
      assert.ok(plan.summary.weeklyEstimatedCostIdr > 0);

      for (const day of plan.days) {
        let expectedCals = 0;
        let expectedCost = 0;
        let expectedProtein = 0;
        let expectedCarbs = 0;
        let expectedFat = 0;
        let expectedFiber = 0;

        for (const m of day.meals) {
          expectedCals += m.recipe.calories;
          expectedCost += m.recipe.estimatedCostIdr || 0;
          expectedProtein += m.recipe.nutrition.proteinGrams;
          expectedCarbs += m.recipe.nutrition.carbsGrams;
          expectedFat += m.recipe.nutrition.fatGrams;
          expectedFiber += m.recipe.nutrition.fiberGrams;
        }

        assert.equal(day.totals.calories, expectedCals);
        assert.equal(day.totals.estimatedCostIdr, expectedCost);
        assert.equal(day.totals.proteinGrams, expectedProtein);
        assert.equal(day.totals.carbsGrams, expectedCarbs);
        assert.equal(day.totals.fatGrams, expectedFat);
        assert.equal(day.totals.fiberGrams, expectedFiber);
      }
    });

    it("should strictly exclude all recipes containing user allergies", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          dailyCalorieTarget: 1900,
          dailyBudgetIdr: 70000,
          allergies: ["Dairy"],
          dietaryRestrictions: [],
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
          availableIngredients: [],
          mealsPerDay: 3,
        });

      assert.equal(res.status, 201);
      const plan = res.body;

      for (const day of plan.days) {
        for (const meal of day.meals) {
          assert.notEqual(
            meal.recipe.id,
            "parfait",
            "Parfait contains Greek yogurt and must be excluded"
          );
          const hasDairyAllergen = (meal.recipe.allergens || []).some((a: string) =>
            a.toLowerCase().includes("dairy")
          );
          assert.equal(hasDairyAllergen, false, `Meal ${meal.recipe.title} contains dairy allergen`);
        }
      }
    });

    it("should strictly respect Vegetarian dietary restriction", async () => {
      const res = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          dailyCalorieTarget: 1800,
          dailyBudgetIdr: 50000,
          allergies: [],
          dietaryRestrictions: ["Vegetarian"],
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
          availableIngredients: [],
          mealsPerDay: 3,
        });

      assert.equal(res.status, 201);
      const plan = res.body;

      for (const day of plan.days) {
        for (const meal of day.meals) {
          const title = meal.recipe.title.toLowerCase();
          const isMeat = /chicken|beef|salmon|fish|wagyu|tenderloin|sirloin/i.test(title);
          assert.equal(
            isMeat,
            false,
            `Vegetarian plan must not contain meat: ${meal.recipe.title}`
          );
        }
      }
    });
  });

  describe("3. Recipe Substitutions & Day Replacement", () => {
    it("POST /api/meal-plans/substitute — should return alternative eligible recipes for slot", async () => {
      const res = await request(app)
        .post("/api/meal-plans/substitute")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          slot: "Breakfast",
          currentRecipeId: "parfait",
          preferences: {
            dailyCalorieTarget: 2000,
            allergies: [],
            dietaryRestrictions: [],
            dailyBudgetIdr: 50000,
            preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
            availableIngredients: [],
            mealsPerDay: 3,
          },
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.substitutions.length > 0);

      const containsCurrent = res.body.substitutions.some(
        (s: any) => s.recipe.id === "parfait"
      );
      assert.equal(containsCurrent, false);
      assert.ok(typeof res.body.substitutions[0].calorieDiff === "number");
    });

    it("POST /api/meal-plans/replace-meal — should swap meal and recompute daily and weekly totals", async () => {
      const genRes = await request(app)
        .post("/api/meal-plans/generate")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          dailyCalorieTarget: 2000,
          dailyBudgetIdr: 50000,
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
        });

      const initialPlan = genRes.body;
      const day0Meal0 = initialPlan.days[0].meals[0];

      const targetRecipeId =
        day0Meal0.recipe.id === "avocado-toast" ? "spinach-egg-scramble" : "avocado-toast";

      const replaceRes = await request(app)
        .post("/api/meal-plans/replace-meal")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({
          dayIndex: 0,
          slot: day0Meal0.slot,
          newRecipeId: targetRecipeId,
          currentPlan: initialPlan,
        });

      assert.equal(replaceRes.status, 200);
      const updatedPlan = replaceRes.body;

      assert.equal(updatedPlan.days[0].meals[0].recipe.id, targetRecipeId);
      assert.ok(updatedPlan.shoppingList.length > 0);
    });
  });

  describe("4. Saved Plans & Ownership Isolation Security", () => {
    it("GET /api/meal-plans/saved — should retrieve saved active plan for owner", async () => {
      const res = await request(app)
        .get("/api/meal-plans/saved")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.userId, premiumUserId);
    });

    it("POST /api/meal-plans/save — should save plan and prevent IDOR tampering", async () => {
      const savedRes = await request(app)
        .get("/api/meal-plans/saved")
        .set("Authorization", `Bearer ${premiumToken}`);

      const planToSave = savedRes.body;
      planToSave.title = "My Customized Wellness Plan";

      const saveRes = await request(app)
        .post("/api/meal-plans/save")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send(planToSave);

      assert.equal(saveRes.status, 200);
      assert.equal(saveRes.body.plan.title, "My Customized Wellness Plan");

      const attackerRes = await request(app)
        .get("/api/meal-plans/saved")
        .set("Authorization", `Bearer ${attackerToken}`);

      assert.equal(attackerRes.status, 403);
    });
  });
});
