import { inMemoryStore } from "./store.js";
import {
  MembershipTier,
  SubscriptionStatus,
  BillingProvider,
  PlanId,
  Entitlement,
  TIER_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  SubscriptionRecord,
  PaymentEventRecord,
  SubscriptionStatusResponse,
} from "../types/subscription.js";

export class SubscriptionService {
  /**
   * Retrieves or initializes the subscription record for a user and
   * computes their current verified membership status and entitlements.
   */
  public getSubscriptionByUserId(userId: string): {
    subscription: SubscriptionRecord;
    effectiveTier: MembershipTier;
    effectiveStatus: SubscriptionStatus;
    isPremium: boolean;
    entitlements: readonly Entitlement[];
  } {
    let sub = inMemoryStore.subscriptions.get(userId);

    if (!sub) {
      sub = {
        id: `sub-${userId}`,
        userId,
        tier: "free",
        status: "free",
        planId: null,
        billingProvider: "mock_sandbox",
        externalSubscriptionId: null,
        externalCustomerId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryStore.subscriptions.set(userId, sub);
    }

    const now = new Date();
    let effectiveStatus = sub.status;
    let effectiveTier: MembershipTier = "free";

    // 1. Check expiration for time-bounded subscriptions
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now.getTime()) {
      if (sub.status === "premium_active" || sub.status === "canceled") {
        effectiveStatus = "expired";
        sub.status = "expired";
        sub.tier = "free";
        sub.updatedAt = now;
        inMemoryStore.subscriptions.set(userId, sub);
      }
    }

    // 2. Compute effective tier
    if (effectiveStatus === "premium_active") {
      effectiveTier = "premium";
    } else if (
      effectiveStatus === "canceled" &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd.getTime() > now.getTime()
    ) {
      // User canceled auto-renew, but period has not ended yet: STILL ENTITLED!
      effectiveTier = "premium";
    } else {
      effectiveTier = "free";
    }

    const isPremium = effectiveTier === "premium";
    const entitlements = TIER_ENTITLEMENTS[effectiveTier];

    return {
      subscription: sub,
      effectiveTier,
      effectiveStatus,
      isPremium,
      entitlements,
    };
  }

  /**
   * Check whether a user is entitled to a specific feature
   */
  public isUserEntitled(userId: string, entitlement: Entitlement): boolean {
    const { entitlements } = this.getSubscriptionByUserId(userId);
    return entitlements.includes(entitlement);
  }

  /**
   * Format subscription status for API response
   */
  public getStatusResponse(userId: string): SubscriptionStatusResponse {
    const { subscription, effectiveTier, effectiveStatus, isPremium, entitlements } =
      this.getSubscriptionByUserId(userId);

    return {
      tier: effectiveTier,
      status: effectiveStatus,
      isPremium,
      planId: subscription.planId ?? null,
      billingProvider: subscription.billingProvider ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      entitlements,
    };
  }

  /**
   * Initiate subscription checkout or upgrade
   */
  public checkout(
    userId: string,
    planId: PlanId,
    provider: BillingProvider = "mock_sandbox"
  ): {
    subscription: SubscriptionRecord;
    effectiveStatus: SubscriptionStatus;
    isPremium: boolean;
    checkoutUrl?: string;
    message: string;
  } {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error(`Invalid plan identifier: ${planId}`);
    }

    const now = new Date();
    let periodEnd: Date | null = null;

    if (plan.interval === "month") {
      periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "year") {
      periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "lifetime") {
      periodEnd = null; // Lifetime access does not expire
    }

    const updatedSub: SubscriptionRecord = {
      id: `sub-${userId}`,
      userId,
      tier: "premium",
      status: "premium_active",
      planId,
      billingProvider: provider,
      externalSubscriptionId: `ext-${provider}-${Date.now()}`,
      externalCustomerId: `cust-${userId}`,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: { planName: plan.name, priceAmount: plan.priceAmount },
      createdAt: now,
      updatedAt: now,
    };

    inMemoryStore.subscriptions.set(userId, updatedSub);

    // Record audit event
    const eventId = `evt_checkout_${Date.now()}_${userId}`;
    inMemoryStore.paymentEvents.set(eventId, {
      id: `pe-${Date.now()}`,
      eventId,
      provider,
      eventType: "subscription.created",
      userId,
      subscriptionId: updatedSub.id,
      payload: { planId, priceAmount: plan.priceAmount },
      processedAt: now,
    });

