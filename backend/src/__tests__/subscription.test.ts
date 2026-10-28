import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../index.js";
import { env } from "../config/env.js";
import { inMemoryStore } from "../services/store.js";
import { subscriptionService } from "../services/subscriptionService.js";
import { Entitlement, SUBSCRIPTION_PLANS } from "../types/subscription.js";

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

  beforeEach(() => {
    // Reset test users in store
    inMemoryStore.users.set(freeUserId, {
      id: freeUserId,
      name: "Free User",
      email: freeUserEmail,
      phone: "+62 811-1111-1111",
      passwordHash: "hash",
      createdAt: new Date(),
    });

    inMemoryStore.users.set(premiumUserId, {
      id: premiumUserId,
      name: "Premium User",
      email: premiumUserEmail,
      phone: "+62 822-2222-2222",
      passwordHash: "hash",
      createdAt: new Date(),
    });

    inMemoryStore.users.set(attackerUserId, {
      id: attackerUserId,
      name: "Attacker User",
      email: attackerUserEmail,
      phone: "+62 833-3333-3333",
      passwordHash: "hash",
      createdAt: new Date(),
    });

    // Reset subscriptions
    inMemoryStore.subscriptions.set(freeUserId, {
      id: `sub-${freeUserId}`,
      userId: freeUserId,
      tier: "free",
      status: "free",
      planId: null,
      billingProvider: "mock_sandbox",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryStore.subscriptions.set(premiumUserId, {
      id: `sub-${premiumUserId}`,
      userId: premiumUserId,
      tier: "premium",
      status: "premium_active",
      planId: "monthly",
      billingProvider: "mock_sandbox",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Clear payment events
    inMemoryStore.paymentEvents.clear();
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
      // Set premium user's subscription periodEnd to 2 hours ago
      const expiredSub = inMemoryStore.subscriptions.get(premiumUserId)!;
      expiredSub.currentPeriodEnd = new Date(Date.now() - 2 * 60 * 60 * 1000);
      inMemoryStore.subscriptions.set(premiumUserId, expiredSub);

      const statusRes = await request(app)
        .get("/api/subscription/status")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.body.status, "expired");
      assert.equal(statusRes.body.tier, "free");
      assert.equal(statusRes.body.isPremium, false);

      // Now attempting to access protected endpoint should return 403
      const protectedRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(protectedRes.status, 403);
      assert.equal(protectedRes.body.code, "MEMBERSHIP_REQUIRED");
    });

    it("should allow access when auto-renew is canceled BUT currentPeriodEnd is still in the future", async () => {
      // User cancels subscription
      const cancelRes = await request(app)
        .post("/api/subscription/cancel")
        .set("Authorization", `Bearer ${premiumToken}`)
        .send({ reason: "Testing cancellation retention" });

      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.subscription.status, "canceled");
      assert.equal(cancelRes.body.subscription.cancelAtPeriodEnd, true);
      assert.equal(cancelRes.body.subscription.isPremium, true); // Still entitled!

      // Access should still succeed
      const accessRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${premiumToken}`);

      assert.equal(accessRes.status, 200);

      // Fast-forward periodEnd to past: access must now be revoked
      const sub = inMemoryStore.subscriptions.get(premiumUserId)!;
      sub.currentPeriodEnd = new Date(Date.now() - 1000);
      inMemoryStore.subscriptions.set(premiumUserId, sub);

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
    it("POST /api/subscription/checkout — should activate premium subscription with valid plan", async () => {
      const res = await request(app)
        .post("/api/subscription/checkout")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({ planId: "annual", provider: "mock_sandbox" });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.subscription.tier, "premium");
      assert.equal(res.body.subscription.status, "premium_active");
      assert.equal(res.body.subscription.planId, "annual");

      // Verify the user can now access protected features
      const protectedRes = await request(app)
        .get("/api/analytics/advanced")
        .set("Authorization", `Bearer ${freeToken}`);

      assert.equal(protectedRes.status, 200);
    });

    it("POST /api/subscription/checkout — should reject invalid plan identifiers", async () => {
      const res = await request(app)
        .post("/api/subscription/checkout")
        .set("Authorization", `Bearer ${freeToken}`)
        .send({ planId: "ultra_vip_nonexistent", provider: "mock_sandbox" });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Validation Error");
    });

    it("POST /api/subscription/verify — should verify in-app transaction and activate membership", async () => {
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

      assert.equal(res.status, 200);
      assert.equal(res.body.subscription.tier, "premium");
      assert.equal(res.body.subscription.billingProvider, "apple_app_store");
    });
  });

  describe("5. Idempotent Webhook Event Processing", () => {
    it("should process webhook events idempotently and prevent duplicate mutations", async () => {
      const eventId = "evt_stripe_webhook_999";
      const payload = {
        eventId,
        eventType: "subscription.created",
        provider: "stripe",
        userId: freeUserId,
        planId: "monthly",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payload: { stripe_event: "customer.subscription.created", customer: "cus_123" },
      };

      // 1st delivery
      const firstRes = await request(app)
        .post("/api/subscription/webhook")
        .send(payload);

      assert.equal(firstRes.status, 201);
      assert.equal(firstRes.body.duplicate, false);

      // Verify user is upgraded
      const statusRes = await request(app)
        .get("/api/subscription/status")
        .set("Authorization", `Bearer ${freeToken}`);
      assert.equal(statusRes.body.tier, "premium");

      // 2nd delivery (identical eventId)
      const secondRes = await request(app)
        .post("/api/subscription/webhook")
        .send(payload);

      assert.equal(secondRes.status, 200);
      assert.equal(secondRes.body.duplicate, true);
    });

    it("should reject malformed webhook payloads with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/subscription/webhook")
        .send({ missingEventId: true });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Invalid Webhook Payload");
    });
  });

  describe("6. User Ownership & Data Isolation Security", () => {
    it("Attacker cannot cancel or alter another user's subscription", async () => {
      // Attacker attempts to cancel Premium user's subscription
      const attackerCancelRes = await request(app)
        .post("/api/subscription/cancel")
        .set("Authorization", `Bearer ${attackerToken}`)
        .send({ reason: "Malicious cancellation attempt" });

      // Attacker is free, so their own cancel attempt fails
      assert.equal(attackerCancelRes.status, 400);

      // Verify Premium user's subscription remains untouched and active
      const premiumStatus = subscriptionService.getStatusResponse(premiumUserId);
      assert.equal(premiumStatus.status, "premium_active");
      assert.equal(premiumStatus.cancelAtPeriodEnd, false);
    });

    it("Free users can still log food and access basic recipes without restriction", async () => {
      // Food logging is core entitlement for Free users
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

      // Recipe browsing is core entitlement
      const recipesRes = await request(app).get("/api/recipes");
      assert.equal(recipesRes.status, 200);
      assert.ok(recipesRes.body.length > 0);
    });

    it("Premium recipes are locked for Free users and unlocked for Premium users", async () => {
      // Free user list
      const freeListRes = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${freeToken}`);
      assert.equal(freeListRes.status, 200);
      const lockedRecipe = freeListRes.body.find((r: any) => r.isPremium === true);
      assert.ok(lockedRecipe);
      assert.equal(lockedRecipe.isLocked, true);

      // Premium collections route rejects Free user
      const collectionsFreeRes = await request(app)
        .get("/api/recipes/premium-collections")
        .set("Authorization", `Bearer ${freeToken}`);
      assert.equal(collectionsFreeRes.status, 403);

      // Premium collections route allows Premium user
      const collectionsPremRes = await request(app)
        .get("/api/recipes/premium-collections")
        .set("Authorization", `Bearer ${premiumToken}`);
      assert.equal(collectionsPremRes.status, 200);
      assert.ok(collectionsPremRes.body.recipes.length > 0);
      assert.equal(collectionsPremRes.body.recipes[0].isLocked, false);
    });
  });
});

