import { Router, Request, Response } from "express";
import { AddStepsInputSchema } from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";
import { authMiddleware } from "../middleware/auth.js";

export const activityRouter = Router();

// Require authentication for activity tracking
activityRouter.use(authMiddleware);

// 1. GET /api/activity/stats (or GET /api/activity)
function getActivityHandler(req: Request, res: Response) {
  const userId = req.user!.userId;
  const stats = inMemoryStore.activity.get(userId) || {
    steps: 3420,
    stepGoal: 6000,
    exerciseCalories: 240,
    exerciseDurationMinutes: 35,
  };
  return res.json(stats);
}

activityRouter.get("/", getActivityHandler);
activityRouter.get("/stats", getActivityHandler);

// 2. POST /api/activity/steps — Increment steps for authenticated user
activityRouter.post("/steps", (req: Request, res: Response) => {
  const parseResult = AddStepsInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const current = inMemoryStore.activity.get(userId) || {
    steps: 0,
    stepGoal: 6000,
    exerciseCalories: 0,
    exerciseDurationMinutes: 0,
  };

  current.steps = Math.min(50000, current.steps + parseResult.data.steps);
  // Estimate ~0.04 kcal per step and 1 min per 100 steps
  current.exerciseCalories = Math.round(current.steps * 0.04);
  current.exerciseDurationMinutes = Math.round(current.steps / 100);

  inMemoryStore.activity.set(userId, current);

  return res.json(current);
});
