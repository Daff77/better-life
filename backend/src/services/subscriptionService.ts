import crypto from "node:crypto";
import { subscriptionRepository } from "../repositories/index.js";
import {
  MembershipTier,
  SubscriptionStatus,
  BillingProvider,
  PlanId,
  Entitlement,
  TIER_ENTITLEMENTS,
  SUBSCRIPTION_PLANS,
  SubscriptionRecord,
  SubscriptionStatusResponse,
} from "../types/subscription.js";

export interface PaymentReadinessReport {
  configuredProviders: BillingProvider[];
  stripeConfigured: boolean;
  sandboxEnabled: boolean;
  canCheckout: boolean;
  missingRequirements: string[];
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader || !webhookSecret) return false;
  const parts = signatureHeader.split(",").map((p) => p.trim());
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

  if (!timestampPart || v1Parts.length === 0) return false;
  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedHex = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  return v1Parts.some((candidateHex) => {
    if (candidateHex.length !== expectedHex.length) return false;
    try {
      const candidateBuf = Buffer.from(candidateHex, "hex");
      return (
        candidateBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(candidateBuf, expectedBuf)
      );
    } catch {
      return false;
    }
  });
}

export class SubscriptionService {
  public getPaymentReadiness(): PaymentReadinessReport {
    const isProd = process.env.NODE_ENV === "production";
    const sandboxEnabled = !isProd && process.env.ENABLE_PAYMENT_SANDBOX === "true";

    const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    const hasStripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
    const hasStripePrices = Boolean(
      process.env.STRIPE_PRICE_MONTHLY?.trim() && process.env.STRIPE_PRICE_ANNUAL?.trim()
    );
    const stripeConfigured = hasStripeSecret && hasStripeWebhook && hasStripePrices;

    const configuredProviders: BillingProvider[] = [];
    if (stripeConfigured) configuredProviders.push("stripe");
    if (sandboxEnabled) configuredProviders.push("mock_sandbox");

    const missingRequirements: string[] = [];
    if (!stripeConfigured) {
      if (!hasStripeSecret) missingRequirements.push("STRIPE_SECRET_KEY");
      if (!hasStripeWebhook) missingRequirements.push("STRIPE_WEBHOOK_SECRET");
      if (!hasStripePrices) {
        missingRequirements.push("STRIPE_PRICE_MONTHLY & STRIPE_PRICE_ANNUAL");
      }
    }

    return {
      configuredProviders,
      stripeConfigured,
      sandboxEnabled,
      canCheckout: configuredProviders.length > 0,
      missingRequirements,
    };
  }

