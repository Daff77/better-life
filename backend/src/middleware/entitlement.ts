import { Request, Response, NextFunction } from "express";
import { Entitlement, MembershipTier, SubscriptionStatus } from "../types/subscription.js";
import { subscriptionService } from "../services/subscriptionService.js";

export interface SubscriptionContext {
  tier: MembershipTier;
  status: SubscriptionStatus;
  isPremium: boolean;
  entitlements: readonly Entitlement[];
}

declare global {
  namespace Express {
    interface Request {
      subscriptionContext?: SubscriptionContext;
    }
  }
}

/**
 * Server-side entitlement check middleware.
 * Verifies that the authenticated user possesses the required entitlement
 * according to the backend source of truth.
 *
 * Rejects client-supplied flags, forged headers, and expired subscriptions.
 */
export function requireEntitlement(requiredEntitlement: Entitlement) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to access this feature.",
      });
    }

    // Retrieve verified subscription state from backend source of truth
    const { effectiveTier, effectiveStatus, isPremium, entitlements } =
      subscriptionService.getSubscriptionByUserId(req.user.userId);

    // Attach verified subscription context to the request
    req.subscriptionContext = {
      tier: effectiveTier,
      status: effectiveStatus,
      isPremium,
      entitlements,
    };

    // Check if the required entitlement is granted to the user
    if (!entitlements.includes(requiredEntitlement)) {
      return res.status(403).json({
        error: "Forbidden",
        code: "MEMBERSHIP_REQUIRED",
        requiredEntitlement,
        currentTier: effectiveTier,
        currentStatus: effectiveStatus,
        message: "This feature requires an active Premium membership.",
      });
    }

    next();
  };
}
