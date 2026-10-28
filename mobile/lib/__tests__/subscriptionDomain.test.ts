import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Entitlement,
  FREE_ENTITLEMENTS,
  PREMIUM_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  isEntitled,
  getStatusDisplayLabel,
} from "../subscriptionDomain";

describe("Mobile Subscription Domain & Entitlements Unit Tests", () => {
  describe("1. Entitlement Resolution across Lifecycle States", () => {
    it("should grant core free entitlements to Free members", () => {
      assert.equal(isEntitled("free", "free", null, Entitlement.FOOD_LOGGING), true);
      assert.equal(isEntitled("free", "free", null, Entitlement.BASIC_NUTRITION), true);
      assert.equal(isEntitled("free", "free", null, Entitlement.STANDARD_RECIPES), true);
      assert.equal(isEntitled("free", "free", null, Entitlement.BASIC_DASHBOARD), true);
      assert.equal(isEntitled("free", "free", null, Entitlement.BASIC_HISTORY), true);
    });

    it("should deny premium entitlements to Free members", () => {
      assert.equal(isEntitled("free", "free", null, Entitlement.ADVANCED_ANALYTICS), false);
      assert.equal(isEntitled("free", "free", null, Entitlement.NUTRITION_REPORTS), false);
      assert.equal(isEntitled("free", "free", null, Entitlement.EXPORT_REPORTS), false);
      assert.equal(isEntitled("free", "free", null, Entitlement.PERSONALIZED_MEAL_PLAN), false);
      assert.equal(isEntitled("free", "free", null, Entitlement.PREMIUM_RECIPES), false);
    });

    it("should grant all entitlements to active Premium members within valid period", () => {
      const futurePeriod = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      assert.equal(isEntitled("premium", "premium_active", futurePeriod, Entitlement.ADVANCED_ANALYTICS), true);
      assert.equal(isEntitled("premium", "premium_active", futurePeriod, Entitlement.NUTRITION_REPORTS), true);
      assert.equal(isEntitled("premium", "premium_active", futurePeriod, Entitlement.PREMIUM_RECIPES), true);
    });

    it("should preserve premium entitlements for Canceled users when currentPeriodEnd is still in the future", () => {
      const futurePeriod = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      // User turned off auto-renew, but paid until future date
      assert.equal(isEntitled("premium", "canceled", futurePeriod, Entitlement.ADVANCED_ANALYTICS), true);
      assert.equal(isEntitled("premium", "canceled", futurePeriod, Entitlement.PERSONALIZED_MEAL_PLAN), true);
    });

    it("should revoke premium entitlements when subscription has expired past currentPeriodEnd", () => {
      const pastPeriod = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute ago
      assert.equal(isEntitled("premium", "premium_active", pastPeriod, Entitlement.ADVANCED_ANALYTICS), false);
      assert.equal(isEntitled("premium", "canceled", pastPeriod, Entitlement.ADVANCED_ANALYTICS), false);
      assert.equal(isEntitled("free", "expired", pastPeriod, Entitlement.ADVANCED_ANALYTICS), false);

      // Core free features remain accessible even when expired
      assert.equal(isEntitled("free", "expired", pastPeriod, Entitlement.FOOD_LOGGING), true);
      assert.equal(isEntitled("free", "expired", pastPeriod, Entitlement.BASIC_NUTRITION), true);
    });

    it("should revoke entitlements for revoked or payment_failed states", () => {
      assert.equal(isEntitled("free", "revoked", null, Entitlement.ADVANCED_ANALYTICS), false);
      assert.equal(isEntitled("free", "payment_failed", null, Entitlement.ADVANCED_ANALYTICS), false);
    });
  });

  describe("2. Plan Pricing & Calculation Integrity", () => {
    it("should define valid subscription plans with transparent details", () => {
      const monthly = SUBSCRIPTION_PLANS.monthly;
      const annual = SUBSCRIPTION_PLANS.annual;
      const lifetime = SUBSCRIPTION_PLANS.lifetime;

      assert.equal(monthly.priceAmount, 49000);
      assert.equal(annual.priceAmount, 399000);
      assert.equal(lifetime.priceAmount, 999000);

      // Calculate annual savings: monthly * 12 = 588,000; annual = 399,000 -> save 189,000 (~32%)
      const monthlyTotalForYear = monthly.priceAmount * 12;
      const actualSavings = Math.round(((monthlyTotalForYear - annual.priceAmount) / monthlyTotalForYear) * 100);
      assert.equal(actualSavings, 32);
      assert.equal(annual.savingsPercentage, 32);
    });
  });

  describe("3. Status Display Presentation", () => {
    it("should return human-friendly labels and proper badge variants for each state", () => {
      const activeInfo = getStatusDisplayLabel("premium_active", false);
      assert.equal(activeInfo.label, "Premium Active");
      assert.equal(activeInfo.badgeVariant, "success");

      const cancelingInfo = getStatusDisplayLabel("premium_active", true);
      assert.equal(cancelingInfo.label, "Cancels at period end");
      assert.equal(cancelingInfo.badgeVariant, "warning");

      const canceledInfo = getStatusDisplayLabel("canceled", true);
      assert.equal(canceledInfo.label, "Canceled (Active)");
      assert.equal(canceledInfo.badgeVariant, "warning");

      const expiredInfo = getStatusDisplayLabel("expired");
      assert.equal(expiredInfo.label, "Expired");
      assert.equal(expiredInfo.badgeVariant, "neutral");

      const freeInfo = getStatusDisplayLabel("free");
      assert.equal(freeInfo.label, "Free Member");
      assert.equal(freeInfo.badgeVariant, "neutral");
    });
  });
});
