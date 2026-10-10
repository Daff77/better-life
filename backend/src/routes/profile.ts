import { Router, Request, Response } from "express";
import {
  UpdateProfileInputSchema,
  PersonalizationInputSchema,
} from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";
import { authMiddleware } from "../middleware/auth.js";

export const profileRouter = Router();

// Secure all profile operations with authentication
profileRouter.use(authMiddleware);

// 1. GET /api/profile/me (or GET /api/profile)
function getProfileHandler(req: Request, res: Response) {
  const userId = req.user!.userId;
  const user = inMemoryStore.users.get(userId);
  const profile = inMemoryStore.profiles.get(userId) || null;

  if (!user) {
    return res.status(404).json({
      error: "Not Found",
      message: "User profile could not be found.",
    });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    profile,
  });
}

profileRouter.get("/", getProfileHandler);
profileRouter.get("/me", getProfileHandler);

// 2. PUT /api/profile/personalization — Update target calories & preferences
profileRouter.put("/personalization", (req: Request, res: Response) => {
  const parseResult = PersonalizationInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const updatedProfile = {
    userId,
    ...parseResult.data,
    onboardingCompleted: true,
  };

  inMemoryStore.profiles.set(userId, updatedProfile);

  return res.json({
    message: "Personalization saved",
    profile: updatedProfile,
  });
});

// 3. PATCH /api/profile/me — Update basic account profile fields
profileRouter.patch("/me", (req: Request, res: Response) => {
  const parseResult = UpdateProfileInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const existing = inMemoryStore.users.get(userId);

  if (!existing) {
    return res.status(404).json({
      error: "Not Found",
      message: "User account could not be found.",
    });
  }

  const updated = { ...existing, ...parseResult.data };
  inMemoryStore.users.set(userId, updated);

  return res.json({
    message: "Profile updated",
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
    },
  });
});
