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
      rawBody?: string;
    }
  }
}

export function requireEntitlement(requiredEntitlement: Entitlement) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "You must be logged in to access this feature.",
        });
      }

      const { effectiveTier, effectiveStatus, isPremium, entitlements } =
        await subscriptionService.getSubscriptionByUserId(req.user.userId);

      req.subscriptionContext = {
        tier: effectiveTier,
        status: effectiveStatus,
        isPremium,
        entitlements,
      };

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
    } catch (err) {
      next(err);
    }
  };
}
