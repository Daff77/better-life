import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { inMemoryStore } from "../services/store.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireEntitlement } from "../middleware/entitlement.js";
import { Entitlement } from "../types/subscription.js";
import { subscriptionService } from "../services/subscriptionService.js";
import { env } from "../config/env.js";

export const recipesRouter = Router();

// Helper to optionally resolve user from Bearer token without rejecting request
function resolveOptionalUser(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// 1. GET /api/recipes/premium-collections — Exclusive chef-curated collections (Premium only)
recipesRouter.get(
  "/premium-collections",
  authMiddleware,
  requireEntitlement(Entitlement.PREMIUM_RECIPES),
  (_req: Request, res: Response) => {
    const allRecipes = Array.from(inMemoryStore.recipes.values());
    const premiumOnly = allRecipes.filter((r) => r.isPremium === true);

    return res.json({
      collection: "Chef's Artisanal & Macro-Dense Kitchen",
      count: premiumOnly.length,
      recipes: premiumOnly.map((r) => ({ ...r, isLocked: false })),
    });
  }
);

// 2. GET /api/recipes — List all recipes with premium lock indicators
recipesRouter.get("/", (req: Request, res: Response) => {
  const userId = resolveOptionalUser(req);
  const isPremiumUser = userId
    ? subscriptionService.isUserEntitled(userId, Entitlement.PREMIUM_RECIPES)
    : false;

  const allRecipes = Array.from(inMemoryStore.recipes.values()).map((recipe) => {
    if (recipe.isPremium && !isPremiumUser) {
      // Provide preview for free users
      return {
        ...recipe,
        isLocked: true,
        instructions: [{ step: 1, text: "Unlock full chef recipe & timer with Premium membership." }],
      };
    }
    return {
      ...recipe,
      isLocked: false,
    };
  });

  return res.json(allRecipes);
});

// 3. GET /api/recipes/:id — Single recipe detail with entitlement check
recipesRouter.get("/:id", (req: Request, res: Response) => {
  const recipe = inMemoryStore.recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  if (recipe.isPremium) {
    const userId = resolveOptionalUser(req);
    const isPremiumUser = userId
      ? subscriptionService.isUserEntitled(userId, Entitlement.PREMIUM_RECIPES)
      : false;

    if (!isPremiumUser) {
      return res.status(200).json({
        ...recipe,
        isLocked: true,
        instructions: [
          {
            step: 1,
            text: "Unlock full step-by-step instructions, precision timers, and culinary notes with Premium membership.",
          },
        ],
        unlockPrompt: {
          code: "MEMBERSHIP_REQUIRED",
          message: "This exclusive chef-crafted recipe is reserved for Premium members.",
        },
      });
    }
  }

  return res.json({
    ...recipe,
    isLocked: false,
  });
});
