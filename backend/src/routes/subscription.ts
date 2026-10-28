import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { subscriptionService } from "../services/subscriptionService.js";
import { SUBSCRIPTION_PLANS } from "../types/subscription.js";
import {
  CheckoutInputSchema,
  VerifyTransactionInputSchema,
  CancelSubscriptionInputSchema,
  RestoreSubscriptionInputSchema,
  WebhookEventInputSchema,
} from "../schemas/validation.js";

export const subscriptionRouter = Router();

// 1. GET /api/subscription/plans — Public plan catalog
subscriptionRouter.get("/plans", (_req: Request, res: Response) => {
  return res.json({
    plans: Object.values(SUBSCRIPTION_PLANS),
  });
});

// 2. GET /api/subscription/status — Authenticated current status and verified entitlements
subscriptionRouter.get("/status", authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const statusResponse = subscriptionService.getStatusResponse(userId);
  return res.json(statusResponse);
});

// 3. POST /api/subscription/checkout — Initiate subscription upgrade
subscriptionRouter.post("/checkout", authMiddleware, (req: Request, res: Response) => {
  const parseResult = CheckoutInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const { planId, provider } = parseResult.data;

  try {
    const result = subscriptionService.checkout(userId, planId, provider);
    return res.json({
      success: true,
      subscription: subscriptionService.getStatusResponse(userId),
      message: result.message,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "Checkout Failed",
      message: err.message || "Failed to process subscription checkout.",
    });
  }
});

// 4. POST /api/subscription/verify — In-App Purchase / Receipt verification
subscriptionRouter.post("/verify", authMiddleware, (req: Request, res: Response) => {
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
    const result = subscriptionService.verifyTransaction(
      userId,
      provider,
      transactionId,
      planId,
      receiptData
    );

    return res.json({
      success: true,
      subscription: subscriptionService.getStatusResponse(userId),
      message: result.message,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "Verification Failed",
      message: err.message || "Could not verify purchase transaction.",
    });
  }
});

// 5. POST /api/subscription/cancel — Cancel auto-renew (entitled until period end)
subscriptionRouter.post("/cancel", authMiddleware, (req: Request, res: Response) => {
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
    const result = subscriptionService.cancelSubscription(userId, reason);
    return res.json({
      success: true,
      subscription: subscriptionService.getStatusResponse(userId),
      message: result.message,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "Cancellation Failed",
      message: err.message || "Unable to cancel subscription.",
    });
  }
});

// 6. POST /api/subscription/restore — Restore previous purchases
subscriptionRouter.post("/restore", authMiddleware, (req: Request, res: Response) => {
  const parseResult = RestoreSubscriptionInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const { provider } = parseResult.data;

  const result = subscriptionService.restoreSubscription(userId, provider);
  return res.json(result);
});

// 7. POST /api/subscription/webhook — Idempotent provider webhook handler
subscriptionRouter.post("/webhook", (req: Request, res: Response) => {
  const parseResult = WebhookEventInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid Webhook Payload",
      details: parseResult.error.flatten(),
    });
  }

  const { eventId, eventType, provider, userId, subscriptionId, planId, currentPeriodEnd, payload } =
    parseResult.data;

  const result = subscriptionService.processWebhookEvent({
    eventId,
    eventType,
    provider,
    userId,
    subscriptionId,
    planId,
    currentPeriodEnd,
    payload,
  });

  return res.status(result.duplicate ? 200 : 201).json(result);
});