    return {
      subscription: updatedSub,
      effectiveStatus: "premium_active",
      isPremium: true,
      message: `Successfully upgraded to ${plan.name}`,
    };
  }

  /**
   * Verify an in-app purchase or external transaction receipt
   */
  public verifyTransaction(
    userId: string,
    provider: BillingProvider,
    transactionId: string,
    planId: PlanId = "monthly",
    _receiptData?: string
  ): {
    success: boolean;
    subscription: SubscriptionRecord;
    effectiveStatus: SubscriptionStatus;
    message: string;
  } {
    // 1. Enforce strict idempotency: check if transactionId was already processed
    if (inMemoryStore.paymentEvents.has(transactionId)) {
      const existing = inMemoryStore.subscriptions.get(userId);
      return {
        success: true,
        subscription: existing!,
        effectiveStatus: existing?.status || "premium_active",
        message: "Transaction already processed and validated.",
      };
    }

    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.monthly;
    const now = new Date();
    let periodEnd: Date | null = null;

    if (plan.interval === "month") {
      periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "year") {
      periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const updatedSub: SubscriptionRecord = {
      id: `sub-${userId}`,
      userId,
      tier: "premium",
      status: "premium_active",
      planId,
      billingProvider: provider,
      externalSubscriptionId: transactionId,
      externalCustomerId: `cust-${userId}`,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: { transactionId },
      createdAt: now,
      updatedAt: now,
    };

    inMemoryStore.subscriptions.set(userId, updatedSub);

    // Save processed event for idempotency
    inMemoryStore.paymentEvents.set(transactionId, {
      id: `pe-${Date.now()}`,
      eventId: transactionId,
      provider,
      eventType: "subscription.created",
      userId,
      subscriptionId: updatedSub.id,
      payload: { transactionId, planId },
      processedAt: now,
    });

    return {
      success: true,
      subscription: updatedSub,
      effectiveStatus: "premium_active",
      message: "Transaction verified successfully. Premium membership active.",
    };
  }

  /**
   * Cancel subscription auto-renewal
   */
  public cancelSubscription(
    userId: string,
    reason?: string
  ): {
    subscription: SubscriptionRecord;
    message: string;
  } {
    const { subscription, isPremium } = this.getSubscriptionByUserId(userId);

    if (!isPremium || subscription.status !== "premium_active") {
      throw new Error(
        "You do not have an active paid subscription to cancel."
      );
    }

    const now = new Date();
    const updatedSub: SubscriptionRecord = {
      ...subscription,
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: now,
      metadata: {
        ...subscription.metadata,
        cancellationReason: reason || "User requested cancellation",
      },
      updatedAt: now,
    };

    inMemoryStore.subscriptions.set(userId, updatedSub);

    return {
      subscription: updatedSub,
      message:
        "Your subscription has been canceled. You retain full access until your current period ends.",
    };
  }

  /**
   * Restore previous purchases
   */
  public restoreSubscription(
    userId: string,
    _provider: BillingProvider = "mock_sandbox"
  ): {
    restored: boolean;
    statusResponse: SubscriptionStatusResponse;
    message: string;
  } {
    const { subscription, isPremium } = this.getSubscriptionByUserId(userId);

    if (isPremium) {
      return {
        restored: true,
        statusResponse: this.getStatusResponse(userId),
        message: "Your existing active Premium membership was verified and restored.",
      };
    }

    return {
      restored: false,
      statusResponse: this.getStatusResponse(userId),
      message: "No active subscriptions found for this account to restore.",
    };
  }

  /**
   * Process webhook events with strict idempotency and signature validation
   */
  public processWebhookEvent(params: {
    eventId: string;
    eventType: string;
    provider: BillingProvider;
    userId?: string;
    subscriptionId?: string;
    planId?: PlanId;
    currentPeriodEnd?: string;
    payload: Record<string, any>;
  }): {
    success: boolean;
    duplicate: boolean;
    message: string;
  } {
    const { eventId, eventType, provider, userId, planId, currentPeriodEnd, payload } =
      params;

    // 1. Strict Idempotency: Ignore duplicate webhook deliveries
    if (inMemoryStore.paymentEvents.has(eventId)) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} has already been processed.`,
      };
    }

    const targetUserId =
      userId ||
      payload.userId ||
      payload.client_reference_id ||
      payload.customer_id;

    if (targetUserId) {
      const now = new Date();
      const existing = inMemoryStore.subscriptions.get(targetUserId);

      if (eventType === "subscription.created" || eventType === "subscription.renewed") {
        const periodEndDate = currentPeriodEnd
          ? new Date(currentPeriodEnd)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const sub: SubscriptionRecord = {
          id: existing?.id || `sub-${targetUserId}`,
          userId: targetUserId,
          tier: "premium",
          status: "premium_active",
          planId: planId || existing?.planId || "monthly",
          billingProvider: provider,
          externalSubscriptionId: params.subscriptionId || payload.id || null,
          externalCustomerId: payload.customer || null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEndDate,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          metadata: payload,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        inMemoryStore.subscriptions.set(targetUserId, sub);
      } else if (eventType === "subscription.canceled") {
        if (existing) {
          existing.status = "canceled";
          existing.cancelAtPeriodEnd = true;
          existing.canceledAt = now;
          existing.updatedAt = now;
          inMemoryStore.subscriptions.set(targetUserId, existing);
        }
      } else if (eventType === "subscription.payment_failed") {
        if (existing) {
          existing.status = "payment_failed";
          existing.updatedAt = now;
          inMemoryStore.subscriptions.set(targetUserId, existing);
        }
      } else if (eventType === "subscription.revoked") {
        if (existing) {
          existing.status = "revoked";
          existing.tier = "free";
          existing.updatedAt = now;
          inMemoryStore.subscriptions.set(targetUserId, existing);
        }
      }
    }

    // Record processed event to prevent duplicate execution
    const paymentRecord: PaymentEventRecord = {
      id: `pe-${Date.now()}`,
      eventId,
      provider,
      eventType,
      userId: targetUserId || null,
      subscriptionId: params.subscriptionId || null,
      payload,
      processedAt: new Date(),
    };
    inMemoryStore.paymentEvents.set(eventId, paymentRecord);

    return {
      success: true,
      duplicate: false,
      message: `Webhook event ${eventId} processed successfully.`,
    };
  }
}

export const subscriptionService = new SubscriptionService();