  public async getSubscriptionByUserId(userId: string): Promise<{
    subscription: SubscriptionRecord;
    effectiveTier: MembershipTier;
    effectiveStatus: SubscriptionStatus;
    isPremium: boolean;
    entitlements: readonly Entitlement[];
  }> {
    let sub = await subscriptionRepository.findByUserId(userId);

    if (!sub) {
      const now = new Date();
      sub = await subscriptionRepository.upsert({
        id: `sub-${userId}`,
        userId,
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
    }

    const now = new Date();
    let effectiveStatus = sub.status;
    let effectiveTier: MembershipTier = "free";

    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now.getTime()) {
      if (sub.status === "premium_active" || sub.status === "canceled") {
        effectiveStatus = "expired";
        sub = await subscriptionRepository.upsert({
          ...sub,
          status: "expired",
          tier: "free",
          updatedAt: now,
        });
      }
    }

    if (effectiveStatus === "premium_active") {
      effectiveTier = "premium";
    } else if (
      effectiveStatus === "canceled" &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd.getTime() > now.getTime()
    ) {
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

  public async isUserEntitled(userId: string, entitlement: Entitlement): Promise<boolean> {
    const { entitlements } = await this.getSubscriptionByUserId(userId);
    return entitlements.includes(entitlement);
  }

  public async getStatusResponse(
    userId: string
  ): Promise<SubscriptionStatusResponse & { paymentReadiness: PaymentReadinessReport }> {
    const { subscription, effectiveTier, effectiveStatus, isPremium, entitlements } =
      await this.getSubscriptionByUserId(userId);

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
      paymentReadiness: this.getPaymentReadiness(),
    };
  }

  public async checkout(
    userId: string,
    planId: PlanId,
    provider: BillingProvider = "stripe",
    urls?: { successUrl?: string; cancelUrl?: string }
  ): Promise<{
    subscription: SubscriptionRecord;
    effectiveStatus: SubscriptionStatus;
    isPremium: boolean;
    checkoutUrl?: string;
    sessionId?: string;
    sandboxMode?: boolean;
    message: string;
  }> {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error(`Invalid plan identifier: ${planId}`);
    }

    const readiness = this.getPaymentReadiness();

    // Real Stripe Checkout Session creation (never activates Premium before payment verification!)
    if (provider === "stripe") {
      if (!readiness.stripeConfigured) {
        throw new Error(
          "Payment provider verification is not configured. Checkout is unavailable."
        );
      }

      const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
      const priceId =
        planId === "monthly"
          ? process.env.STRIPE_PRICE_MONTHLY!.trim()
          : planId === "annual"
          ? process.env.STRIPE_PRICE_ANNUAL!.trim()
          : process.env.STRIPE_PRICE_LIFETIME?.trim();

      if (!priceId) {
        throw new Error(`Stripe price ID for plan '${planId}' is not configured.`);
      }

      const mode = plan.interval === "lifetime" ? "payment" : "subscription";
      const form = new URLSearchParams();
      form.set("mode", mode);
      form.set("client_reference_id", userId);
      form.set("line_items[0][price]", priceId);
      form.set("line_items[0][quantity]", "1");
      form.set("metadata[userId]", userId);
      form.set("metadata[planId]", planId);
      form.set(
        "success_url",
        urls?.successUrl || "http://localhost:8081/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}"
      );
      form.set("cancel_url", urls?.cancelUrl || "http://localhost:8081/upgrade?checkout=cancelled");

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      if (!stripeRes.ok) {
        const errBody: any = await stripeRes.json().catch(() => ({}));
        throw new Error(
          errBody?.error?.message || "Failed to initialize Stripe Checkout session."
        );
      }

      const sessionData: any = await stripeRes.json();
      const current = await this.getSubscriptionByUserId(userId);
      const pendingSub = await subscriptionRepository.upsert({
        ...current.subscription,
        status: current.isPremium ? current.subscription.status : "pending_verification",
        planId: current.isPremium ? current.subscription.planId : planId,
        billingProvider: "stripe",
        metadata: {
          ...current.subscription.metadata,
          pendingCheckoutSessionId: sessionData.id,
          pendingPlanId: planId,
        },
        updatedAt: new Date(),
      });

      return {
        subscription: pendingSub,
        effectiveStatus: current.isPremium ? current.effectiveStatus : "pending_verification",
        isPremium: current.isPremium,
        checkoutUrl: sessionData.url,
        sessionId: sessionData.id,
        sandboxMode: false,
        message: "Checkout session created. Complete payment to activate Premium.",
      };
    }

    // Explicit non-production sandbox (only when ENABLE_PAYMENT_SANDBOX=true)
    if (provider === "mock_sandbox" && readiness.sandboxEnabled) {
      const now = new Date();
      let periodEnd: Date | null = null;
      if (plan.interval === "month") {
        periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (plan.interval === "year") {
        periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      }

      const updatedSub = await subscriptionRepository.upsert({
        id: `sub-${userId}`,
        userId,
        tier: "premium",
        status: "premium_active",
        planId,
        billingProvider: "mock_sandbox",
        externalSubscriptionId: `sandbox-${Date.now()}`,
        externalCustomerId: `sandbox-cust-${userId}`,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: { planName: plan.name, priceAmount: plan.priceAmount, sandbox: true },
        createdAt: now,
        updatedAt: now,
      });

      const eventId = `evt_sandbox_checkout_${Date.now()}_${userId}`;
      await subscriptionRepository.recordPaymentEventIdempotent({
        id: `pe-${Date.now()}`,
        eventId,
        provider: "mock_sandbox",
        eventType: "subscription.created",
        userId,
        subscriptionId: updatedSub.id,
        payload: { planId, priceAmount: plan.priceAmount, sandbox: true },
        processedAt: now,
      });

      return {
        subscription: updatedSub,
        effectiveStatus: "premium_active",
        isPremium: true,
        sandboxMode: true,
        message: `[Sandbox] Activated ${plan.name} for development testing.`,
      };
    }

    throw new Error(
      "Payment provider verification is not configured. Checkout is unavailable."
    );
  }

  public async verifyTransaction(
    userId: string,
    provider: BillingProvider,
    transactionId: string,
    planId: PlanId = "monthly",
    _receiptData?: string
  ): Promise<{
    success: boolean;
    subscription: SubscriptionRecord;
    effectiveStatus: SubscriptionStatus;
    message: string;
  }> {
    const readiness = this.getPaymentReadiness();

    if (provider === "stripe" && readiness.stripeConfigured) {
      const existingEvent = await subscriptionRepository.findPaymentEvent(transactionId);
      if (existingEvent) {
        const current = await this.getSubscriptionByUserId(userId);
        return {
          success: true,
          subscription: current.subscription,
          effectiveStatus: current.effectiveStatus,
          message: "Transaction already processed and validated.",
        };
      }

      const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(transactionId)}`,
        {
          headers: { Authorization: `Bearer ${secretKey}` },
        }
      );

      if (!stripeRes.ok) {
        throw new Error("Could not verify Stripe Checkout session.");
      }

      const sessionData: any = await stripeRes.json();
      if (sessionData.client_reference_id !== userId && sessionData.metadata?.userId !== userId) {
        throw new Error("Checkout session does not belong to the authenticated user.");
      }
      if (sessionData.payment_status !== "paid") {
        throw new Error("Payment has not been completed yet.");
      }

      const resolvedPlanId: PlanId =
        (sessionData.metadata?.planId as PlanId) || planId || "monthly";
      const plan = SUBSCRIPTION_PLANS[resolvedPlanId] || SUBSCRIPTION_PLANS.monthly;
      const now = new Date();
      const periodEnd =
        plan.interval === "month"
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          : plan.interval === "year"
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
          : null;

      const updatedSub = await subscriptionRepository.upsert({
        id: `sub-${userId}`,
        userId,
        tier: "premium",
        status: "premium_active",
        planId: resolvedPlanId,
        billingProvider: "stripe",
        externalSubscriptionId: String(sessionData.subscription || sessionData.id),
        externalCustomerId: sessionData.customer ? String(sessionData.customer) : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: { checkoutSessionId: sessionData.id },
        createdAt: now,
        updatedAt: now,
      });

      await subscriptionRepository.recordPaymentEventIdempotent({
        id: `pe-${Date.now()}`,
        eventId: transactionId,
        provider: "stripe",
        eventType: "subscription.created",
        userId,
        subscriptionId: updatedSub.id,
        payload: { sessionId: sessionData.id, planId: resolvedPlanId },
        processedAt: now,
      });

      return {
        success: true,
        subscription: updatedSub,
        effectiveStatus: "premium_active",
        message: "Stripe payment verified. Premium membership active.",
      };
    }

    if (provider === "mock_sandbox" && readiness.sandboxEnabled) {
      const existingEvent = await subscriptionRepository.findPaymentEvent(transactionId);
      if (existingEvent) {
        const current = await this.getSubscriptionByUserId(userId);
        return {
          success: true,
          subscription: current.subscription,
          effectiveStatus: current.effectiveStatus,
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

      const updatedSub = await subscriptionRepository.upsert({
        id: `sub-${userId}`,
        userId,
        tier: "premium",
        status: "premium_active",
        planId,
        billingProvider: "mock_sandbox",
        externalSubscriptionId: transactionId,
        externalCustomerId: `cust-${userId}`,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: { transactionId, sandbox: true },
        createdAt: now,
        updatedAt: now,
      });

      await subscriptionRepository.recordPaymentEventIdempotent({
        id: `pe-${Date.now()}`,
        eventId: transactionId,
        provider: "mock_sandbox",
        eventType: "subscription.created",
        userId,
        subscriptionId: updatedSub.id,
        payload: { transactionId, planId, sandbox: true },
        processedAt: now,
      });

      return {
        success: true,
        subscription: updatedSub,
        effectiveStatus: "premium_active",
        message: "[Sandbox] Transaction verified. Premium membership active.",
      };
    }

    throw new Error("Receipt verification is not configured.");
  }

  public async cancelSubscription(
    userId: string,
    reason?: string
  ): Promise<{
    subscription: SubscriptionRecord;
    message: string;
  }> {
    const { subscription, isPremium } = await this.getSubscriptionByUserId(userId);

    if (!isPremium || subscription.status !== "premium_active") {
      throw new Error("You do not have an active paid subscription to cancel.");
    }

    const now = new Date();
    const updatedSub = await subscriptionRepository.upsert({
      ...subscription,
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: now,
      metadata: {
        ...subscription.metadata,
        cancellationReason: reason || "User requested cancellation",
      },
      updatedAt: now,
    });

    return {
      subscription: updatedSub,
      message:
        "Your subscription has been canceled. You retain full access until your current period ends.",
    };
  }

  public async restoreSubscription(
    userId: string,
    _provider: BillingProvider = "stripe"
  ): Promise<{
    restored: boolean;
    statusResponse: SubscriptionStatusResponse;
    message: string;
  }> {
    const { isPremium } = await this.getSubscriptionByUserId(userId);
    const statusResponse = await this.getStatusResponse(userId);

    if (isPremium) {
      return {
        restored: true,
        statusResponse,
        message: "Your existing active Premium membership was verified and restored.",
      };
    }

    return {
      restored: false,
      statusResponse,
      message: "No active subscriptions found for this account to restore.",
    };
  }

  public async processVerifiedWebhookEvent(params: {
    eventId: string;
    eventType: string;
    provider: BillingProvider;
    userId?: string;
    subscriptionId?: string;
    planId?: PlanId;
    currentPeriodEnd?: string;
    payload: Record<string, any>;
  }): Promise<{
    success: boolean;
    duplicate: boolean;
    message: string;
  }> {
    const { eventId, eventType, provider, userId, planId, currentPeriodEnd, payload } = params;

    const targetUserId =
      userId ||
      payload.userId ||
      payload.client_reference_id ||
      payload.metadata?.userId;

    const { inserted } = await subscriptionRepository.recordPaymentEventIdempotent({
      id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      provider,
      eventType,
      userId: targetUserId || null,
      subscriptionId: params.subscriptionId || null,
      payload,
      processedAt: new Date(),
    });

    if (!inserted) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} has already been processed.`,
      };
    }

    if (targetUserId) {
      const now = new Date();
      const existing = await subscriptionRepository.findByUserId(targetUserId);

      if (eventType === "subscription.created" || eventType === "subscription.renewed") {
        const resolvedPlanId: PlanId =
          planId || (payload.metadata?.planId as PlanId) || existing?.planId || "monthly";
        const plan = SUBSCRIPTION_PLANS[resolvedPlanId] || SUBSCRIPTION_PLANS.monthly;
        const periodEndDate = currentPeriodEnd
          ? new Date(currentPeriodEnd)
          : plan.interval === "lifetime"
          ? null
          : plan.interval === "year"
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await subscriptionRepository.upsert({
          id: existing?.id || `sub-${targetUserId}`,
          userId: targetUserId,
          tier: "premium",
          status: "premium_active",
          planId: resolvedPlanId,
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
        });
      } else if (eventType === "subscription.canceled" && existing) {
        await subscriptionRepository.upsert({
          ...existing,
          status: "canceled",
          cancelAtPeriodEnd: true,
          canceledAt: now,
          updatedAt: now,
        });
      } else if (eventType === "subscription.payment_failed" && existing) {
        await subscriptionRepository.upsert({
          ...existing,
          status: "payment_failed",
          tier: "free",
          updatedAt: now,
        });
      } else if (eventType === "subscription.revoked" && existing) {
        await subscriptionRepository.upsert({
          ...existing,
          status: "revoked",
          tier: "free",
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      duplicate: false,
      message: `Webhook event ${eventId} processed successfully.`,
    };
  }
}

export const subscriptionService = new SubscriptionService();
