import { Router, Request, Response } from "express";
import { UpdateProfileInputSchema, PersonalizationInputSchema } from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";

export const profileRouter = Router();

profileRouter.get("/me", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "user-1";
  const user = inMemoryStore.users.get(userId) || Array.from(inMemoryStore.users.values())[0];
  const profile = inMemoryStore.profiles.get(userId) || Array.from(inMemoryStore.profiles.values())[0];

  return res.json({
    user,
    profile,
  });
});

profileRouter.put("/personalization", (req: Request, res: Response) => {
  const parseResult = PersonalizationInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const userId = (req.query.userId as string) || "user-1";
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

profileRouter.patch("/me", (req: Request, res: Response) => {
  const parseResult = UpdateProfileInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const userId = (req.query.userId as string) || "user-1";
  const existing = inMemoryStore.users.get(userId);
  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  const updated = { ...existing, ...parseResult.data };
  inMemoryStore.users.set(userId, updated);

  return res.json({
    message: "Profile updated",
    user: updated,
  });
});
