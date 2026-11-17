import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  subscriptionService,
  verifyStripeWebhookSignature,
} from "../services/subscriptionService.js";
import { SUBSCRIPTION_PLANS, PlanId } from "../types/subscription.js";
import {
  CheckoutInputSchema,
  VerifyTransactionInputSchema,
  CancelSubscriptionInputSchema,
  RestoreSubscriptionInputSchema,
  WebhookEventInputSchema,
} from "../schemas/validation.js";

export const subscriptionRouter = Router();

// 1. GET /api/subscription/plans — Public plan catalog & payment provider readiness
subscriptionRouter.get("/plans", (_req: Request, res: Response) => {
  return res.json({
    plans: Object.values(SUBSCRIPTION_PLANS),
    paymentReadiness: subscriptionService.getPaymentReadiness(),
  });
});

// 2. GET /api/subscription/status — Authenticated current status and verified entitlements
subscriptionRouter.get(
  "/status",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const statusResponse = await subscriptionService.getStatusResponse(userId);
    return res.json(statusResponse);
  })
);

// 3. POST /api/subscription/checkout — Initiate subscription upgrade
subscriptionRouter.post(
  "/checkout",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CheckoutInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const { planId, provider, successUrl, cancelUrl } = parseResult.data;

    try {
      const result = await subscriptionService.checkout(userId, planId, provider, {
        successUrl,
        cancelUrl,
      });
      return res.json({
        success: true,
        subscription: await subscriptionService.getStatusResponse(userId),
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        sandboxMode: result.sandboxMode ?? false,
        message: result.message,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "Checkout Failed",
        message: err.message || "Failed to process subscription checkout.",
      });
    }
  })
);

// 4. POST /api/subscription/verify — In-App Purchase / Checkout session verification
subscriptionRouter.post(
  "/verify",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = VerifyTransactionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const { provider, transactionId, receiptData, planId } = parseResult.data;

    try {
      const result = await subscriptionService.verifyTransaction(
        userId,
        provider,
        transactionId,
        planId,
        receiptData
      );

      return res.json({
        success: true,
        subscription: await subscriptionService.getStatusResponse(userId),
        message: result.message,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "Verification Failed",
        message: err.message || "Could not verify purchase transaction.",
      });
    }
  })
);

// 5. POST /api/subscription/cancel — Cancel auto-renew (entitled until period end)
subscriptionRouter.post(
  "/cancel",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = CancelSubscriptionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const { reason } = parseResult.data;

    try {
      const result = await subscriptionService.cancelSubscription(userId, reason);
      return res.json({
        success: true,
        subscription: await subscriptionService.getStatusResponse(userId),
        message: result.message,
      });
    } catch (err: any) {
      return res.status(400).json({
        error: "Cancellation Failed",
        message: err.message || "Unable to cancel subscription.",
      });
    }
  })
);

// 6. POST /api/subscription/restore — Restore previous purchases
subscriptionRouter.post(
  "/restore",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = RestoreSubscriptionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const { provider } = parseResult.data;

    const result = await subscriptionService.restoreSubscription(userId, provider);
    return res.json(result);
  })
);

// 7. POST /api/subscription/webhook — Cryptographically verified & idempotent webhook handler
subscriptionRouter.post(
  "/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return res
        .status(503)
        .json({ error: "Verified provider webhook integration is not configured." });
    }

    const signature = req.header("stripe-signature");
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});

    if (!verifyStripeWebhookSignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing webhook cryptographic signature.",
      });
    }

    // Support both standard Stripe event envelope and normalized internal schema
    const rawEvent = req.body ?? {};
    if (rawEvent.id && rawEvent.type && rawEvent.data?.object) {
      const obj = rawEvent.data.object;
      let mappedType:
        | "subscription.created"
        | "subscription.renewed"
        | "subscription.canceled"
        | "subscription.payment_failed"
        | "subscription.revoked"
        | null = null;

      if (
        rawEvent.type === "checkout.session.completed" ||
        rawEvent.type === "customer.subscription.created"
      ) {
        mappedType = "subscription.created";
      } else if (rawEvent.type === "invoice.paid") {
        mappedType = "subscription.renewed";
      } else if (rawEvent.type === "customer.subscription.deleted") {
        mappedType = "subscription.revoked";
      } else if (rawEvent.type === "invoice.payment_failed") {
        mappedType = "subscription.payment_failed";
      }

      if (!mappedType) {
        return res.json({ received: true, ignored: true });
      }

      const result = await subscriptionService.processVerifiedWebhookEvent({
        eventId: String(rawEvent.id),
        eventType: mappedType,
        provider: "stripe",
        userId: obj.client_reference_id || obj.metadata?.userId,
        subscriptionId: obj.subscription || obj.id,
        planId: (obj.metadata?.planId as PlanId | undefined) || "monthly",
        currentPeriodEnd: obj.current_period_end
          ? new Date(Number(obj.current_period_end) * 1000).toISOString()
          : undefined,
        payload: obj,
      });

      return res.json(result);
    }

    const parseResult = WebhookEventInputSchema.safeParse(rawEvent);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const result = await subscriptionService.processVerifiedWebhookEvent(parseResult.data);
    return res.json(result);
  })
);
