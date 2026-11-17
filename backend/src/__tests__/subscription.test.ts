import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { app } from "../index.js";
import { env } from "../config/env.js";
import { userRepository, subscriptionRepository } from "../repositories/index.js";
import { subscriptionService } from "../services/subscriptionService.js";
import { Entitlement } from "../types/subscription.js";

function createTestToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: "1h" });
}

describe("Backend Premium Membership & Entitlements Security Suite", () => {
  const freeUserId = "user-free-test";
  const freeUserEmail = "free.user@betterlife.local";
  const premiumUserId = "user-premium-test";
  const premiumUserEmail = "premium.user@betterlife.local";
  const attackerUserId = "user-attacker-test";
  const attackerUserEmail = "attacker@betterlife.local";

  const freeToken = createTestToken(freeUserId, freeUserEmail);
  const premiumToken = createTestToken(premiumUserId, premiumUserEmail);
  const attackerToken = createTestToken(attackerUserId, attackerUserEmail);

  beforeEach(async () => {
    const now = new Date();
    await userRepository.upsert({
      id: freeUserId,
      name: "Free User",
      email: freeUserEmail,
      phone: "+62 811-1111-1111",
      passwordHash: "hash",
    });

    await userRepository.upsert({
      id: premiumUserId,
      name: "Premium User",
      email: premiumUserEmail,
      phone: "+62 822-2222-2222",
      passwordHash: "hash",
    });

    await userRepository.upsert({
      id: attackerUserId,
      name: "Attacker User",
      email: attackerUserEmail,
      phone: "+62 833-3333-3333",
      passwordHash: "hash",
    });

    await subscriptionRepository.upsert({
      id: `sub-${freeUserId}`,
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

    await subscriptionRepository.upsert({
      id: `sub-${premiumUserId}`,
      userId: premiumUserId,
      tier: "premium",
      status: "premium_active",
      planId: "monthly",
      billingProvider: "mock_sandbox",
      externalSubscriptionId: null,
      externalCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    await subscriptionRepository.clearPaymentEvents();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe("1. Public Plan Catalog & Free Membership Baseline", () => {
    it("GET /api/subscription/plans — should return all active billing plans with transparent pricing", async () => {
      const res = await request(app).get("/api/subscription/plans");
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.plans));
      assert.equal(res.body.plans.length, 3);
      assert.ok(res.body.plans.some((p: any) => p.id === "monthly"));
      assert.ok(res.body.plans.some((p: any) => p.id === "annual"));
      assert.ok(res.body.plans.some((p: any) => p.id === "lifetime"));
      assert.ok(res.body.paymentReadiness);
    });

    it("GET /api/subscription/status — should accurately return Free status and core entitlements", async () => {
      const res = await request(app)
        .get("/api/subscription/status")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.tier, "free");
      assert.equal(res.body.status, "free");
      assert.equal(res.body.isPremium, false);
      assert.ok(res.body.entitlements.includes(Entitlement.FOOD_LOGGING));
      assert.ok(res.body.entitlements.includes(Entitlement.BASIC_NUTRITION));
      assert.ok(!res.body.entitlements.includes(Entitlement.ADVANCED_ANALYTICS));
      assert.ok(!res.body.entitlements.includes(Entitlement.NUTRITION_REPORTS));
    });

    it("GET /api/subscription/status — should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/subscription/status");
      assert.equal(res.status, 401);
      assert.equal(res.body.error, "Unauthorized");
    });
  });

  describe("2. Server-side Entitlement Gating & Forged Flag Protection", () => {
    it("GET /api/analytics/advanced — should return 403 Forbidden with MEMBERSHIP_REQUIRED for Free users", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
      assert.equal(res.body.requiredEntitlement, Entitlement.ADVANCED_ANALYTICS);
    });

    it("GET /api/analytics/advanced — should strictly ignore forged client headers or body claims", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`)
        .set("x-is-premium", "true")
        .set("x-membership-tier", "premium")
        .send({ isPremium: true, tier: "premium" });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, "MEMBERSHIP_REQUIRED");
    });

    it("GET /api/analytics/advanced — should allow verified active Premium members", async () => {
      const res = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.summary);
      assert.ok(res.body.macroDistribution);
    });

    it("GET /api/meal-plans/personalized — should gate personalized meal plans behind PREMIUM", async () => {
      const freeRes = await request(app)
        .get("/api/meal-plans/personalized")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(freeRes.status, 403);
      assert.equal(freeRes.body.code, "MEMBERSHIP_REQUIRED");

      const premiumRes = await request(app)
        .get("/api/meal-plans/personalized")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(premiumRes.status, 200);
      assert.ok(premiumRes.body.schedule);
    });

    it("GET /api/analytics/export — should reject Free users and allow Premium users to export report data", async () => {
      const freeRes = await request(app)
        .get("/api/analytics/export")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(freeRes.status, 403);

      const premiumRes = await request(app)
        .get("/api/analytics/export")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(premiumRes.status, 200);
      assert.equal(premiumRes.body.format, "json");
    });
  });

  describe("3. Subscription Lifecycle: Expiration & Cancellation Transitions", () => {
    it("should reject access when a subscription has expired past its currentPeriodEnd", async () => {
      const expiredSub = (await subscriptionRepository.findByUserId(premiumUserId))!;
      expiredSub.currentPeriodEnd = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await subscriptionRepository.upsert(expiredSub);

      const statusRes = await request(app)
        .get("/api/subscription/status")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.body.status, "expired");
      assert.equal(statusRes.body.tier, "free");
      assert.equal(statusRes.body.isPremium, false);

      const protectedRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(protectedRes.status, 403);
      assert.equal(protectedRes.body.code, "MEMBERSHIP_REQUIRED");
    });

    it("should allow access when auto-renew is canceled BUT currentPeriodEnd is still in the future", async () => {
      const cancelRes = await request(app)
        .post("/api/subscription/cancel")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({ reason: "Testing cancellation retention" });

      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.subscription.status, "canceled");
      assert.equal(cancelRes.body.subscription.cancelAtPeriodEnd, true);
      assert.equal(cancelRes.body.subscription.isPremium, true);

      const accessRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(accessRes.status, 200);

      const sub = (await subscriptionRepository.findByUserId(premiumUserId))!;
      sub.currentPeriodEnd = new Date(Date.now() - 1000);
      await subscriptionRepository.upsert(sub);

      const expiredAccessRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(expiredAccessRes.status, 403);
    });

    it("should reject cancellation if user does not have an active paid subscription", async () => {
      const res = await request(app)
        .post("/api/subscription/cancel")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({ reason: "I don't have a plan" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Cancellation Failed");
    });
  });

  describe("4. Purchase Checkout & Verification", () => {
    it("POST /api/subscription/checkout — should reject unverified checkout when provider is unconfigured", async () => {
      const res = await request(app)
        .post("/api/subscription/checkout")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({ planId: "annual", provider: "mock_sandbox" });

      assert.equal(res.status, 400);
      assert.equal((await subscriptionService.getStatusResponse(freeUserId)).isPremium, false);

      const protectedRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(protectedRes.status, 403);
    });

    it("POST /api/subscription/checkout — should reject invalid plan identifiers", async () => {
      const res = await request(app)
        .post("/api/subscription/checkout")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({ planId: "ultra_vip_nonexistent", provider: "mock_sandbox" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation Error");
    });

    it("POST /api/subscription/verify — should reject unverified receipt claims", async () => {
      const transactionId = `txn_${Date.now()}_apple_receipt`;
      const res = await request(app)
        .post("/api/subscription/verify")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({
          provider: "apple_app_store",
          transactionId,
          planId: "monthly",
          receiptData: "dummy_storekit_receipt_data_base64",
        });

      assert.equal(res.status, 400);
      assert.equal((await subscriptionService.getStatusResponse(freeUserId)).isPremium, false);
    });
  });

  describe("5. Cryptographically Verified & Idempotent Webhook Event Processing", () => {
    it("should return 503 when webhook secret is not configured", async () => {
      const payload = {
        eventId: "evt_stripe_webhook_999",
        eventType: "subscription.created",
        provider: "stripe",
        userId: freeUserId,
        planId: "monthly",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payload: { customer: "cus_123" },
      };

      const res = await request(app).post("/api/subscription/webhook").send(payload);
      assert.equal(res.status, 503);
      assert.equal((await subscriptionService.getStatusResponse(freeUserId)).tier, "free");
    });

    it("should reject unsigned/forged webhooks with 401 and process signed webhooks idempotently", async () => {
      const secret = "whsec_test_verified_secret_key_123456";
      process.env.STRIPE_WEBHOOK_SECRET = secret;

      const bodyObj = {
        id: "evt_signed_stripe_001",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_001",
            client_reference_id: freeUserId,
            customer: "cus_verified_1",
            metadata: { userId: freeUserId, planId: "annual" },
          },
        },
      };
      const rawJson = JSON.stringify(bodyObj);

      // Unsigned request must be rejected
      const unsignedRes = await request(app)
        .post("/api/subscription/webhook")
        .set("Content-Type", "application/json")
        .send(rawJson);
      assert.equal(unsignedRes.status, 401);
      assert.equal((await subscriptionService.getStatusResponse(freeUserId)).isPremium, false);

      // Valid HMAC-SHA256 Stripe-Signature
      const ts = Math.floor(Date.now() / 1000);
      const sig = crypto
        .createHmac("sha256", secret)
        .update(`${ts}.${rawJson}`, "utf8")
        .digest("hex");

      const firstRes = await request(app)
        .post("/api/subscription/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", `t=${ts},v1=${sig}`)
        .send(rawJson);
      assert.equal(firstRes.status, 200);
      assert.equal(firstRes.body.duplicate, false);
      assert.equal((await subscriptionService.getStatusResponse(freeUserId)).isPremium, true);

      // Duplicate delivery with identical eventId must be idempotent
      const secondRes = await request(app)
        .post("/api/subscription/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", `t=${ts},v1=${sig}`)
        .send(rawJson);
      assert.equal(secondRes.status, 200);
      assert.equal(secondRes.body.duplicate, true);
    });
  });

  describe("6. User Ownership & Data Isolation Security", () => {
    it("Attacker cannot cancel or alter another user's subscription", async () => {
      const attackerCancelRes = await request(app)
        .post("/api/subscription/cancel")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ reason: "Malicious cancellation attempt" });

      assert.equal(attackerCancelRes.status, 400);

      const premiumStatus = await subscriptionService.getStatusResponse(premiumUserId);
      assert.equal(premiumStatus.status, "premium_active");
      assert.equal(premiumStatus.cancelAtPeriodEnd, false);
    });

    it("Free users can still log food and access basic recipes without restriction", async () => {
      const mealRes = await request(app)
        .post("/api/meals")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({
          type: "Breakfast",
          name: "Oatmeal with Sliced Banana",
          calories: 310,
          proteinGrams: 9,
          carbsGrams: 58,
          fatGrams: 5,
        });

      assert.equal(mealRes.status, 201);
      assert.equal(mealRes.body.name, "Oatmeal with Sliced Banana");

      const recipesRes = await request(app).get("/api/recipes");
      assert.equal(recipesRes.status, 200);
      assert.ok(recipesRes.body.length > 0);
    });

    it("Premium recipes are locked for Free users and unlocked for Premium users", async () => {
      const freeListRes = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${freeToken}`);
      assert.equal(freeListRes.status, 200);
      const lockedRecipe = freeListRes.body.find((r: any) => r.isPremium === true);
      assert.ok(lockedRecipe);
      assert.equal(lockedRecipe.isLocked, true);

      const collectionsFreeRes = await request(app)
        .get("/api/recipes/premium-collections")
        .set("Authorization", `Bearer ${freeToken}`);
      assert.equal(collectionsFreeRes.status, 403);

      const collectionsPremRes = await request(app)
        .get("/api/recipes/premium-collections")
        .set("Authorization", `Bearer ${premiumToken}`);
      assert.equal(collectionsPremRes.status, 200);
      assert.ok(collectionsPremRes.body.recipes.length > 0);
      assert.equal(collectionsPremRes.body.recipes[0].isLocked, false);
    });
  });
});
